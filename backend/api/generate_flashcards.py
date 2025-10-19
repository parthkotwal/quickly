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

        Analyze the text below and create flashcards that summarize and explain each main concept clearly.

        Each flashcard should be a JSON object with a "topic" and an "explanation".
        - The "topic" is the concept name or heading.
        - The "explanation" is a short, clear summary (1–3 sentences) of that concept.
        - Focus on explaining key points, not questions.

        Text:
        {full_text}

        JSON Output Example:
        [
          {{
            "topic": "Photosynthesis",
            "explanation": "Photosynthesis is the process by which plants use sunlight to produce food and energy."
          }},
          {{
            "topic": "Chlorophyll",
            "explanation": "Chlorophyll is a pigment in plants that captures sunlight during photosynthesis."
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

        try:
            data = json.loads(text)
        except Exception:
            data = [{"topic": "Raw Output", "explanation": text}]

        return Response({
            "type": "flashcards",
            "image_url": s3_url,
            "flashcards": data
        })

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)
