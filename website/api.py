# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from django.db import transaction
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, HttpResponseServerError
from django.utils.timezone import utc
from django.shortcuts import get_object_or_404

from datetime import datetime
from calendar import monthrange
import json
import sys

from website.models import *

def jsonify(data):
    return HttpResponse(json.dumps(data), content_type='application/json')

@transaction.atomic
@require_POST
@csrf_exempt
def submit(request):
    readings = request.body.strip().split("\n")
    for reading in readings:
        try:
            data = json.loads(reading)
        except:
            trace = sys.exc_info()[2]
            raise Exception("Failed to decode JSON: %s" % reading), None, trace

        device, created = Device.objects.get_or_create(id = data["device"])
        type, created = Type.objects.get_or_create(id = data["type"])
        sensor, created = Sensor.objects.get_or_create(device = device, sid = data["sensor"],
                                                       defaults = { "type": type })
        if created and (sensor.type != type):
            raise Exception("Incorrect type for sensor %s on device %s" % (data["sensor"], data["device"]))

        time = datetime.fromtimestamp(int(data["time"]), utc)
        duration = int(data["duration"]) if "duration" in data else 0
        measurement, created = Measurement.objects.get_or_create(sensor = sensor, time = time, defaults = { "value": float(data["value"]), "duration": duration })

        if not created:
            measurement.value = float(data["value"])
            measurement.duration = duration
            measurement.save()

    return HttpResponse("%s\n" % len(readings), content_type="text/plain")

def coalesce_group(measurements, type):
    if type.type == "S":
        return reduce(lambda x, y: x + y.value, measurements, 0)
    else:
        return reduce(lambda x, y: x + y.value, measurements, 0) / len(measurements)

def group_measurements(measurements, type, grouping):
    groups = {}

    for measurement in measurements:
        groupstart = measurement.tztime()
        duration = 0
        if grouping == "hour":
            groupstart = groupstart.replace(minute = 0, second = 0, microsecond = 0)
            duration = 60 * 60
        elif grouping == "day":
            groupstart = groupstart.replace(hour = 0, minute = 0, second = 0, microsecond = 0)
            duration = 60 * 60 * 24
        elif grouping == "month":
            groupstart = groupstart.replace(day = 0, hour = 0, minute = 0, second = 0, microsecond = 0)
            duration = 60 * 60 * 24 * monthrange(groupstart.year, groupstart.month)[1]

        if groupstart in groups:
            groups[groupstart]["measurements"].append(measurement)
        else:
            groups[groupstart] = {
                "time": to_epoch(groupstart),
                "duration": 0 if type.type == "I" else duration,
                "measurements": [measurement]
            }

    return [{
        "time": g["time"],
        "duration": g["duration"],
        "value": coalesce_group(g["measurements"], type)
    } for g in groups.values()]

def measurements(request):
    def tsort(a, b):
        return cmp(a["time"], b["time"])

    mindate = datetime.fromtimestamp(int(request.GET["mindate"]), utc)
    maxdate = datetime.fromtimestamp(int(request.GET["maxdate"]), utc)
    type = get_object_or_404(Type, id = request.GET["type"])

    results = list()

    sensors = Sensor.objects.filter(type = type)
    for sensor in sensors:
        measurements = Measurement.objects.filter(sensor = sensor, time__gte = mindate, time__lte = maxdate).order_by("time")
        sdata = sensor.get_json(False, True)
        if "groupby" in request.GET:
            sdata["measurements"] = sorted(group_measurements(measurements, type, request.GET["groupby"]), tsort)
        else:
            sdata["measurements"] = sorted([m.get_json(True, False) for m in measurements], tsort)

        results.append(sdata)

    return jsonify(results)
