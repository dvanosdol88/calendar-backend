import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Enhanced AI Task Assistant
 * 
 * This module provides natural language processing capabilities for task management.
 * It can understand various task-related commands and execute them via the task API.
 * 
 * Features:
 * - Natural language parsing for task commands
 * - Integration with existing task API endpoints
 * - Smart command detection and routing
 * - Error handling and user feedback
 * - Context-aware responses
 */

class AITaskAssistant {
    constructor(baseUrl = 'http://localhost:3000') {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.baseUrl = baseUrl;
    }

    /**
     * Analyzes user input to determine if it's a task-related command
     * @param {string} userInput - The user's natural language input
     * @returns {Object} Analysis result with command type and parameters
     */
    async analyzeTaskCommand(userInput) {
        const systemPrompt = `You are a task management command parser. Analyze the user input and determine if it's a task-related command.

Response format (JSON only):
{
  "isTaskCommand": boolean,
  "action": "add|complete|delete|edit|list|status",
  "taskType": "work|personal",
  "taskText": "text content",
  "taskId": "id if editing/deleting specific task",
  "confidence": 0-100
}

Task command examples:
- "Add 'Review Q4 reports' to my work tasks" → {"isTaskCommand": true, "action": "add", "taskType": "work", "taskText": "Review Q4 reports", "confidence": 95}
- "Mark 'Call John' as done" → {"isTaskCommand": true, "action": "complete", "taskText": "Call John", "confidence": 90}
- "What's on my work task list?" → {"isTaskCommand": true, "action": "list", "taskType": "work", "confidence": 95}
- "Delete the meeting task" → {"isTaskCommand": true, "action": "delete", "taskText": "meeting", "confidence": 85}
- "Change 'Meeting at 2pm' to 'Meeting at 3pm'" → {"isTaskCommand": true, "action": "edit", "taskText": "Meeting at 3pm", "confidence": 90}

If not a task command, return: {"isTaskCommand": false, "confidence": 0}`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                temperature: 0.1,
                max_tokens: 200
            });

            const response = completion.choices[0].message.content.trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error analyzing task command:', error);
            return { isTaskCommand: false, confidence: 0 };
        }
    }

    /**
     * Fetches current tasks from the API
     * @returns {Object} Current tasks formatted for AI context
     */
    async getCurrentTasks() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tasks-for-ai`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching current tasks:', error);
            return 'Unable to fetch current tasks';
        }
    }

    /**
     * Finds a task by partial text match
     * @param {string} searchText - Text to search for in task descriptions
     * @param {string} taskType - 'work' or 'personal' (optional)
     * @returns {Object|null} Found task or null
     */
    async findTaskByText(searchText, taskType = null) {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tasks`);
            const allTasks = response.data.data;
            
            const searchLower = searchText.toLowerCase();
            
            // Search in specified type or both types
            const typesToSearch = taskType ? [taskType] : ['work', 'personal'];
            
            for (const type of typesToSearch) {
                const tasks = allTasks[type] || [];
                const found = tasks.find(task => 
                    task.text.toLowerCase().includes(searchLower)
                );
                
                if (found) {
                    return { ...found, type };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error finding task:', error);
            return null;
        }
    }

    /**
     * Executes a task command via the appropriate API endpoint
     * @param {Object} command - Parsed command object
     * @returns {Object} Result of the command execution
     */
    async executeTaskCommand(command) {
        try {
            switch (command.action) {
                case 'add':
                    return await this.addTask(command.taskType, command.taskText);
                
                case 'complete':
                    return await this.completeTask(command.taskText, command.taskType);
                
                case 'delete':
                    return await this.deleteTask(command.taskText, command.taskType);
                
                case 'edit':
                    return await this.editTask(command.taskText, command.newText, command.taskType);
                
                case 'list':
                    return await this.listTasks(command.taskType);
                
                case 'status':
                    return await this.getTaskStatus();
                
                default:
                    return {
                        success: false,
                        message: `Unknown command action: ${command.action}`
                    };
            }
        } catch (error) {
            console.error('Error executing task command:', error);
            return {
                success: false,
                message: 'Failed to execute task command',
                error: error.message
            };
        }
    }

    /**
     * Adds a new task
     */
    async addTask(taskType, taskText) {
        const type = taskType || 'personal'; // Default to personal if not specified
        
        try {
            const response = await axios.post(`${this.baseUrl}/api/tasks/${type}`, {
                text: taskText
            });
            
            return {
                success: true,
                message: `Added "${taskText}" to your ${type} tasks`,
                data: response.data.data
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to add task: ${error.response?.data?.error || error.message}`
            };
        }
    }

    /**
     * Marks a task as complete
     */
    async completeTask(taskText, taskType = null) {
        const task = await this.findTaskByText(taskText, taskType);
        
        if (!task) {
            return {
                success: false,
                message: `Could not find task containing "${taskText}"`
            };
        }

        try {
            const response = await axios.patch(`${this.baseUrl}/api/tasks/${task.type}/${task.id}/toggle`);
            
            return {
                success: true,
                message: `Marked "${task.text}" as ${response.data.data.completed ? 'completed' : 'incomplete'}`,
                data: response.data.data
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to update task: ${error.response?.data?.error || error.message}`
            };
        }
    }

    /**
     * Deletes a task
     */
    async deleteTask(taskText, taskType = null) {
        const task = await this.findTaskByText(taskText, taskType);
        
        if (!task) {
            return {
                success: false,
                message: `Could not find task containing "${taskText}"`
            };
        }

        try {
            const response = await axios.delete(`${this.baseUrl}/api/tasks/${task.type}/${task.id}`);
            
            return {
                success: true,
                message: `Deleted task: "${task.text}"`,
                data: response.data.data
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to delete task: ${error.response?.data?.error || error.message}`
            };
        }
    }

    /**
     * Edits a task's text
     */
    async editTask(oldText, newText, taskType = null) {
        const task = await this.findTaskByText(oldText, taskType);
        
        if (!task) {
            return {
                success: false,
                message: `Could not find task containing "${oldText}"`
            };
        }

        try {
            const response = await axios.patch(`${this.baseUrl}/api/tasks/${task.type}/${task.id}`, {
                text: newText
            });
            
            return {
                success: true,
                message: `Updated task from "${oldText}" to "${newText}"`,
                data: response.data.data
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to edit task: ${error.response?.data?.error || error.message}`
            };
        }
    }

    /**
     * Lists tasks of a specific type or all tasks
     */
    async listTasks(taskType = null) {
        try {
            const endpoint = taskType ? `/api/tasks/${taskType}` : '/api/tasks';
            const response = await axios.get(`${this.baseUrl}${endpoint}`);
            
            return {
                success: true,
                message: taskType ? `Your ${taskType} tasks:` : 'All your tasks:',
                data: response.data.data
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to fetch tasks: ${error.response?.data?.error || error.message}`
            };
        }
    }

    /**
     * Gets overall task status
     */
    async getTaskStatus() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tasks`);
            const tasks = response.data.data;
            
            const workTasks = tasks.work || [];
            const personalTasks = tasks.personal || [];
            
            const workCompleted = workTasks.filter(t => t.completed).length;
            const personalCompleted = personalTasks.filter(t => t.completed).length;
            
            return {
                success: true,
                message: `Task Status: Work (${workCompleted}/${workTasks.length} completed), Personal (${personalCompleted}/${personalTasks.length} completed)`,
                data: {
                    work: { total: workTasks.length, completed: workCompleted },
                    personal: { total: personalTasks.length, completed: personalCompleted }
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to get task status: ${error.response?.data?.error || error.message}`
            };
        }
    }

    /**
     * Processes user input and returns an AI-enhanced response
     * @param {string} userInput - The user's natural language input
     * @returns {Object} AI response with task execution results
     */
    async processUserInput(userInput) {
        // First, analyze if this is a task command
        const commandAnalysis = await this.analyzeTaskCommand(userInput);
        
        if (!commandAnalysis.isTaskCommand || commandAnalysis.confidence < 70) {
            return {
                isTaskCommand: false,
                message: "This doesn't appear to be a task-related command. Try commands like 'Add task to work list', 'Mark task as done', or 'What are my tasks?'"
            };
        }

        // Execute the task command
        const result = await this.executeTaskCommand(commandAnalysis);
        
        // Get current tasks for context
        const currentTasks = await this.getCurrentTasks();
        
        // Generate a contextual AI response
        const contextualResponse = await this.generateContextualResponse(
            userInput,
            commandAnalysis,
            result,
            currentTasks
        );

        return {
            isTaskCommand: true,
            commandAnalysis,
            executionResult: result,
            aiResponse: contextualResponse
        };
    }

    /**
     * Generates a contextual AI response based on the command execution
     */
    async generateContextualResponse(userInput, command, result, currentTasks) {
        const systemPrompt = `You are a helpful task management assistant. 
        Provide a friendly, conversational response about the task operation that was just performed.
        
        Keep responses concise but helpful. Include relevant context about the user's task list when appropriate.
        
        Current tasks context:
        ${currentTasks}`;

        const userPrompt = `User said: "${userInput}"
        
        Command executed: ${command.action}
        Result: ${JSON.stringify(result)}
        
        Provide a friendly response about what happened.`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 150
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error generating contextual response:', error);
            return result.message || 'Task operation completed.';
        }
    }
}

export default AITaskAssistant;