from django.urls import path
from .views import GenerateFeedView, ContinueFeedView, FlashcardView

urlpatterns = [
    path('generate_feed/', GenerateFeedView.as_view(), name='generate_feed'),
    path('continue_feed/', ContinueFeedView.as_view(), name='continue_feed'),
    path('flashcard/', FlashcardView.as_view(), name='flashcard'),
]
