# AI Task Assistant Integration Guide

## Complete Implementation Overview

This guide demonstrates how the AI Task Assistant integrates with your existing calendar-backend system to provide intelligent task management capabilities.

## File Structure

```
calendar-backend/
├── index.js                      # Main server with enhanced AI integration
├── ai-task-assistant.js          # Core AI processing engine
├── ai-task-routes.js             # API endpoints for AI functionality
├── task-api.js                   # Existing task management API
├── task-storage.js               # Task storage and data management
├── test-ai-assistant.js          # Comprehensive testing suite
├── example-client.html           # Demo web client
├── AI_TASK_ASSISTANT_README.md   # Complete documentation
├── INTEGRATION_GUIDE.md          # This file
└── package.json                  # Dependencies (now includes axios)
```

## Integration Points

### 1. Enhanced `/ask-gpt` Endpoint

Your existing `/ask-gpt` endpoint now has intelligent task command detection:

```javascript
// Before: Only handled calendar queries
app.post('/ask-gpt', async (req, res) => {
  // Only calendar/GPT processing
});

// After: Handles both calendar queries AND task commands
app.post('/ask-gpt', async (req, res) => {
  // 1. Check if it's a task command
  const taskResult = await aiTaskAssistant.processUserInput(prompt);
  
  if (taskResult.isTaskCommand) {
    // Handle task command
    return res.send({
      answer: taskResult.aiResponse,
      taskCommand: true,
      executionResult: taskResult.executionResult
    });
  }
  
  // 2. Otherwise, handle as calendar/general query
  // (with task context included)
});
```

### 2. New AI-Specific Endpoints

#### `/ai/task` - Main AI Processing
```javascript
POST /ai/task
{
  "input": "Add 'Review Q4 reports' to my work tasks"
}

// Returns:
{
  "success": true,
  "data": {
    "isTaskCommand": true,
    "commandAnalysis": { ... },
    "executionResult": { ... },
    "aiResponse": "I've added 'Review Q4 reports' to your work tasks..."
  }
}
```

#### `/ai/task/analyze` - Command Analysis
```javascript
POST /ai/task/analyze
{
  "input": "Mark meeting as complete"
}

// Returns command analysis without execution
```

#### `/ai/task/help` - System Help
```javascript
GET /ai/task/help

// Returns supported commands and examples
```

#### `/ai/task/status` - System Status
```javascript
GET /ai/task/status

// Returns system health and configuration
```

### 3. Existing Task API Integration

The AI assistant seamlessly integrates with your existing task API:

```javascript
// Your existing endpoints (unchanged):
GET    /api/tasks              # Get all tasks
GET    /api/tasks/:type        # Get tasks by type
POST   /api/tasks/:type        # Add new task
PATCH  /api/tasks/:type/:id/toggle  # Toggle completion
PATCH  /api/tasks/:type/:id    # Edit task
DELETE /api/tasks/:type/:id    # Delete task
GET    /api/tasks-for-ai       # AI-formatted tasks

// AI assistant calls these endpoints internally
```

## Usage Examples

### Client-Side JavaScript

```javascript
// Using the enhanced ask-gpt endpoint (recommended)
async function sendCommand(userInput) {
  const response = await fetch('/ask-gpt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: userInput })
  });
  
  const data = await response.json();
  
  if (data.taskCommand) {
    console.log('Task executed:', data.executionResult.message);
    console.log('AI response:', data.answer);
  } else {
    console.log('General response:', data.answer);
  }
}

// Using the dedicated AI task endpoint
async function processTaskCommand(userInput) {
  const response = await fetch('/ai/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: userInput })
  });
  
  const data = await response.json();
  
  if (data.data.isTaskCommand) {
    console.log('Command processed:', data.data.aiResponse);
  } else {
    console.log('Not a task command:', data.data.message);
  }
}
```

### Command Examples

```javascript
// All these work with natural language:
await sendCommand("Add 'Review Q4 reports' to my work tasks");
await sendCommand("What are my work tasks?");
await sendCommand("Mark 'Review Q4 reports' as complete");
await sendCommand("Delete the meeting task");
await sendCommand("Change 'buy groceries' to 'buy groceries and milk'");
await sendCommand("How many tasks do I have?");
```

## Testing Your Integration

### 1. Basic Functionality Test

```bash
# Start your server
npm start

# Test the AI assistant
node test-ai-assistant.js

# Interactive testing
node test-ai-assistant.js interactive
```

### 2. Web Client Test

1. Start your server: `npm start`
2. Open `example-client.html` in your browser
3. Try the example commands
4. Test with your own natural language commands

### 3. API Testing

