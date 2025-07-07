# AI Task Assistant - Enhanced Natural Language Task Management

## Overview

The AI Task Assistant is an enhanced AI system that understands and executes natural language task management commands. It integrates with OpenAI's GPT models and the existing task management API to provide intelligent task processing capabilities.

## Features

### 🤖 Natural Language Processing
- Parse complex task commands in natural language
- High accuracy command detection with confidence scoring
- Context-aware responses and feedback

### 📋 Task Management Integration
- Seamless integration with existing task API endpoints
- Support for both work and personal task categories
- Complete CRUD operations through natural language

### 🎯 Smart Command Detection
- Automatically detects task-related commands
- Handles ambiguous inputs gracefully
- Provides helpful error messages and suggestions

### 🔧 API Integration
- RESTful API endpoints for task processing
- Enhanced `/ask-gpt` endpoint with task command handling
- Comprehensive error handling and validation

## Architecture

```
User Input → AI Command Parser → Task API → Response Generator → User
     ↓              ↓               ↓            ↓
Natural Language → JSON Command → API Call → AI Response
```

### Core Components

1. **AITaskAssistant Class** (`ai-task-assistant.js`)
   - Main AI processing engine
   - OpenAI integration for natural language understanding
   - Task API communication layer

2. **AI Task Routes** (`ai-task-routes.js`)
   - Express.js routes for AI task processing
   - API endpoints for different assistant functions

3. **Enhanced Ask-GPT Endpoint** (integrated in `index.js`)
   - Unified endpoint handling both calendar and task queries
   - Automatic task command detection and routing

## API Endpoints

### Main AI Task Processing

#### `POST /ai/task`
Process natural language task commands.

**Request:**
```json
{
  "input": "Add 'Review Q4 reports' to my work tasks"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isTaskCommand": true,
    "commandAnalysis": {
      "action": "add",
      "taskType": "work",
      "taskText": "Review Q4 reports",
      "confidence": 95
    },
    "executionResult": {
      "success": true,
      "message": "Added \"Review Q4 reports\" to your work tasks"
    },
    "aiResponse": "I've successfully added 'Review Q4 reports' to your work task list. You now have X work tasks pending."
  }
}
```

### Command Analysis

#### `POST /ai/task/analyze`
Analyze commands without executing them.

**Request:**
```json
{
  "input": "Mark meeting as complete"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isTaskCommand": true,
    "action": "complete",
    "taskText": "meeting",
    "confidence": 90
  }
}
```

### System Information

#### `GET /ai/task/help`
Get help information about supported commands.

#### `GET /ai/task/status`
Check the status of the AI task system.

### Enhanced Ask-GPT

#### `POST /ask-gpt`
Enhanced endpoint that handles both calendar queries and task commands.

**Request:**
```json
{
  "prompt": "Add 'Prepare presentation' to my work tasks"
}
```

**Response for Task Commands:**
```json
{
  "answer": "I've added 'Prepare presentation' to your work tasks. You now have 3 work tasks pending.",
  "taskCommand": true,
  "executionResult": {
    "success": true,
    "message": "Added \"Prepare presentation\" to your work tasks"
  }
}
```

**Response for Non-Task Queries:**
```json
{
  "answer": "Based on your calendar and current tasks, I recommend...",
  "taskCommand": false
}
```

## Supported Commands

### Adding Tasks
- "Add 'Review Q4 reports' to my work tasks"
- "Create a personal task to buy groceries"
- "Add 'Call client' to work list"

### Completing Tasks
- "Mark 'Call John' as done"
- "Complete the meeting task"
- "Finish the report task"

### Listing Tasks
- "What's on my work task list?"
- "Show me my personal tasks"
- "List all my tasks"

### Editing Tasks
- "Change 'Meeting at 2pm' to 'Meeting at 3pm'"
- "Update the report task to include Q4 data"

### Deleting Tasks
- "Delete the meeting task"
- "Remove 'Call John' from my tasks"

### Status Queries
- "How many tasks do I have?"
- "What's my task status?"
- "Show task completion stats"

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- OpenAI API key
- Existing task management API (already implemented)

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install axios
   ```

2. **Environment Configuration**
   Ensure your `.env` file contains:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Integration**
   The AI assistant is already integrated into the main server file (`index.js`).

### Starting the Server
```bash
npm start
# or
node index.js
```

## Usage Examples

### Basic Task Management
```javascript
// Add a task
const response = await fetch('/ai/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: "Add 'Review quarterly reports' to my work tasks"
  })
});

// List tasks
const response = await fetch('/ai/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: "What are my work tasks?"
  })
});
```

### Using the Enhanced Ask-GPT Endpoint
```javascript
// This will automatically detect and handle task commands
const response = await fetch('/ask-gpt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Add 'Prepare presentation' to my work tasks"
  })
});
```

## Testing

### Running Tests
```bash
# Run all tests
node test-ai-assistant.js

# Run specific test modes
node test-ai-assistant.js interactive  # Interactive mode
node test-ai-assistant.js help        # Test info endpoints
node test-ai-assistant.js analysis    # Test analysis endpoint
node test-ai-assistant.js askgpt      # Test enhanced ask-gpt
```

### Manual Testing
Use the interactive mode to test commands manually:
```bash
node test-ai-assistant.js interactive
```

## Error Handling

The AI assistant includes comprehensive error handling:

- **Invalid Commands**: Provides helpful suggestions
- **API Errors**: Graceful fallback with error messages
- **Network Issues**: Proper error responses
- **OpenAI API Issues**: Fallback to basic responses

## Configuration

### AI Model Settings
The assistant uses `gpt-3.5-turbo` by default with:
- Temperature: 0.1 for command parsing (deterministic)
- Temperature: 0.7 for response generation (creative)
- Max tokens: 150-200 for most responses

### Task Type Detection
- Automatically detects "work" vs "personal" tasks
- Defaults to "personal" if not specified
- Can be overridden with explicit mentions

## Security Considerations

- API key is securely stored in environment variables
- Input validation on all endpoints
- Rate limiting recommended for production use
- CORS enabled for cross-origin requests

## Performance

- Command parsing: ~1-2 seconds
- Task execution: ~0.5-1 second
- Total response time: ~2-3 seconds
- Caching implemented for repeated queries

## Integration Guide

### Adding to Existing Applications

1. **Import the AI Assistant**
   ```javascript
   import AITaskAssistant from './ai-task-assistant.js';
   const aiAssistant = new AITaskAssistant();
   ```

2. **Process User Input**
   ```javascript
   const result = await aiAssistant.processUserInput(userInput);
   if (result.isTaskCommand) {
     // Handle task command
     console.log(result.aiResponse);
   } else {
     // Handle as regular query
   }
   ```

3. **Add Routes to Express App**
   ```javascript
   import aiTaskRouter from './ai-task-routes.js';
   app.use(aiTaskRouter);
   ```

## Troubleshooting

### Common Issues

1. **OpenAI API Key Issues**
   - Ensure `OPENAI_API_KEY` is set in environment
   - Check API key validity and billing status

2. **Task API Connection Issues**
   - Verify task API endpoints are running
   - Check base URL configuration

3. **Command Recognition Issues**
   - Check confidence scores in analysis
   - Verify command patterns match examples

### Debug Mode
Enable debug logging by setting:
```javascript
process.env.DEBUG = 'ai-task-assistant';
```

## Future Enhancements

- Multi-language support
- Voice command integration
- Advanced scheduling capabilities
- Integration with external calendars
- Batch task operations
- Custom command templates

## Contributing

1. Follow existing code patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure error handling is implemented

## License

This project is part of the calendar-backend system and follows the same licensing terms.