#!/usr/bin/env python3
"""
Test the actual API endpoint to see what it returns
This simulates what the frontend receives
"""

import requests
import json

def test_generate_feed_api():
    """Test the /generateFeed endpoint"""
    print("=" * 80)
    print("TESTING /generateFeed API ENDPOINT")
    print("=" * 80)

    # API endpoint (make sure your Django server is running!)
    url = "http://localhost:8000/api/generateFeed"

    # Test payload
    payload = {
        "topic": "machine learning basics"
    }

    print(f"\n📡 Sending POST request to: {url}")
    print(f"   Payload: {json.dumps(payload, indent=2)}")
    print("\n⏳ Generating feed (this may take 30-60 seconds)...")
    print("   (Watch for audio generation logs in the Django server console)")
    print()

    try:
        response = requests.post(url, json=payload, timeout=120)

        print(f"\n📊 Response Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            print(f"\n✓ SUCCESS! Received {len(data.get('posts', []))} posts")
            print("\n" + "-" * 80)
            print("POST DETAILS:")
            print("-" * 80)

            for i, post in enumerate(data.get('posts', [])):
                print(f"\n📄 Post {i+1}/5:")
                print(f"   Caption: {post.get('text', 'N/A')[:60]}...")
                print(f"   Image URL: {post.get('imageUrl', 'N/A')[:60]}...")

                # Check for audio
                has_audio = post.get('hasAudio', False)
                audio_url = post.get('audioUrl')

                if has_audio and audio_url:
                    print(f"   🎙️  HAS AUDIO: ✓")
                    print(f"   Audio URL: {audio_url}")
                else:
                    print(f"   🎙️  HAS AUDIO: ✗")
                    if 'audioUrl' in post:
                        print(f"      audioUrl field: {post.get('audioUrl')}")
                    if 'hasAudio' in post:
                        print(f"      hasAudio field: {post.get('hasAudio')}")

            # Summary
            posts_with_audio = sum(1 for p in data.get('posts', []) if p.get('hasAudio'))
            print("\n" + "=" * 80)
            print(f"📊 SUMMARY: {posts_with_audio}/5 posts have audio")

            if posts_with_audio == 2:
                print("   ✓ PERFECT! Expected 2 posts with audio (posts 2 and 4)")
            elif posts_with_audio == 0:
                print("   ✗ ERROR: No posts have audio!")
                print("\n   Possible reasons:")
                print("   1. Django server not restarted after code changes")
                print("   2. Audio generation is failing silently")
                print("   3. Check Django server console for errors")
            else:
                print(f"   ⚠️  UNEXPECTED: Got {posts_with_audio} posts with audio (expected 2)")

        else:
            print(f"\n✗ ERROR: Server returned status {response.status_code}")
            print(f"   Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Could not connect to Django server")
        print("   → Make sure Django server is running:")
        print("   → cd backend && source venv/bin/activate && python manage.py runserver")

    except requests.exceptions.Timeout:
        print("\n✗ ERROR: Request timed out")
        print("   → Feed generation is taking too long")

    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 80)

if __name__ == '__main__':
    print("\n⚠️  IMPORTANT: Make sure your Django server is running!")
    print("   Run this in another terminal: cd backend && python manage.py runserver")
    print()
    input("Press Enter when server is ready...")
    test_generate_feed_api()