```bash
# Test command analysis
curl -X POST http://localhost:3000/ai/task/analyze \
  -H "Content-Type: application/json" \
  -d '{"input": "Add task to work list"}'

# Test task processing
curl -X POST http://localhost:3000/ai/task \
  -H "Content-Type: application/json" \
  -d '{"input": "Add '\''Review reports'\'' to my work tasks"}'

# Test enhanced ask-gpt
curl -X POST http://localhost:3000/ask-gpt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What are my current tasks?"}'
```

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
PORT=3000
```

### AI Model Configuration

In `ai-task-assistant.js`, you can adjust:

```javascript
// Command parsing (deterministic)
temperature: 0.1

// Response generation (creative)
temperature: 0.7

// Token limits
max_tokens: 150-200
```

## Error Handling

The system includes comprehensive error handling:

```javascript
// Network errors
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

// API errors
if (data.error) {
  console.error('API Error:', data.error);
  return;
}

// Task execution errors
if (!result.executionResult.success) {
  console.log('Task failed:', result.executionResult.message);
}
```

## Performance Considerations

### Response Times
- Command analysis: ~1-2 seconds
- Task execution: ~0.5-1 second
- Total processing: ~2-3 seconds

### Optimization Tips
1. **Caching**: Implement Redis for repeated queries
2. **Rate Limiting**: Add rate limiting for production
3. **Batch Processing**: Group multiple commands
4. **Error Retries**: Add exponential backoff

### Production Deployment

```javascript
// Add these middleware for production:
app.use(require('helmet')); // Security
app.use(require('compression')); // Compression
app.use(require('express-rate-limit')({ // Rate limiting
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

## Migration from Existing System

### Step 1: Update Dependencies
```bash
npm install axios
```

### Step 2: Add AI Files
- Copy `ai-task-assistant.js`
- Copy `ai-task-routes.js`
- Update `index.js` with AI integration

### Step 3: Test Integration
- Run test suite
- Test existing functionality
- Test new AI features

### Step 4: Update Client Code
```javascript
// Old way (still works)
fetch('/ask-gpt', { /* calendar query */ });

// New way (enhanced)
fetch('/ask-gpt', { /* task command or calendar query */ });
```

## Troubleshooting

### Common Issues

1. **OpenAI API Key Missing**
   ```bash
   Error: OpenAI API key not found
   Solution: Set OPENAI_API_KEY in .env file
   ```

2. **Task API Not Found**
   ```bash
   Error: Failed to fetch tasks
   Solution: Ensure task-api.js is imported and routes are registered
   ```

3. **Command Not Recognized**
   ```bash
   Response: "This doesn't appear to be a task-related command"
   Solution: Check command examples in documentation
   ```

4. **Network Errors**
   ```bash
   Error: ECONNREFUSED
   Solution: Ensure server is running on correct port
   ```

### Debug Mode

Enable debug logging:
```javascript
// In ai-task-assistant.js
console.log('Command analysis:', commandAnalysis);
console.log('API response:', response.data);
```

### Health Check

```javascript
// Check system health
fetch('/ai/task/status')
  .then(r => r.json())
  .then(data => console.log('System status:', data));
```

## Advanced Features

### Custom Command Templates

```javascript
// Add custom command patterns
const customPatterns = {
  'schedule meeting': 'add|meeting|work',
  'daily standup': 'add|standup|work',
  'grocery shopping': 'add|grocery|personal'
};
```

### Multi-Language Support

```javascript
// Extend for other languages
const languagePatterns = {
  'es': {
    'añadir tarea': 'add task',
    'completar tarea': 'complete task'
  }
};
```

### Voice Integration

```javascript
// Add speech recognition
if ('webkitSpeechRecognition' in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.onresult = (event) => {
    const command = event.results[0][0].transcript;
    sendCommand(command);
  };
}
```

## Monitoring & Analytics

### Usage Tracking

```javascript
// Track command usage
const commandStats = {
  add: 0,
  complete: 0,
  delete: 0,
  list: 0
};

// In ai-task-assistant.js
commandStats[command.action]++;
```

### Performance Monitoring

```javascript
// Track response times
const startTime = Date.now();
// ... process command ...
const responseTime = Date.now() - startTime;
console.log(`Command processed in ${responseTime}ms`);
```

## Security Best Practices

1. **Input Validation**: All inputs are validated
2. **API Key Security**: Store in environment variables
3. **Rate Limiting**: Prevent abuse
4. **CORS Configuration**: Properly configure origins
5. **Error Handling**: Don't expose sensitive information

## Next Steps

1. **Deploy to Production**: Test thoroughly first
2. **Monitor Performance**: Set up logging and metrics
3. **Gather Feedback**: Get user input on command patterns
4. **Extend Features**: Add more task management capabilities
5. **Scale Infrastructure**: Add caching and load balancing

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the test suite output
3. Check server logs for errors
4. Verify API key configuration
5. Test with the example client

Your AI Task Assistant is now fully integrated and ready to provide intelligent task management capabilities!