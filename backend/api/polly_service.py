import boto3
import os
import json
import hashlib
from .s3_service import s3_client, BUCKET_NAME, S3_REGION

# Initialize Polly client
polly_client = boto3.client(
    'polly',
    region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)


def generate_audio_explanation(topic, image_context, caption):
    """
    Generate audio explanation using AWS Polly (10-15 seconds)

    Args:
        topic: The main topic being taught
        image_context: What the image shows
        caption: The caption text (we'll create different audio content)

    Returns:
        S3 URL of the audio file or None if failed
    """
    try:
        print(f"🎙️ Starting audio generation...")
        print(f"   Topic: {topic}")
        print(f"   Image context: {image_context}")

        # Generate educational explanation (not just reading caption)
        # Create a concise explanation that fits in 10-15 seconds
        # Average speaking rate is ~150 words per minute = ~25 words for 10 seconds
        explanation_text = create_explanation_text(topic, image_context, caption)
        print(f"   Explanation text: {explanation_text}")

        # Use AWS Polly to synthesize speech
        print(f"   Calling AWS Polly...")
        response = polly_client.synthesize_speech(
            Text=explanation_text,
            OutputFormat='mp3',
            VoiceId='Matthew',  # US English male voice
            Engine='neural',  # Use neural engine for better quality
            TextType='text'
        )

        # Read audio stream
        audio_stream = response['AudioStream'].read()
        print(f"   Received audio stream ({len(audio_stream)} bytes)")

        # Generate unique filename
        hash_input = f"{topic}{image_context}".encode('utf-8')
        audio_hash = hashlib.md5(hash_input).hexdigest()[:12]
        audio_filename = f"audio/{audio_hash}.mp3"
        print(f"   Uploading to S3: {audio_filename}")

        # Upload to S3
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=audio_filename,
            Body=audio_stream,
            ContentType='audio/mpeg',
            CacheControl='max-age=31536000'
        )

        # Return S3 URL (same format as images)
        audio_url = f"https://{BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com/{audio_filename}"
        print(f"✓ Generated audio: {audio_filename}")
        print(f"✓ Audio URL: {audio_url}")

        return audio_url

    except Exception as e:
        print(f"❌ Error generating audio: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return None


def create_explanation_text(topic, image_context, caption):
    """
    Create a concise educational explanation (25-35 words for 10-15 seconds)

    This should explain the concept, not just read the caption.
    """
    # Simple template for creating educational explanations
    # This creates variety while keeping it educational

    templates = [
        f"Here's a key concept about {topic}. {image_context} demonstrates how this works in practice. Understanding this helps you grasp the fundamentals.",

        f"Let me explain {topic}. What you're seeing here with {image_context} is a great example of this principle in action.",

        f"This is an important aspect of {topic}. The {image_context} shown here illustrates the core concept perfectly.",

        f"Understanding {topic} becomes clearer when you see {image_context}. This visual representation helps connect theory to reality.",
    ]

    # Use hash to deterministically pick a template
    template_index = hash(image_context) % len(templates)
    explanation = templates[template_index]

    # Ensure it's not too long (limit to ~35 words)
    words = explanation.split()
    if len(words) > 35:
        explanation = ' '.join(words[:35]) + '.'

    return explanation


def should_generate_audio(post_index, total_posts=5):
    """
    Determine if this post should have audio overlay.
    Generate audio for 1-2 out of every 5 posts.

    Args:
        post_index: Index of current post (0-4)
        total_posts: Total posts being generated (default 5)

    Returns:
        Boolean indicating whether to generate audio
    """
    # Generate audio for posts at index 1 and 3 (2nd and 4th posts)
    # This gives us 2 out of 5 posts with audio, distributed evenly
    return post_index in [1, 3]
