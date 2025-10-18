# AWS Credentials Setup Guide

## 📁 File Location
Your credentials are stored in: `/Users/dhruvreddy/quickly/quickly/backend/.env`

## 🔑 Step 1: Get AWS Credentials

### Create IAM User in AWS Console

1. **Go to AWS Console**: https://console.aws.amazon.com/
2. **Navigate to IAM**: Search for "IAM" in the top search bar
3. **Create User**:
   - Click "Users" → "Create user"
   - Username: `quickly-bedrock-user`
   - Click "Next"

4. **Set Permissions**:
   - Select "Attach policies directly"
   - Search and select: `AmazonBedrockFullAccess`
   - Click "Next" → "Create user"

5. **Create Access Key**:
   - Click on the user you just created
   - Go to "Security credentials" tab
   - Click "Create access key"
   - Select use case: "Command Line Interface (CLI)"
   - Check the confirmation box
   - Click "Next" → "Create access key"

6. **Save Your Keys**:
   - **Access Key ID**: Starts with `AKIA...` (e.g., `AKIAIOSFODNN7EXAMPLE`)
   - **Secret Access Key**: Long string (shown ONLY ONCE!)
   - Download .csv file or copy both keys immediately

## ✏️ Step 2: Add Keys to .env File

Open the `.env` file in your backend directory:

```bash
nano /Users/dhruvreddy/quickly/quickly/backend/.env
```

Replace the placeholder values:

```env
# Django Settings
DJANGO_SECRET_KEY=django-insecure-g7zt*rsi1-46c()7f0j6xecc29t$o)mxv4t0p-b8p2e$%okk#=
DEBUG=True

# AWS Credentials for Bedrock - REPLACE THESE!
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1

# Database (optional - currently using SQLite)
# DATABASE_URL=postgresql://user:password@localhost:5432/quickly_db

# CORS Settings (for production)
# CORS_ALLOWED_ORIGINS=http://localhost:19006,exp://192.168.1.x:8081
```

**Save and close**: Press `Ctrl+X`, then `Y`, then `Enter`

## 🔓 Step 3: Enable Amazon Bedrock Access

1. **Go to Bedrock Console**: https://console.aws.amazon.com/bedrock/
2. **Select Region**: Choose `us-east-1` (top-right corner)
3. **Request Model Access**:
   - Click "Model access" in the left sidebar
   - Click "Manage model access" or "Enable specific models"
   - Find **Anthropic** section
   - Enable **Claude 3 Sonnet**
   - Click "Request model access" or "Save changes"
4. **Wait**: Access is usually granted in 1-2 minutes

## ✅ Step 4: Verify Setup

Test that everything works:

```bash
cd /Users/dhruvreddy/quickly/quickly/backend
source venv/bin/activate

# Test API endpoint (optional - install curl if needed)
curl -X POST http://localhost:8000/api/generateFeed \
  -H "Content-Type: application/json" \
  -d '{"topic": "teach me about AI"}'
```

If successful, you'll get a JSON response with 5 posts!

## 🛠️ Troubleshooting

### Error: "Could not connect to the endpoint URL"
- Check that AWS credentials are correct in `.env`
- Verify the region is `us-east-1`
- Restart Django server: `python manage.py runserver`

### Error: "Access Denied" or "UnauthorizedOperation"
- Make sure Bedrock model access is enabled
- Check IAM user has `AmazonBedrockFullAccess` permission
- Wait a few minutes after enabling model access

### Error: "ValidationException"
- Bedrock might not be available in your region
- Switch to `us-east-1` in `.env` file
- Enable Claude 3 Sonnet in Bedrock console

### Keys Not Working
- Make sure there are no spaces or quotes around the keys in `.env`
- Verify you copied the ENTIRE secret key (it's long!)
- Try creating new access keys if issues persist

## 🔒 Security Best Practices

1. ✅ **Never commit `.env` file to git** (already in .gitignore)
2. ✅ **Rotate keys regularly** (every 90 days)
3. ✅ **Use least privilege** (only Bedrock access needed)
4. ✅ **Delete unused keys** in AWS Console
5. ✅ **For production**: Use AWS IAM Roles, not access keys

## 📊 Current Setup

Your `.env` file controls:
- ✅ Django secret key
- ✅ Debug mode
- ✅ AWS access credentials
- ✅ AWS region for Bedrock
- ✅ CORS settings (optional)

## 🚀 Ready to Run?

Once you've added your credentials to `.env`:

```bash
cd /Users/dhruvreddy/quickly/quickly/backend
source venv/bin/activate
python manage.py runserver
```

The server will automatically load credentials from `.env`!

## 💡 Example AWS Credentials

Here's what the format should look like (with fake values):

```env
AWS_ACCESS_KEY_ID=AKIAI44QH8DHBEXAMPLE
AWS_SECRET_ACCESS_KEY=je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
```

Your actual keys will be different!
