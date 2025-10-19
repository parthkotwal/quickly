#!/usr/bin/env python3
"""
Debug script to test feed generation with audio
This will help identify where audio generation is failing
"""

import os
import sys
import django
import json

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quickly_backend.settings')
django.setup()

from api.polly_service import should_generate_audio
from api.views import bedrock_runtime
import boto3

def test_feed_generation():
    """Test the full feed generation flow"""
    print("=" * 80)
    print("DEBUGGING FEED GENERATION WITH AUDIO")
    print("=" * 80)

    topic = "neural networks"

    print(f"\n📝 Testing feed generation for topic: '{topic}'")
    print("-" * 80)

    # Step 1: Check which posts should get audio
    print("\n1. AUDIO GENERATION LOGIC:")
    print("   Posts that should get audio:")
    for i in range(5):
        has_audio = should_generate_audio(i, 5)
        status = "🎙️  YES" if has_audio else "   NO"
        print(f"      Post {i+1}/5: {status}")

    # Step 2: Simulate what happens during feed generation
    print("\n2. SIMULATING FEED GENERATION LOOP:")
    print("   (This is what happens in views.py)")
    print()

    for post_index in range(5):
        print(f"   --- Post {post_index + 1}/5 ---")

        # Check if this post should have audio
        has_audio = should_generate_audio(post_index, total_posts=5)
        print(f"   should_generate_audio({post_index}, 5) = {has_audio}")

        if has_audio:
            print(f"   ✓ This post SHOULD get audio")
            print(f"   → Code should call: generate_audio_explanation(topic, query, caption)")
        else:
            print(f"   ✗ This post will NOT get audio")
        print()

    # Step 3: Check the actual views.py code
    print("\n3. CHECKING IF VIEWS.PY HAS AUDIO INTEGRATION:")
    views_path = os.path.join(os.path.dirname(__file__), 'api', 'views.py')

    with open(views_path, 'r') as f:
        views_content = f.read()

    checks = {
        'Import statement': 'from .polly_service import',
        'should_generate_audio call': 'should_generate_audio(post_index',
        'generate_audio_explanation call': 'generate_audio_explanation(topic',
        'audioUrl in response': "'audioUrl': audio_url",
        'hasAudio in response': "'hasAudio': audio_url is not None"
    }

    for check_name, search_string in checks.items():
        if search_string in views_content:
            print(f"   ✓ {check_name}: FOUND")
        else:
            print(f"   ✗ {check_name}: MISSING")

    # Step 4: Check environment
    print("\n4. ENVIRONMENT CHECK:")
    print(f"   AWS_ACCESS_KEY_ID: {'✓ Set' if os.getenv('AWS_ACCESS_KEY_ID') else '✗ Not set'}")
    print(f"   AWS_SECRET_ACCESS_KEY: {'✓ Set' if os.getenv('AWS_SECRET_ACCESS_KEY') else '✗ Not set'}")
    print(f"   AWS_DEFAULT_REGION: {os.getenv('AWS_DEFAULT_REGION', 'NOT SET')}")
    print(f"   S3_BUCKET_NAME: {os.getenv('S3_BUCKET_NAME', 'NOT SET')}")

    # Step 5: Try a real Polly call
    print("\n5. TESTING REAL AWS POLLY CALL:")
    from api.polly_service import generate_audio_explanation

    test_audio_url = generate_audio_explanation(
        topic="test topic",
        image_context="test image context",
        caption="test caption"
    )

    if test_audio_url:
        print(f"   ✓ SUCCESS: {test_audio_url}")
    else:
        print(f"   ✗ FAILED: No audio URL returned")

    print("\n" + "=" * 80)
    print("DEBUGGING COMPLETE")
    print("=" * 80)

    # Summary
    print("\n📊 SUMMARY:")
    if test_audio_url:
        print("   ✓ AWS Polly is working")
        print("   ✓ Audio generation function works")
        print("\n   Next steps:")
        print("   1. Restart your Django server: python manage.py runserver")
        print("   2. Generate a new feed (5 posts)")
        print("   3. Posts #2 and #4 should have audio buttons")
        print("   4. Check Django server console for audio generation logs")
    else:
        print("   ✗ AWS Polly is NOT working")
        print("   → Check your AWS credentials and permissions")

if __name__ == '__main__':
    test_feed_generation()
