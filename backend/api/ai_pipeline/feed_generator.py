import boto3
import json
import os
import traceback
from typing import List, Dict
from botocore.config import Config
from io import BytesIO
import base64
import re
from dotenv import load_dotenv
import time

load_dotenv()

class FeedGenerator:
    def __init__(self):
        try:
            # AWS clients
            self.bedrock_text = boto3.client(
                service_name="bedrock-runtime",
                config=Config(retries=dict(max_attempts=3))
            )
            self.bedrock_image = boto3.client(
                service_name="bedrock-runtime",
                config=Config(retries=dict(max_attempts=3))
            )
            self.s3 = boto3.client("s3")

            # Config
            self.BUCKET_NAME = os.environ.get("AWS_S3_BUCKET_NAME")
            self.REGION = os.environ.get("AWS_DEFAULT_REGION")
        except Exception as e:
            print("❌ Error initializing FeedGenerator:")
            traceback.print_exc()
            raise e

    async def generate_feed(self, topic: str, num_posts: int = 6) -> List[Dict]:
        """Generate full feed with captions, flashcards, and AI images."""
        try:
            feed_content = await self._generate_feed_content(topic, num_posts)
        except Exception as e:
            print(f"❌ Error generating feed content for topic '{topic}':")
            traceback.print_exc()
            raise e

        processed_posts = []
        for idx, post in enumerate(feed_content):
            try:
                s3_url = await self._generate_and_upload_image(
                    post["image_prompt"], f"feeds/{topic}/{idx}.png"
                )
                post["image_url"] = s3_url
                processed_posts.append(post)
            except Exception as e:
                print(f"❌ Error generating/uploading image for post #{idx} (topic '{topic}'):")
                traceback.print_exc()
                continue  # Skip failed image but continue others

        return processed_posts

    async def _generate_feed_content(self, topic: str, num_posts: int) -> List[Dict]:
        """Generate feed text and prompts using Claude, Titan, or OpenAI-compatible models."""
        start = time.time()
        prompt = f"""
        Generate {num_posts} educational social media posts about '{topic}'.
        Each post should include:
        1. "caption": a short, catchy 1–2 sentence explanation
        2. "flashcard": an object with "question" and "answer"
        3. "image_prompt": a vivid description for an illustration

        Respond in pure JSON with the format:
        {{
        "posts": [
            {{
            "caption": "...",
            "flashcard": {{"question": "...", "answer": "..."}},
            "image_prompt": "..."
            }}
        ]
        }}
        """

        try:
            response = self.bedrock_text.invoke_model(
                modelId="openai.gpt-oss-20b-1:0",
                body=json.dumps({
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 2000,
                    "temperature": 0.7
                })
            )
        except Exception as e:
            print("❌ Error invoking Bedrock text model:")
            traceback.print_exc()
            raise e

        try:
            body = json.loads(response["body"].read())

            # Try to get text from any known structure
            completion_text = (
                body.get("content", [{}])[0].get("text")
                or body.get("completion")
                or body.get("outputText")
                or body.get("output")
                or body.get("results", [{}])[0].get("outputText")
                or (body.get("choices", [{}])[0].get("message", {}).get("content"))
            )

            if not completion_text:
                raise ValueError(f"Unexpected model response format: {json.dumps(body, indent=2)}")

            # 🧹 Remove reasoning tags and leading/trailing junk
            completion_text = re.sub(r"<reasoning>.*?</reasoning>", "", completion_text, flags=re.DOTALL).strip()

            # 🧩 Extract JSON substring (anything between first { and last })
            json_match = re.search(r"\{.*\}", completion_text, flags=re.DOTALL)
            if not json_match:
                raise ValueError(f"No JSON object found in model output:\n{completion_text[:500]}")

            json_str = json_match.group(0).strip()
            parsed_json = json.loads(json_str)

            posts = parsed_json.get("posts", [])
            if not posts:
                raise ValueError(f"No posts found in parsed JSON:\n{json.dumps(parsed_json, indent=2)}")

            print(f"⏱️ Feed content generation took {time.time() - start:.2f} seconds")
            return posts

        except Exception as e:
            print("❌ Error parsing Bedrock text model response:")
            print("Raw response body:", response.get("body"))
            traceback.print_exc()
            raise e


    async def _generate_and_upload_image(self, image_prompt: str, s3_key: str) -> str:
        """Generate image from prompt using Bedrock Titan Image Generator."""
        start = time.time()
        try:
            response = self.bedrock_image.invoke_model(
                modelId="amazon.titan-image-generator-v2:0",
                body=json.dumps({
                    "taskType": "TEXT_IMAGE",
                    "textToImageParams": {
                        "text": image_prompt
                    },
                    "imageGenerationConfig": {
                        "numberOfImages": 1,
                        "height": 512,
                        "width": 512,
                        "cfgScale": 7.5,
                        "seed": 42
                    }
                }),
            )
        except Exception as e:
            print(f"❌ Error invoking Bedrock image model for prompt: '{image_prompt[:60]}...'")
            traceback.print_exc()
            raise e

        try:
            body = json.loads(response["body"].read())
            # Titan returns base64-encoded PNGs under `images`
            image_base64 = body["images"][0]
            image_bytes = base64.b64decode(image_base64)
        except Exception as e:
            print("❌ Error decoding image response from Bedrock:")
            print("Raw response body:", response.get("body"))
            traceback.print_exc()
            raise e

        try:
            self.s3.put_object(
                Bucket=self.BUCKET_NAME,
                Key=s3_key,
                Body=image_bytes,
                ContentType="image/png"
            )
            print(f"⏱️ Image generation & upload took {time.time() - start:.2f} seconds")
            return f"https://{self.BUCKET_NAME}.s3.{self.REGION}.amazonaws.com/{s3_key}"
        except Exception as e:
            print(f"❌ Error uploading image to S3: {s3_key}")
            traceback.print_exc()
            raise e

