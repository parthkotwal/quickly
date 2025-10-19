import os, json, boto3
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['POST'])
def generate_quiz(request):
    """
    Extract text from uploaded image -> generate multiple-choice quiz.
    """
    try:
        file_obj = request.FILES.get('file')
        user_id = request.POST.get('userId')

        if not file_obj:
            return Response({'error': 'file is required'}, status=400)

        from .s3_service import upload_image_file
        s3_url = upload_image_file(file_obj, user_id or 'default')

        # OCR
        rekog = boto3.client(
            'rekognition',
            region_name=os.getenv('AWS_DEFAULT_REGION', 'us-west-2'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        )
        response = rekog.detect_text(
            Image={'S3Object': {
                'Bucket': os.getenv('S3_BUCKET_NAME'),
                'Name': s3_url.split('/')[-1]
            }}
        )
        lines = [t['DetectedText'] for t in response['TextDetections'] if t['Type'] == 'LINE']
        text = "\n".join(lines)

        # Bedrock quiz generation
        bedrock = boto3.client('bedrock-runtime', region_name=os.getenv('AWS_DEFAULT_REGION', 'us-west-2'))
        prompt = f"""
        Generate 5 multiple-choice questions (MCQs) with 4 options and 1 correct answer
        based on the following text:
        {text}

        JSON Output:
        [
          {{
            "question": "...",
            "options": ["A", "B", "C", "D"],
            "correct": "B"
          }},
          ...
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
        output = body.get('generation', '').strip()

        try:
            data = json.loads(output)
        except:
            data = [{"raw_output": output}]

        return Response({
            "type": "quiz",
            "image_url": s3_url,
            "quiz": data
        })

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)
