from django.urls import path
from .views import GenerateFeedView, FeedListView, FeedDetailView

urlpatterns = [
    path('generate_feed/', GenerateFeedView.as_view(), name='generate_feed'),
    path('feeds/', FeedListView.as_view(), name='feed_list'),
    path('feeds/<uuid:feed_id>/', FeedDetailView.as_view(), name='feed_detail'),
]
