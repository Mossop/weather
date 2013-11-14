# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from django.db import transaction
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.utils.timezone import utc

from datetime import datetime
import json

from website.models import *

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
