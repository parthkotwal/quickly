import asyncio
from ai_pipeline.feed_generator import FeedGenerator

async def main():
    fg = FeedGenerator()

    print("🔹 Generating one sample feed post...")
    result = await fg.generate_feed("neural networks", num_posts=1)

    print("\n✅ Feed content:")
    for post in result:
        print(f"- Caption: {post['caption']}")
        print(f"  Q: {post['flashcard']['question']}")
        print(f"  A: {post['flashcard']['answer']}")
        print(f"  Image URL: {post['image_url']}")
        print()

if __name__ == "__main__":
    asyncio.run(main())
