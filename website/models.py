# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from django.db import models
from django.utils.timezone import utc
from timezone_field import TimeZoneField
from datetime import datetime

SENSOR_TYPES = (
    ('I', 'Instantaneous'),
    ('A', 'Average'),
    ('S', 'Sum'),
)

def to_epoch(time):
    epoch = datetime.fromtimestamp(0, utc)
    delta = time - epoch
    return delta.seconds + delta.days * 24 * 3600

class Location(models.Model):
    name = models.CharField(max_length = 50)
    longitude = models.FloatField()
    latitude = models.FloatField()
    timezone = TimeZoneField()

    def __unicode__(self):
        return self.name

    def get_json(self, from_parent = False, from_child = False):
        obj = {
            "id": self.id,
            "name": self.name,
            "longitude": self.longitude,
            "latitude": self.latitude
        }

        if not from_child:
            obj["devices"] = [d.get_json(True, False) for d in self.devices]

        return obj

class Device(models.Model):
    id = models.CharField(max_length = 50, primary_key = True)
    name = models.CharField(max_length = 50, blank = True)
    location = models.ForeignKey(Location, null = True, related_name = "devices")

    def __unicode__(self):
        if self.name:
            return self.name
        if self.location:
            return self.location.name
        return self.id

    def get_json(self, from_parent = False, from_child = False):
        obj = {
            "id": self.id,
            "name": self.name,
        }

        if not from_parent:
            obj["location"] = self.location.get_json(False, True)
        if not from_child:
            obj["sensors"] = [s.get_json(True, False) for s in self.sensors]

        return obj

class Type(models.Model):
    id = models.CharField(max_length = 50, primary_key = True)
    name = models.CharField(max_length = 50)
    units = models.CharField(max_length = 10)
    type = models.CharField(max_length = 1, choices = SENSOR_TYPES, default = "I")

    def __unicode__(self):
        return self.name if self.name else self.id

    def get_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "units": self.units,
            "type": self.type
        }

class Sensor(models.Model):
    device = models.ForeignKey(Device, related_name = "sensors")
    sid = models.CharField(max_length = 50)
    name = models.CharField(max_length = 50)
    type = models.ForeignKey(Type)

    def __unicode__(self):
        return self.name if self.name else self.sid

    def get_json(self, from_parent = False, from_child = False):
        obj = {
            "id": self.sid,
            "name": self.name,
            "type": self.type.get_json()
        }

        if not from_parent:
            obj["device"] = self.device.get_json(False, True)
        if not from_child:
            obj["measurements"] = [m.get_json(True, False) for m in self.measurements]

        return obj

    class Meta:
        unique_together = ("device", "sid")

class Measurement(models.Model):
    sensor = models.ForeignKey(Sensor, related_name = "measurements")
    time = models.DateTimeField()
    value = models.FloatField()
    duration = models.IntegerField(default = 0)

    def get_json(self, from_parent = False, from_child = False):
        obj = {
            "time": to_epoch(self.time),
            "value": self.value,
            "duration": self.duration
        }

        if not from_parent:
            obj["sensor"] = self.sensor.get_json(False, True)

        return obj

    class Meta:
        unique_together = ("sensor", "time")
