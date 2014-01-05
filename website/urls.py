# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from django.conf.urls import patterns, url

import api
import views

urlpatterns = patterns('',
    url(r'^$', views.index),
    url(r'^table$', views.table),
    url('^api/v1/submit$', api.submit),
    url('^api/v1/measurements$', api.measurements, name = "measurements")
)
