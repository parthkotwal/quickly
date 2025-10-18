# Quickly - AI-Powered Educational Platform

An Instagram-style educational platform that uses Amazon Bedrock (Claude) to generate personalized learning feeds.

## Features

- **AI-Generated Educational Content**: Uses Amazon Bedrock Claude to create 5 engaging, educational posts about any topic
- **Instagram-Style Feed**: Vertical scrolling feed with images, text, and music overlays
- **Topic History**: Track all your learning topics in the dropdown menu
- **Real-time Generation**: Enter a topic in the chatbot and get personalized content instantly

## Architecture

### Backend (Django + Amazon Bedrock)
- Django REST API with `/api/generateFeed` endpoint
- Amazon Bedrock integration using Claude 3 Sonnet
- CORS enabled for React Native frontend
- Generates 5 educational posts with images and music metadata

### Frontend (React Native + Expo)
- Instagram-style vertical feed UI
- Chat interface for topic input
- AsyncStorage for persistent data
- Expo Router for navigation

## Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Run migrations
python manage.py migrate

# Start Django server
python manage.py runserver 0.0.0.0:8000
```

### 2. AWS Credentials Setup

You need to configure AWS credentials to use Amazon Bedrock:

```bash
# Install AWS CLI if not already installed
brew install awscli  # macOS
# or: pip install awscli

# Configure AWS credentials
aws configure

# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (us-east-1 recommended)
# - Default output format (json)
```

Make sure your AWS account has access to Amazon Bedrock and the Claude model is enabled in your region.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start Expo
npx expo start
```

### 4. Running the App

1. Start the Django backend: `python manage.py runserver 0.0.0.0:8000`
2. Start the Expo frontend: `npx expo start`
3. Scan the QR code with Expo Go app or press `i` for iOS simulator / `a` for Android emulator

## Usage Flow

1. **Login**: Sign in with your email/password (Firebase auth)
2. **Home Page**: View your Instagram-style educational feed (empty initially)
3. **New Chat**: Click "Quickly" dropdown → "New Chat"
4. **Enter Topic**: Type something like "teach me about neural networks"
5. **Generate Feed**: The app calls the backend API which uses Bedrock to generate 5 posts
6. **View Feed**: Return to home page to see your personalized learning feed
7. **Topic History**: Click dropdown to see all your previous topics

## API Endpoint

### POST /api/generateFeed

**Request:**
```json
{
  "topic": "teach me about neural networks"
}
```

**Response:**
```json
{
  "topic": "teach me about neural networks",
  "posts": [
    {
      "text": "Neural networks are inspired by the human brain...",
      "imageQuery": "neural network",
      "imageUrl": "https://source.unsplash.com/800x600/?neural,network",
      "musicUrl": "https://example.com/music/default.mp3",
      "musicTitle": "Background Music"
    },
    // ... 4 more posts
  ]
}
```

## Tech Stack

- **Backend**: Django 5.2, Django REST Framework, boto3 (AWS SDK)
- **AI**: Amazon Bedrock (Claude 3 Sonnet)
- **Frontend**: React Native, Expo, TypeScript
- **Database**: SQLite (development), can be swapped for PostgreSQL
- **Storage**: AsyncStorage for client-side persistence
- **Images**: Unsplash (placeholder API)

## Environment Variables

For production, create a `.env` file in the backend directory:

```
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=us-east-1
DJANGO_SECRET_KEY=your_secret_key
DEBUG=False
```

## Future Enhancements

- [ ] Real image search API (Google Custom Search or Unsplash API)
- [ ] Music integration (Spotify API or audio library)
- [ ] Save multiple topic feeds
- [ ] Share posts feature
- [ ] Like/favorite posts
- [ ] PostgreSQL for production
- [ ] Deploy backend (AWS/Heroku)
- [ ] Deploy frontend (App Store/Play Store)

## Troubleshooting

### Backend not connecting
- Make sure Django is running on `http://localhost:8000`
- Check CORS settings in `settings.py`
- Verify AWS credentials are configured

### Bedrock errors
- Ensure you have access to Amazon Bedrock in your AWS account
- Verify Claude 3 Sonnet model is available in your region
- Check your AWS credentials have proper permissions

### Frontend issues
- Clear Expo cache: `npx expo start -c`
- Reinstall packages: `rm -rf node_modules && npm install`
- Check AsyncStorage: `npx expo install @react-native-async-storage/async-storage`

## License

MIT
