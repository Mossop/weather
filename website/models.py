# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from django.db import models
from timezone_field import TimeZoneField

class Location(models.Model):
    name = models.CharField(max_length = 50)
    longitude = models.FloatField()
    latitude = models.FloatField()
    timezone = TimeZoneField()

    def __unicode__(self):
        return self.name

class Device(models.Model):
    id = models.CharField(max_length = 50, primary_key = True)
    name = models.CharField(max_length = 50)
    location = models.ForeignKey(Location, null = True)

    def __unicode__(self):
        return self.name if self.name else self.id

class Type(models.Model):
    id = models.CharField(max_length = 50, primary_key = True)
    name = models.CharField(max_length = 50)
    units = models.CharField(max_length = 10)

    def __unicode__(self):
        return self.name if self.name else self.id

class Sensor(models.Model):
    device = models.ForeignKey(Device)
    sid = models.CharField(max_length = 50)
    name = models.CharField(max_length = 50)
    type = models.ForeignKey(Type)

    def __unicode__(self):
        return self.name if self.name else self.sid

    class Meta:
        unique_together = ("device", "sid")

class Measurement(models.Model):
    sensor = models.ForeignKey(Sensor)
    time = models.DateTimeField()
    value = models.FloatField()

    class Meta:
        unique_together = ("sensor", "time")
