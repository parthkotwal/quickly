#!/usr/bin/env python3
"""Test S3 upload functionality"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quickly_backend.settings')
django.setup()

from api.s3_service import upload_image_from_url

print("=" * 50)
print("Testing S3 Upload")
print("=" * 50)

# Test image URL
test_image_url = "https://via.placeholder.com/400x300.png?text=Test+Image"
test_query = "test image"

print(f"\n📥 Downloading from: {test_image_url}")
print(f"📝 Query: {test_query}")
print("\n" + "-" * 50)

# Try upload
s3_url = upload_image_from_url(test_image_url, test_query)

print("-" * 50)

if s3_url:
    print(f"\n✅ SUCCESS!")
    print(f"🔗 S3 URL: {s3_url}")
    print(f"\n✓ Image uploaded to S3 successfully")
else:
    print(f"\n❌ FAILED!")
    print(f"⚠️  S3 upload returned None")
    print(f"\nPossible issues:")
    print(f"  1. AWS credentials not set correctly")
    print(f"  2. S3 bucket permissions issue")
    print(f"  3. Network/download error")
    print(f"\nCheck the error messages above for details.")

print("\n" + "=" * 50)
