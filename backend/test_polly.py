#!/usr/bin/env python3
"""
Test script to verify AWS Polly integration
Run this to check if Polly credentials are set up correctly
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quickly_backend.settings')
django.setup()

from api.polly_service import generate_audio_explanation, should_generate_audio

def test_polly_basic():
    """Test basic Polly functionality"""
    print("=" * 60)
    print("Testing AWS Polly Integration")
    print("=" * 60)

    # Check environment variables
    print("\n1. Checking AWS credentials...")
    aws_key = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')
    aws_region = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
    s3_bucket = os.getenv('S3_BUCKET_NAME', 'quickly-images')

    print(f"   AWS_ACCESS_KEY_ID: {'✓ Set' if aws_key else '✗ Not set'}")
    print(f"   AWS_SECRET_ACCESS_KEY: {'✓ Set' if aws_secret else '✗ Not set'}")
    print(f"   AWS_DEFAULT_REGION: {aws_region}")
    print(f"   S3_BUCKET_NAME: {s3_bucket}")

    if not aws_key or not aws_secret:
        print("\n❌ ERROR: AWS credentials not set!")
        print("   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables")
        return False

    # Test audio generation logic
    print("\n2. Testing audio selection logic...")
    for i in range(5):
        should_gen = should_generate_audio(i, 5)
        print(f"   Post {i+1}/5: {'🎙️  Generate audio' if should_gen else '   No audio'}")

    # Test actual audio generation
    print("\n3. Testing AWS Polly audio generation...")
    print("   Generating test audio...")

    test_topic = "machine learning"
    test_context = "neural network diagram"
    test_caption = "This is a test caption"

    audio_url = generate_audio_explanation(test_topic, test_context, test_caption)

    if audio_url:
        print(f"\n✓ SUCCESS! Audio generated:")
        print(f"   URL: {audio_url}")
        return True
    else:
        print(f"\n❌ FAILED: Audio generation returned None")
        print("   Check the error messages above for details")
        return False

if __name__ == '__main__':
    try:
        success = test_polly_basic()
        if success:
            print("\n" + "=" * 60)
            print("✓ All tests passed! AWS Polly is working correctly.")
            print("=" * 60)
            sys.exit(0)
        else:
            print("\n" + "=" * 60)
            print("✗ Tests failed. Please fix the issues above.")
            print("=" * 60)
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
