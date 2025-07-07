import express from 'express';
import AITaskAssistant from './ai-task-assistant.js';

const router = express.Router();

/**
 * AI Task Routes
 * 
 * Provides endpoints for natural language task management using AI.
 * Integrates with the existing task API to provide intelligent task processing.
 */

// Initialize the AI assistant
const aiAssistant = new AITaskAssistant();

/**
 * POST /ai/task
 * 
 * Main endpoint for natural language task processing
 * Accepts user input and returns AI-powered task management responses
 */
router.post('/ai/task', async (req, res) => {
    try {
        const { input } = req.body;
        
        if (!input || typeof input !== 'string' || !input.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Input text is required'
            });
        }

        // Process the user input with AI
        const result = await aiAssistant.processUserInput(input.trim());
        
        // Return structured response
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error in AI task processing:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process task command',
            message: error.message
        });
    }
});

/**
 * POST /ai/task/analyze
 * 
 * Endpoint to analyze text without executing commands
 * Useful for testing command parsing
 */
router.post('/ai/task/analyze', async (req, res) => {
    try {
        const { input } = req.body;
        
        if (!input || typeof input !== 'string' || !input.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Input text is required'
            });
        }

        // Analyze the command without executing it
        const analysis = await aiAssistant.analyzeTaskCommand(input.trim());
        
        res.json({
            success: true,
            data: analysis,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error analyzing task command:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze command',
            message: error.message
        });
    }
});

/**
 * GET /ai/task/help
 * 
 * Returns help information about supported task commands
 */
router.get('/ai/task/help', (req, res) => {
    const helpInfo = {
        success: true,
        data: {
            description: "AI Task Assistant - Natural Language Task Management",
            supportedCommands: [
                {
                    action: "add",
                    examples: [
                        "Add 'Review Q4 reports' to my work tasks",
                        "Create a personal task to buy groceries",
                        "Add 'Call client' to work list"
                    ]
                },
                {
                    action: "complete",
                    examples: [
                        "Mark 'Call John' as done",
                        "Complete the meeting task",
                        "Finish the report task"
                    ]
                },
                {
                    action: "delete",
                    examples: [
                        "Delete the meeting task",
                        "Remove 'Call John' from my tasks",
                        "Delete the grocery task"
                    ]
                },
                {
                    action: "edit",
                    examples: [
                        "Change 'Meeting at 2pm' to 'Meeting at 3pm'",
                        "Update the report task to include Q4 data",
                        "Edit the call task to specify the client name"
                    ]
                },
                {
                    action: "list",
                    examples: [
                        "What's on my work task list?",
                        "Show me my personal tasks",
                        "List all my tasks"
                    ]
                },
                {
                    action: "status",
                    examples: [
                        "How many tasks do I have?",
                        "What's my task status?",
                        "Show task completion stats"
                    ]
                }
            ],
            usage: {
                endpoint: "POST /ai/task",
                body: {
                    input: "Your natural language task command"
                }
            }
        },
        timestamp: new Date().toISOString()
    };
    
    res.json(helpInfo);
});

/**
 * GET /ai/task/status
 * 
 * Get current status of the AI task system
 */
router.get('/ai/task/status', async (req, res) => {
    try {
        // Test the AI assistant functionality
        const testAnalysis = await aiAssistant.analyzeTaskCommand("Add test task");
        const hasOpenAI = !!process.env.OPENAI_API_KEY;
        
        res.json({
            success: true,
            data: {
                status: "operational",
                openaiConfigured: hasOpenAI,
                testAnalysis: testAnalysis.isTaskCommand,
                baseUrl: aiAssistant.baseUrl,
                features: [
                    "Natural language parsing",
                    "Task command execution",
                    "Contextual responses",
                    "Error handling"
                ]
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error checking AI task status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check system status',
            message: error.message
        });
    }
});

export default router;