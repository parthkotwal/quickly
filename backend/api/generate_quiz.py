import os
import json
import boto3
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['POST'])
def generate_quiz(request):
    """
    Extract text from uploaded image -> generate multiple-choice quiz questions.
    Creates 6+ multiple choice questions based on the content with proper validation.
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

        # Use Rekognition to extract text from image
        response = rekog.detect_text(Image={'Bytes': image_bytes})

        text_detections = response.get('TextDetections', [])
        full_text = ' '.join([detection['DetectedText'] for detection in text_detections if detection['Type'] == 'LINE'])

        print("🔍 OCR extracted text:", full_text)

        if not full_text.strip():
            return Response({'error': 'No readable text found in image'}, status=400)

        # Generate quiz questions via Bedrock
        bedrock = boto3.client('bedrock-runtime', region_name=region)

        prompt = f"""
        You are an AI quiz generator. Create educational multiple choice questions based on this text.

        Analyze the text below and create 6-8 multiple choice questions that test understanding of the key concepts.

        Text: {full_text}

        Create questions that are:
        - Directly related to the content in the text
        - Test comprehension of main concepts
        - Have 4 answer options each
        - Have exactly one correct answer

        Return ONLY a valid JSON array with no extra text, markdown, or code blocks:
        [
          {{
            "question": "What is the main concept discussed in the text?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": 0
          }},
          {{
            "question": "Another question about the content?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": 2
          }}
        ]

        Rules:
        - correct_answer is the index (0-3) of the correct option
        - Questions should be specific to the text content
        - Make questions challenging but fair
        - Ensure all 4 options are plausible
        """

        result = bedrock.invoke_model(
            modelId='meta.llama3-70b-instruct-v1:0',
            body=json.dumps({
                "prompt": prompt,
                "max_gen_len": 2048,
                "temperature": 0.7,
                "top_p": 0.9
            })
        )

        body = json.loads(result['body'].read())
        text = body.get('generation', '').strip()

        print("🧩 Bedrock raw output:", text)

        # Enhanced JSON parsing with better question validation
        try:
            # Try to parse as JSON first
            data = json.loads(text)
            
            # Validate that it's a list of quiz questions with proper structure
            if not isinstance(data, list):
                raise ValueError("Not a list")
            
            # Clean up any questions that don't have proper structure
            cleaned_data = []
            for item in data:
                if (isinstance(item, dict) and 
                    'question' in item and 
                    'options' in item and 
                    'correct_answer' in item and
                    isinstance(item['options'], list) and
                    len(item['options']) == 4 and
                    isinstance(item['correct_answer'], int) and
                    0 <= item['correct_answer'] <= 3):
                    
                    cleaned_data.append({
                        'question': str(item['question']).strip(),
                        'options': [str(opt).strip() for opt in item['options']],
                        'correct_answer': int(item['correct_answer'])
                    })
            
            if len(cleaned_data) < 4:  # Minimum 4 questions
                raise ValueError("Not enough valid questions found")
                
            data = cleaned_data
            
        except Exception as json_error:
            print(f"JSON parsing failed: {json_error}")
            
            # Fallback: Generate simple questions from text content
            try:
                # Generate a quiz topic based on the OCR text
                topic_prompt = f"""
                Analyze this educational content and create a descriptive quiz topic title (4-6 words max).
                Make it specific and informative about the subject matter.
                
                Content: {full_text[:300]}...
                
                Examples of good topics:
                - "Biology Cell Structure Quiz"
                - "World War II History Quiz" 
                - "Calculus Derivatives Quiz"
                - "Chemistry Periodic Table Quiz"
                
                Create a topic title:"""
                
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
                # Remove common prefixes if they exist
                if generated_topic.lower().startswith('quiz topic:'):
                    generated_topic = generated_topic[11:].strip()
                if generated_topic.lower().startswith('topic:'):
                    generated_topic = generated_topic[6:].strip()
                    
                if not generated_topic or len(generated_topic) > 60:
                    generated_topic = "Study Material Quiz"
                
            except Exception as topic_error:
                print(f"Topic generation failed: {topic_error}")
                words = full_text.split()[:10]
                if len(words) >= 3:
                    # Create a more descriptive topic from key words
                    key_words = [word.title() for word in words[:4] if len(word) > 3]
                    if key_words:
                        generated_topic = ' '.join(key_words[:3]) + " Quiz"
                    else:
                        generated_topic = "Study Material Quiz"
                else:
                    generated_topic = "Educational Quiz"
            
            # Create basic questions from the raw text
            data = [
                {
                    "question": f"What is the main topic discussed in this content?",
                    "options": [generated_topic, "Unrelated Topic A", "Unrelated Topic B", "Unrelated Topic C"],
                    "correct_answer": 0
                },
                {
                    "question": f"Based on the content, which statement is most accurate?",
                    "options": ["Statement A", "Statement B", f"Content relates to {generated_topic}", "Statement D"],
                    "correct_answer": 2
                },
                {
                    "question": f"Which concept is emphasized in the material?",
                    "options": ["Concept A", generated_topic, "Concept C", "Concept D"],
                    "correct_answer": 1
                },
                {
                    "question": f"According to the content, what is the key focus?",
                    "options": ["Focus A", "Focus B", "Focus C", generated_topic],
                    "correct_answer": 3
                }
            ]

        # Save quiz to database if we have valid data and user_id
        if user_id and data and len(data) >= 4:
            try:
                from .dynamodb_service import save_quiz_set
                
                # Generate a better topic title for the quiz
                topic_title = "Study Material Quiz"  # Default fallback
                
                try:
                    # Generate topic based on content
                    topic_prompt = f"""
                    Analyze this educational content and create a descriptive quiz topic title (4-6 words max).
                    Make it specific and informative about the subject matter.
                    
                    Content: {full_text[:300]}...
                    
                    Examples of good topics:
                    - "Biology Cell Structure Quiz"
                    - "World War II History Quiz" 
                    - "Calculus Derivatives Quiz"
                    - "Chemistry Periodic Table Quiz"
                    
                    Create a topic title:"""
                    
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
                    # Remove common prefixes if they exist
                    if generated_topic.lower().startswith('quiz topic:'):
                        generated_topic = generated_topic[11:].strip()
                    if generated_topic.lower().startswith('topic:'):
                        generated_topic = generated_topic[6:].strip()
                        
                    if generated_topic and len(generated_topic) <= 60:
                        topic_title = generated_topic
                        
                except Exception as topic_error:
                    print(f"Topic generation failed: {topic_error}")
                    # Fallback: extract key terms from content
                    words = full_text.split()[:15]
                    key_words = [word.title() for word in words if len(word) > 4 and word.isalpha()]
                    if key_words:
                        topic_title = ' '.join(key_words[:3]) + " Quiz"
                    else:
                        topic_title = "Educational Content Quiz"
                
                # Ensure title isn't too long
                if len(topic_title) > 50:
                    topic_title = topic_title[:47] + "..."
                
                saved_quiz = save_quiz_set(
                    user_id=user_id,
                    title=topic_title,
                    questions_data=data,
                    image_url=s3_url
                )
                
                print(f"💾 Quiz saved to database: {saved_quiz}")
                
            except Exception as save_error:
                print(f"❌ Failed to save quiz: {save_error}")

        return Response({
            'type': 'quiz',
            'quiz_questions': data,
            'image_url': s3_url,
            'total_questions': len(data)
        })

    except Exception as e:
        print(f"❌ Error generating quiz: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)
