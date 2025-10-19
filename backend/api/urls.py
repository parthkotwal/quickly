from django.urls import path
from . import views

urlpatterns = [
    path('generateFeed', views.generate_feed, name='generate_feed'),
    path('saveFeedPosts', views.save_feed_posts, name='save_feed_posts'),
    path('getFeed', views.get_feed, name='get_feed'),
    path('getPublicFeed', views.get_public_feed_view, name='get_public_feed'),
    path('getFeedByTopic', views.get_feed_by_topic, name='get_feed_by_topic'),
    path('deleteFeed', views.delete_feed_by_topic, name='delete_feed'),
    path('updateFeedPrivacy', views.update_feed_privacy_view, name='update_feed_privacy'),
    path('toggleLike', views.toggle_like, name='toggle_like'),
    path('getLikedPosts', views.get_liked_posts, name='get_liked_posts'),
    path('getTopics', views.get_topics, name='get_topics'),
    path('health', views.health_check, name='health_check'),
    path('uploadImage', views.upload_image, name='upload_image'),
    path('generateFlashcards', views.generate_flashcards, name='generate_flashcards'),
    path('generateQuiz', views.generate_quiz, name='generate_quiz'),
    path('getSavedFlashcards', views.get_saved_flashcards, name='get_saved_flashcards'),
    path('getFlashcard', views.get_flashcard_set, name='get_flashcard_set'),
    path('deleteFlashcard', views.delete_flashcard_set_view, name='delete_flashcard_set'),
    path('getSavedQuizzes', views.get_saved_quizzes, name='get_saved_quizzes'),
    path('getQuiz', views.get_quiz_set, name='get_quiz_set'),
    path('submitQuiz', views.submit_quiz_completion, name='submit_quiz_completion'),
    path('deleteQuiz', views.delete_quiz_set_view, name='delete_quiz_set'),
]
