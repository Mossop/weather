from django.shortcuts import render, redirect
from django.db.models import Min, Max

from website.models import *

def index(request):
    range = Measurement.objects.all().aggregate(Min("time"), Max("time"))
    context = {
        "types": Type.objects.all(),
        "mindate": range['time__min'],
        "maxdate": range['time__max']
    }

    return render(request, "index.html", context)
