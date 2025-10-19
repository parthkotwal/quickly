import os
import json
import boto3
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['POST'])
def generate_flashcards(request):
    """
    Extract text from uploaded image -> generate concept-based flashcards (summaries).
    Each flashcard should explain one key concept or point.
    """
    try:
        file_obj = request.FILES.get('file')
        user_id = request.POST.get('userId')

        if not file_obj:
            return Response({'error': 'file is required'}, status=400)

        # Upload image to S3
        from .s3_service import upload_image_file
        s3_url = upload_image_file(file_obj, user_id or 'default')
        if not s3_url:
            return Response({'error': 'Failed to upload image'}, status=500)

        # Initialize AWS clients
        region = os.getenv('AWS_DEFAULT_REGION', 'us-west-2')
        s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
        rekog = boto3.client(
            'rekognition',
            region_name=region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )

        # Extract object key from the S3 URL
        key = s3_url.split(f"{os.getenv('S3_BUCKET_NAME')}.s3.{region}.amazonaws.com/")[-1]

        # Get image bytes from S3
        s3_response = s3_client.get_object(
            Bucket=os.getenv('S3_BUCKET_NAME'),
            Key=key
        )
        image_bytes = s3_response["Body"].read()

        # Perform OCR using Rekognition
        response = rekog.detect_text(Image={"Bytes": image_bytes})
        extracted_texts = [
            t['DetectedText'] for t in response.get('TextDetections', [])
            if t['Type'] == 'LINE'
        ]
        full_text = "\n".join(extracted_texts)

        if not full_text.strip():
            return Response({'error': 'No readable text found in image'}, status=400)

        # Generate conceptual flashcards via Bedrock
        bedrock = boto3.client('bedrock-runtime', region_name=region)

        prompt = f"""
        You are an AI tutor that creates flashcards for learning from educational notes or images.

        Analyze the text below and create 2-5 flashcards that summarize and explain each main concept clearly.

        Each flashcard should be a JSON object with a "topic" and an "explanation".
        - The "topic" is a clear, specific concept name (2-5 words).
        - The "explanation" is a concise summary (1-3 sentences) explaining that concept.
        - Focus on the most important educational concepts from the text.

        Text:
        {full_text}

        Return ONLY a valid JSON array with no extra text, markdown, or code blocks:
        [
          {{
            "topic": "Main Concept 1",
            "explanation": "Clear explanation of the first key concept from the text."
          }},
          {{
            "topic": "Main Concept 2", 
            "explanation": "Clear explanation of the second key concept from the text."
          }}
        ]
        """

        result = bedrock.invoke_model(
            modelId='meta.llama3-70b-instruct-v1:0',
            body=json.dumps({
                "prompt": prompt,
                "max_gen_len": 1024,
                "temperature": 0.7,
                "top_p": 0.9
            })
        )

        body = json.loads(result['body'].read())
        text = (
            body.get('generation')
            or body.get('output')
            or body.get('outputs', [{}])[0].get('text', '')
        ).strip()

        print("🧩 Bedrock raw output:", text)  # Debug log — useful while testing

        # Improved JSON parsing with better topic extraction
        try:
            # Try to parse as JSON first
            data = json.loads(text)
            
            # Validate that it's a list of flashcards with proper structure
            if not isinstance(data, list):
                raise ValueError("Not a list")
            
            # Clean up any flashcards that don't have proper topic/explanation
            cleaned_data = []
            for item in data:
                if isinstance(item, dict) and 'topic' in item and 'explanation' in item:
                    cleaned_data.append({
                        'topic': str(item['topic']).strip(),
                        'explanation': str(item['explanation']).strip()
                    })
            
            if not cleaned_data:
                raise ValueError("No valid flashcards found")
                
            data = cleaned_data
            
        except Exception as json_error:
            print(f"JSON parsing failed: {json_error}")
            
            # Fallback: Try to extract content and create a meaningful topic
            try:
                # Generate a topic based on the OCR text
                topic_prompt = f"""
                Analyze this text and create a short, descriptive topic title (2-4 words max):
                
                {full_text[:200]}...
                
                Topic title:"""
                
                topic_result = bedrock.invoke_model(
                    modelId='meta.llama3-70b-instruct-v1:0',
                    body=json.dumps({
                        "prompt": topic_prompt,
                        "max_gen_len": 50,
                        "temperature": 0.3,
                        "top_p": 0.9
                    })
                )
                
                topic_body = json.loads(topic_result['body'].read())
                generated_topic = topic_body.get('generation', '').strip()
                
                # Clean up the generated topic
                generated_topic = generated_topic.replace('"', '').replace("'", '').strip()
                if not generated_topic or len(generated_topic) > 50:
                    generated_topic = "Study Notes"
                
            except Exception as topic_error:
                print(f"Topic generation failed: {topic_error}")
                # Determine topic from OCR text content
                words = full_text.split()[:10]  # First 10 words
                if len(words) >= 2:
                    generated_topic = ' '.join(words[:3]).title()
                else:
                    generated_topic = "Study Notes"
            
            # Create structured flashcard from the raw text
            data = [{
                "topic": generated_topic,
                "explanation": text[:500] + "..." if len(text) > 500 else text
            }]

        # Save flashcard set to database if we have valid data and user_id
        if user_id and data and len(data) > 0:
            try:
                from .dynamodb_service import save_flashcard_set
                
                # Create a title from the first topic with better fallback
                if data and len(data) > 0:
                    first_topic = data[0].get('topic', '').strip()
                    if first_topic and first_topic.lower() not in ['raw output', 'study notes', 'flashcards']:
                        title = first_topic
                    elif len(data) > 1:
                        # Try second flashcard if first is generic
                        second_topic = data[1].get('topic', '').strip()
                        title = second_topic if second_topic else 'Study Notes'
                    else:
                        title = 'Study Notes'
                else:
                    title = 'Generated Flashcards'
                
                # Truncate if too long
                if len(title) > 50:
                    title = title[:47] + "..."
                
                saved_flashcard = save_flashcard_set(
                    user_id=user_id,
                    title=title,
                    flashcards_data=data,
                    image_url=s3_url
                )
                
                print(f"✅ Saved flashcard set: {title}")
                
            except Exception as e:
                print(f"⚠️ Failed to save flashcard set: {str(e)}")
                # Don't fail the request if saving fails

        return Response({
            "type": "flashcards",
            "image_url": s3_url,
            "flashcards": data
        })

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)
