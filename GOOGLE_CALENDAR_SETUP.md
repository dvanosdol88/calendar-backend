# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar integration for your AI assistant.

## Prerequisites

1. Google Cloud Console account
2. Google Calendar API enabled
3. Authentication credentials configured

## Setup Options

### Option 1: Service Account (Recommended for Production)

This method allows the application to access a dedicated calendar without user interaction.

#### Step 1: Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "Service Account"
5. Fill in service account details and create
6. In the service account list, click on your new service account
7. Go to "Keys" tab and click "Add Key" > "Create New Key"
8. Choose JSON format and download the key file

#### Step 2: Enable Calendar API

1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and click "Enable"

#### Step 3: Configure Calendar Permissions

1. Open Google Calendar in your browser
2. Go to calendar settings (gear icon > Settings)
3. Select the calendar you want to integrate with
4. In "Share with specific people", add your service account email
5. Give it "Make changes and manage sharing" permission

#### Step 4: Configure Environment Variables

```bash
# Copy the service account JSON file to your project
cp /path/to/downloaded/service-account-key.json ./google-service-account.json

# Add to .env file
GOOGLE_SERVICE_ACCOUNT_KEY=./google-service-account.json
DEFAULT_TIMEZONE=America/New_York
```

### Option 2: OAuth 2.0 User Authentication (For Personal Use)

This method accesses the user's personal calendar with their permission.

#### Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Click "Create Credentials" > "OAuth 2.0 Client IDs"
4. Choose "Web application"
5. Add authorized redirect URIs:
   - For local development: `http://localhost:3000/auth/google/callback`
   - For production: `https://your-domain.com/auth/google/callback`

#### Step 2: Enable Calendar API

Same as Option 1, Step 2.

#### Step 3: Configure Environment Variables

```bash
# Add to .env file
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
DEFAULT_TIMEZONE=America/New_York
```

#### Step 4: OAuth Flow Implementation

The OAuth flow requires user interaction. You would need to:

1. Redirect user to Google OAuth consent screen
2. Handle the callback with authorization code
3. Exchange code for refresh token
4. Store refresh token securely

## Environment Variables Reference

```bash
# Required: OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Option 1: Service Account
GOOGLE_SERVICE_ACCOUNT_KEY=./path/to/service-account-key.json

# Option 2: OAuth 2.0
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
GOOGLE_CALENDAR_REFRESH_TOKEN=user_refresh_token

# Optional: Default timezone
DEFAULT_TIMEZONE=America/New_York

# Optional: Environment
NODE_ENV=production
```

## Testing the Integration

Once configured, you can test the integration:

### 1. Check Calendar Capabilities

```bash
curl http://localhost:3000/api/calendar/capabilities
```

### 2. Test Natural Language Commands

Send these commands to `/ask-gpt`:

- "Add 'Team meeting' to my calendar for tomorrow at 2pm"
- "Schedule dentist appointment for next Friday at 10 AM"
- "What's on my calendar today?"
- "Put client call on my calendar for Monday at 3:30pm"

### 3. Direct API Calls

```bash
# Create event
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventTitle": "Test Meeting",
    "dateTime": "2025-07-08T14:00:00.000Z",
    "duration": 60,
    "description": "Test event created via API"
  }'

# List events
curl http://localhost:3000/api/calendar/events
```

## Troubleshooting

### "Calendar integration not configured" Error

- Verify environment variables are set correctly
- Check that the service account JSON file exists and is readable
- Ensure Google Calendar API is enabled in Google Cloud Console

### "Failed to authenticate" Error

- For service accounts: Verify the service account has calendar access
- For OAuth: Check that redirect URIs match exactly
- Ensure the calendar is shared with the service account email

### "Permission denied" Error

- For service accounts: Make sure the calendar is shared with the service account
- Check that the service account has appropriate permissions
- Verify the calendar ID is correct (usually 'primary' for main calendar)

### Date/Time Parsing Issues

- Ensure timezone is set correctly in environment variables
- Check that natural language input includes both date and time
- Verify the AI model has sufficient context for date parsing

## Security Best Practices

1. **Never commit credentials to version control**
2. **Use environment variables for all secrets**
3. **Restrict service account permissions to minimum required**
4. **Regularly rotate API keys and tokens**
5. **Use HTTPS in production**
6. **Validate all user inputs**

## API Rate Limits

Google Calendar API has the following limits:
- 1,000,000 queries per day
- 100 queries per 100 seconds per user

The integration includes automatic error handling for rate limits.

## Support

For issues specific to this integration, check:
1. Application logs for detailed error messages
2. Google Cloud Console API usage metrics
3. Google Calendar API documentation
4. This project's issue tracker

## Advanced Configuration

### Custom Timezone Handling

The integration supports custom timezones. Update `DEFAULT_TIMEZONE` in your environment variables:

```bash
# Examples
DEFAULT_TIMEZONE=America/New_York    # Eastern Time
DEFAULT_TIMEZONE=America/Los_Angeles # Pacific Time
DEFAULT_TIMEZONE=Europe/London       # GMT/BST
DEFAULT_TIMEZONE=Asia/Tokyo          # JST
```

### Multiple Calendar Support

To support multiple calendars, you can modify the calendar ID in API calls:

```javascript
// Instead of 'primary', use specific calendar ID
calendarId: 'your-calendar-id@group.calendar.google.com'
```

### Event Templates

You can create event templates for common meeting types:

```javascript
const eventTemplates = {
  'standup': { duration: 30, description: 'Daily standup meeting' },
  'one-on-one': { duration: 60, description: '1:1 meeting' },
  'all-hands': { duration: 90, description: 'All hands meeting' }
};
```