# Bhashini Integration Setup

This application now supports **Bhashini** - Government of India's official AI-driven language translation platform for accurate Marathi transliteration.

## 🌟 Benefits of Bhashini Integration

- **Official Government Platform**: Developed by Ministry of Electronics and Information Technology
- **High Accuracy**: Much more accurate than custom transliteration
- **Real-time**: Fast transliteration as users type
- **Fallback Support**: Works even if API is unavailable

## 📋 Setup Instructions

### Step 1: Register for Bhashini API Access

1. Visit [https://bhashini.gov.in/](https://bhashini.gov.in/)
2. Register for an account
3. Apply for API access
4. Get your credentials:
   - `USER_ID`
   - `API_KEY` 
   - `PIPELINE_ID` (for transliteration)

### Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Bhashini API Configuration (Optional - for better Marathi transliteration)
BHASHINI_USER_ID="your-bhashini-user-id"
BHASHINI_API_KEY="your-bhashini-api-key"
BHASHINI_PIPELINE_ID="your-pipeline-id-for-transliteration"
```

### Step 3: For Vercel Deployment

Add the environment variables in Vercel dashboard:
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add the three Bhashini variables

## 🎯 How It Works

### User Experience
1. **Type in English**: User types "samrat" in Marathi name field
2. **Auto-conversion**: Automatically converts to "समत्" in real-time
3. **Toggle View**: Users can toggle between English and Marathi display
4. **Manual Trigger**: Press Enter to force transliteration
5. **Fallback**: If API is down, shows original English text

### Technical Implementation
- **API Route**: `/api/bhashini-transliterate` handles requests
- **Component**: `BhashiniMarathiInput` provides the UI
- **Debouncing**: 500ms delay to avoid excessive API calls
- **Error Handling**: Graceful fallback when service unavailable

## 🔧 Fallback Behavior

If Bhashini API is **not configured** or **unavailable**:
- ✅ Application continues to work normally
- ✅ Shows original English text
- ✅ Users can still enter Marathi manually
- ✅ Auto-conversion using local mapping still works via `name-converter.ts`

## 🚀 API Usage

### Endpoint
```
POST /api/bhashini-transliterate
```

### Request Body
```json
{
  "text": "samrat",
  "sourceLanguage": "en",
  "targetLanguage": "mr"
}
```

### Response
```json
{
  "transliteratedText": "समत्",
  "isFallback": false,
  "originalText": "samrat"
}
```

## 🔍 Testing

1. **Without API Setup**: Form works with local transliteration
2. **With API Setup**: Much more accurate transliteration
3. **Network Issues**: Graceful fallback to original text

## 📚 Official Documentation

- [Bhashini Official Site](https://bhashini.gov.in/)
- [Bhashini API Documentation](https://dibd-bhashini.gitbook.io/bhashini-apis/)
- [Available Models](https://dibd-bhashini.gitbook.io/bhashini-apis/available-models-for-usage)

## 🆚 Comparison with Previous Approach

| Feature | Old (GoogleMarathiInput) | New (BhashiniMarathiInput) |
|---------|-------------------------|---------------------------|
| Accuracy | Basic (local mapping) | High (AI-powered) |
| Real-time | Manual (Tab key) | Automatic (as you type) |
| Government Support | No | Yes (Official platform) |
| Fallback | Limited | Comprehensive |
| User Experience | Manual trigger | Seamless auto-conversion |
