# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from django.db import transaction
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.utils.timezone import utc
from django.shortcuts import get_object_or_404

from datetime import datetime
import json

from website.models import *

def to_epoch(time):
    epoch = datetime.fromtimestamp(0, utc)
    delta = time - epoch
    return delta.seconds + delta.days * 24 * 3600

def jsonify(data):
    return HttpResponse(json.dumps(data), content_type='application/json')

@transaction.atomic
@require_POST
@csrf_exempt
def submit(request):
    readings = request.body.strip().split("\n")
    for reading in readings:
        data = json.loads(reading)
        device, created = Device.objects.get_or_create(id = data["device"])
        type, created = Type.objects.get_or_create(id = data["type"])
        sensor, created = Sensor.objects.get_or_create(device = device, sid = data["sensor"],
                                                       defaults = { "type": type })
        if created and (sensor.type != type):
            raise HttpResponseServerError("Incorrect type for sensor %s on device %s" % (data["sensor"], data["device"]))

        time = datetime.fromtimestamp(int(data["time"]), utc)
        measurement, created = Measurement.objects.get_or_create(sensor = sensor, time = time, defaults = { "value": float(data["value"]) })

        if not created:
            measurement.value = float(data["value"])
            measurement.save()

    return HttpResponse("%s\n" % len(readings), content_type="text/plain")

def measurements(request):
    mindate = datetime.fromtimestamp(int(request.GET["mindate"]), utc)
    maxdate = datetime.fromtimestamp(int(request.GET["maxdate"]), utc)
    type = get_object_or_404(Type, id = request.GET["type"])

    results = list()

    sensors = Sensor.objects.filter(type = type)
    for sensor in sensors:
        measurements = Measurement.objects.filter(sensor = sensor, time__gte = mindate, time__lte = maxdate).order_by("time")

        results.append({
          "id": sensor.sid,
          "name": sensor.name,
          "device": {
            "id": sensor.device.id,
            "name": sensor.device.__unicode__(),
            "longitude": sensor.device.location.longitude,
            "latitude": sensor.device.location.latitude
          },
          "measurements": [{ "time": to_epoch(m.time), "value": m.value } for m in measurements]
        })

    return jsonify(results)
