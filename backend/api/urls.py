from django.urls import path
from . import views

urlpatterns = [
    path('generateFeed', views.generate_feed, name='generate_feed'),
    path('health', views.health_check, name='health_check'),
]
