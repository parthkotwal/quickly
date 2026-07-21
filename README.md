# Quickly

**AI-powered learning feed.** Turn any topic into a swipeable, TikTok-style feed of educational posts — complete with images, captions, and audio narration — then auto-generate flashcards and quizzes from your own notes by snapping a photo.

Quickly is a cross-platform mobile app (iOS/Android) with a Django REST backend that orchestrates a generative AI pipeline on AWS.

---

## Features

- **Generative topic feeds** — Enter a topic and get 8 image-grounded educational posts. The backend expands the topic into semantic image-search queries, retrieves matching images, and generates captions conditioned on the retrieved visuals.
- **Photo → flashcards** — Photograph handwritten or printed notes; OCR extracts the text and an LLM turns it into concept flashcards.
- **Photo → quizzes** — The same OCR pipeline generates validated multiple-choice quizzes (4 options, one correct answer), with scoring and completion tracking.
- **Neural audio narration** — AWS Polly generates spoken explanations layered onto feed posts.
- **Social feed** — Public/private feeds, likes, and an infinite-scroll discovery feed with stable pagination.
- **Auth** — Firebase Authentication.

---

## Architecture

```
┌──────────────────────────┐         ┌──────────────────────────────┐
│  Frontend (Expo / RN)    │  HTTP   │  Backend (Django + DRF)      │
│  TypeScript, expo-router │ ──────► │  23 REST endpoints           │
│  Firebase Auth           │         │                              │
└──────────────────────────┘         └──────────────┬───────────────┘
                                                     │
                        ┌────────────────────────────┼────────────────────────────┐
                        │                            │                            │
                  ┌─────▼──────┐            ┌────────▼────────┐          ┌────────▼────────┐
                  │ AWS Bedrock │            │ AWS Rekognition │          │   AWS Polly     │
                  │ (Llama 3)   │            │     (OCR)       │          │  (neural TTS)   │
                  └─────────────┘            └─────────────────┘          └─────────────────┘
                        │                                                          │
                  ┌─────▼──────────────────────────────────────────────────────────▼─────┐
                  │   AWS S3 (images + audio, content-hashed)  ·  DynamoDB (5 tables)     │
                  └───────────────────────────────────────────────────────────────────────┘

  Image retrieval: Google Custom Search  →  Bing (automatic failover)
```

### Backend pipeline highlights

- **Feed generation** ([backend/api/views.py](backend/api/views.py)) — Bedrock (`meta.llama3-70b-instruct`) generates image-search queries → Google Custom Search with Bing failover fetches images → images are cached to S3 → Bedrock generates a caption per post.
- **OCR → assessments** ([backend/api/generate_flashcards.py](backend/api/generate_flashcards.py), [backend/api/generate_quiz.py](backend/api/generate_quiz.py)) — Rekognition line-level text detection feeds schema-constrained Bedrock inference. A three-tier fallback (strict JSON parse → structural validation → secondary LLM topic extraction) keeps malformed model output from reaching the user.
- **Persistence** ([backend/api/dynamodb_service.py](backend/api/dynamodb_service.py)) — 5 DynamoDB tables (`posts`, `likes`, `users`, `flashcards`, `quizzes`) with composite `userId`/`postId` keys and a topic GSI, lazily provisioned in code. Public-feed pagination uses seeded-PRNG shuffling for stable ordering across offsets; creator deletes are tombstoned (soft delete) to preserve the shared feed.
- **Assets** ([backend/api/s3_service.py](backend/api/s3_service.py), [backend/api/polly_service.py](backend/api/polly_service.py)) — Images and audio are content-hashed (MD5) and uploaded to S3 with long-lived immutable cache headers to deduplicate and speed repeat loads.

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.81, Expo 54 (`expo-router`, new architecture), TypeScript |
| Auth | Firebase Authentication |
| API | Django 5.2, Django REST Framework 3.16 |
| AI / ML | AWS Bedrock (Llama 3 70B), AWS Rekognition (OCR), AWS Polly (neural TTS) |
| Storage | AWS S3 (assets), AWS DynamoDB (app data), SQLite (Django metadata) |
| Image search | Google Custom Search API, Bing Image Search API |

---

## Project structure

```
quickly/
├── backend/
│   ├── quickly_backend/       # Django project (settings, urls, wsgi/asgi)
│   ├── api/
│   │   ├── views.py               # Feed generation + 20+ REST endpoints
│   │   ├── urls.py                # Route table
│   │   ├── dynamodb_service.py    # DynamoDB data-access layer
│   │   ├── s3_service.py          # S3 upload/caching
│   │   ├── polly_service.py       # Neural TTS
│   │   ├── generate_flashcards.py # OCR → flashcards
│   │   ├── generate_quiz.py       # OCR → quizzes
│   │   └── models.py              # Django models
│   ├── requirements.txt
│   └── manage.py
└── frontend/
    ├── app/                   # expo-router screens (feed, quiz, flashcards, chat, auth…)
    ├── components/            # Shared UI (nav bars, tab bars)
    ├── config.ts             # API base URL
    └── firebaseConfig.ts     # Firebase client config
```

---

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- An AWS account with access to **Bedrock, Rekognition, Polly, S3, and DynamoDB**
- (Optional) Google Custom Search and/or Bing Image Search API keys for feed images

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment variables (see below), then:
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Create a `.env` file in `backend/` with your credentials:

```env
# AWS
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=us-east-1

# S3
S3_BUCKET_NAME=quickly-images

# DynamoDB (defaults shown; override if needed)
DYNAMODB_POSTS_TABLE=quickly-posts
DYNAMODB_LIKES_TABLE=quickly-likes
DYNAMODB_USERS_TABLE=quickly-users
DYNAMODB_FLASHCARDS_TABLE=quickly-flashcards
DYNAMODB_QUIZZES_TABLE=quickly-quizzes

# Image search (at least one recommended)
GOOGLE_API_KEY=your_google_key
GOOGLE_SEARCH_ENGINE_ID=your_cx_id
BING_API_KEY=your_bing_key

# Django
DJANGO_SECRET_KEY=change-me
DEBUG=True
```

> S3 buckets and DynamoDB tables are created automatically on first use if they don't already exist, provided your AWS credentials have the necessary permissions.

### 2. Frontend

```bash
cd frontend
npm install

# Point the app at your backend:
# edit config.ts and set LOCAL_IP to your machine's LAN IP
# (use localhost only for the iOS Simulator)

npx expo start
```

Then press `i` for the iOS Simulator, `a` for Android, or scan the QR code with Expo Go on a physical device.

---

## API reference

Base URL: `http://<host>:8000/api`

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/generateFeed` | Generate posts for a topic |
| `POST` | `/saveFeedPosts` | Persist generated posts |
| `GET`  | `/getFeed` | Get a user's posts |
| `GET`  | `/getPublicFeed` | Paginated public discovery feed |
| `GET`  | `/getFeedByTopic` | Posts for one topic |
| `DELETE` | `/deleteFeed` | Soft-delete a topic's posts |
| `POST` | `/updateFeedPrivacy` | Toggle feed public/private |
| `POST` | `/toggleLike` | Like / unlike a post |
| `GET`  | `/getLikedPosts` | A user's liked posts |
| `GET`  | `/getTopics` | A user's topics |
| `POST` | `/uploadImage` | Upload an image to S3 |
| `POST` | `/generateFlashcards` | OCR a photo → flashcards |
| `POST` | `/generateQuiz` | OCR a photo → quiz |
| `GET`  | `/getSavedFlashcards` · `/getFlashcard` · `DELETE /deleteFlashcard` | Flashcard CRUD |
| `GET`  | `/getSavedQuizzes` · `/getQuiz` · `POST /submitQuiz` · `DELETE /deleteQuiz` | Quiz CRUD + scoring |
| `GET`  | `/health` | Health check |

---

## Notes & limitations

- The included Django `SECRET_KEY`, `DEBUG=True`, `ALLOWED_HOSTS = ["*"]`, and `CORS_ALLOW_ALL_ORIGINS` are **development defaults** — lock these down before any production deployment.
- Django's SQLite database stores only framework metadata; all application data lives in DynamoDB.
- Feed image quality depends on having at least one image-search API key configured.
