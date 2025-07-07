/**
 * Enhanced AI Assistant
 * Integrates all the improved systems to fix critical issues
 */

import EnhancedTaskMatching from './enhanced-task-matching.js';
import GoogleCalendarIntegration from './google-calendar-integration.js';
import AntiHallucinationSafeguards from './anti-hallucination-safeguards.js';
import ListManagementSystem from './list-management-system.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class EnhancedAIAssistant {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Initialize all systems
        this.taskMatcher = new EnhancedTaskMatching(baseUrl);
        this.calendarIntegration = new GoogleCalendarIntegration();
        this.safeguards = new AntiHallucinationSafeguards();
        this.listManager = new ListManagementSystem(baseUrl);
        
        // Set calendar availability in safeguards
        this.safeguards.setCalendarIntegration(this.calendarIntegration.isCalendarAvailable());
    }

    /**
     * Main entry point for processing user input
     */
    async processUserInput(userInput, clarificationContext = null) {
        try {
            // Handle clarification responses first
            if (clarificationContext) {
                return await this.handleClarificationResponse(userInput, clarificationContext);
            }

            // Determine the type of command
            const commandType = await this.classifyCommand(userInput);
            
            let result;
            switch (commandType.type) {
                case 'task':
                    result = await this.processTaskCommand(userInput);
                    break;
                    
                case 'calendar':
                    result = await this.processCalendarCommand(userInput);
                    break;
                    
                case 'list':
                    result = await this.processListCommand(userInput);
                    break;
                    
                case 'general':
                    result = await this.processGeneralCommand(userInput);
                    break;
                    
                default:
                    result = {
                        success: false,
                        message: "I'm not sure how to help with that. I can assist with tasks, calendar events, and list management."
                    };
            }
            
            // Validate response against hallucination safeguards
            if (result.success && result.message) {
                const validation = await this.safeguards.validateResponse(
                    userInput, 
                    result.message,
                    commandType.type
                );
                
                if (!validation.isValid) {
                    result.message = validation.response;
                    result.warnings = validation.warnings;
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('Error processing user input:', error);
            return {
                success: false,
                message: 'I encountered an error processing your request. Please try again.'
            };
        }
    }

    /**
     * Classify the type of command
     */
    async classifyCommand(userInput) {
        const systemPrompt = `You are a command classifier. Determine what type of command this is.

        COMMAND TYPES:
        - task: Task management (add, complete, delete, edit tasks)
        - calendar: Calendar operations (add events, check schedule)
        - list: List management (grocery lists, todo lists with sub-items)
        - general: General conversation or questions

        Examples:
        - "Mark client review as done" → task
        - "Add meeting tomorrow at 2pm" → calendar
        - "Remove Greek yogurt from grocery list" → list
        - "How are you?" → general

        Response format (JSON only):
        {
            "type": "task|calendar|list|general",
            "confidence": 0-100,
            "reasoning": "explanation"
        }`;

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
            console.error('Error classifying command:', error);
            return { type: 'general', confidence: 0 };
        }
    }

    /**
     * Process task management commands
     */
    async processTaskCommand(userInput) {
        // Use enhanced task matching
        const commandAnalysis = await this.taskMatcher.analyzeTaskCommand(userInput);
        
        if (!commandAnalysis.isTaskCommand || commandAnalysis.confidence < 90) {
            return {
                success: false,
                isTaskCommand: false,
                message: "This doesn't appear to be a clear task management command. Please be more specific about what you'd like to do with your tasks."
            };
        }

        // Execute the task command with enhanced matching
        const result = await this.executeEnhancedTaskCommand(commandAnalysis, userInput);
        
        // Generate contextual AI response
        const aiResponse = await this.generateTaskResponse(userInput, commandAnalysis, result);
        
        return {
            success: result.success,
            isTaskCommand: true,
            commandAnalysis,
            executionResult: result,
            message: aiResponse,
            requiresClarification: result.requiresClarification,
            clarificationContext: result.requiresClarification ? {
                type: 'task',
                action: commandAnalysis.action,
                matches: result.matches,
                newText: commandAnalysis.newText || commandAnalysis.taskText
            } : null
        };
    }

    /**
     * Execute task command with enhanced matching
     */
    async executeEnhancedTaskCommand(command, userInput) {
        try {
            switch (command.action) {
                case 'complete':
                    return await this.completeTaskWithValidation(command, userInput);
                    
                case 'add':
                    return await this.addTask(command.taskType, command.taskText);
                    
                case 'delete':
                    return await this.deleteTaskWithValidation(command, userInput);
                    
                case 'edit':
                    return await this.editTaskWithValidation(command, userInput);
                    
                case 'list':
                    return await this.listTasks(command.taskType);
                    
                case 'status':
                    return await this.getTaskStatus();
                    
                default:
                    return {
                        success: false,
                        message: `Unknown task action: ${command.action}`
                    };
            }
        } catch (error) {
            console.error('Error executing enhanced task command:', error);
            return {
                success: false,
                message: 'Failed to execute task command'
            };
        }
    }

    /**
     * Complete task with validation and confirmation
     */
    async completeTaskWithValidation(command, userInput) {
        const matchResult = await this.taskMatcher.findTasksWithConfirmation(
            command.taskText, 
            command.taskType
        );
        
        if (!matchResult.found) {
            return {
                success: false,
                message: matchResult.message
            };
        }
        
        if (matchResult.requiresConfirmation) {
            // Show confirmation with match details
            const confirmationMessage = this.taskMatcher.generateConfirmationMessage(matchResult);
            
            return {
                success: false,
                requiresClarification: true,
                message: confirmationMessage,
                matches: matchResult.matches
            };
        }
        
        // Single confirmed match - validate before completing
        const task = matchResult.matches[0];
        const validation = await this.taskMatcher.validateTaskCompletion(task.id, userInput);
        
        if (!validation.valid) {
            return {
                success: false,
                message: `Task validation failed: ${validation.reasoning}. Please confirm this is the correct task.`,
                requiresConfirmation: true,
                matches: [task]
            };
        }
        
        // Complete the task
        return await this.completeTask(task);
    }

    /**
     * Process calendar commands
     */
    async processCalendarCommand(userInput) {
        const result = await this.calendarIntegration.processCalendarCommand(userInput);
        
        if (!result.success && !result.isCalendarCommand) {
            return {
                success: false,
                message: result.message
            };
        }
        
        // Generate user-friendly response
        const aiResponse = await this.calendarIntegration.generateCalendarResponse(userInput, result);
        
        return {
            success: result.success,
            isCalendarCommand: true,
            calendarResult: result,
            message: aiResponse
        };
    }

    /**
     * Process list management commands
     */
    async processListCommand(userInput) {
        const result = await this.listManager.processListCommand(userInput);
        
        if (!result.success && !result.isListCommand) {
            return {
                success: false,
                message: result.message
            };
        }
        
        // Generate user-friendly response
        const aiResponse = await this.generateListResponse(userInput, result);
        
        return {
            success: result.success,
            isListCommand: true,
            listResult: result,
            message: aiResponse,
            requiresClarification: result.requiresClarification,
            clarificationContext: result.requiresClarification ? {
                type: 'list',
                matches: result.matches,
                originalCommand: userInput
            } : null
        };
    }

    /**
     * Process general conversation
     */
    async processGeneralCommand(userInput) {
        const systemPrompt = `You are a helpful AI assistant focused on task management, calendar, and list organization.
        
        Keep responses concise and helpful. If the user asks about capabilities, be honest about what you can and cannot do.
        
        Available capabilities:
        - Task management (add, complete, delete, edit tasks)
        - List management (grocery lists, todo lists with sub-items)
        ${this.calendarIntegration.isCalendarAvailable() ? '- Calendar integration (add events, check schedule)' : ''}
        
        NOT available:
        - Email sending
        - File system access
        - Web browsing
        - External API calls`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                temperature: 0.7,
                max_tokens: 200
            });

            const response = completion.choices[0].message.content.trim();
            
            return {
                success: true,
                message: response,
                isGeneral: true
            };
        } catch (error) {
            console.error('Error processing general command:', error);
            return {
                success: false,
                message: 'I encountered an error. Please try again.'
            };
        }
    }

    /**
     * Handle clarification responses
     */
    async handleClarificationResponse(userInput, clarificationContext) {
        try {
            switch (clarificationContext.type) {
                case 'task':
                    return await this.handleTaskClarification(userInput, clarificationContext);
                    
                case 'list':
                    return await this.handleListClarification(userInput, clarificationContext);
                    
                default:
                    return {
                        success: false,
                        message: 'Unknown clarification type'
                    };
            }
        } catch (error) {
            console.error('Error handling clarification:', error);
            return {
                success: false,
                message: 'Failed to process clarification response'
            };
        }
    }

    /**
     * Handle task clarification
     */
    async handleTaskClarification(userInput, clarificationContext) {
        const choice = userInput.toUpperCase().trim();
        const choiceIndex = choice.charCodeAt(0) - 65; // Convert A=0, B=1, etc.
        
        if (choiceIndex < 0 || choiceIndex >= clarificationContext.matches.length) {
            return {
                success: false,
                message: `Invalid choice "${choice}". Please choose from A-${String.fromCharCode(65 + clarificationContext.matches.length - 1)}.`
            };
        }
        
        const selectedTask = clarificationContext.matches[choiceIndex];
        
        // Execute the action on the selected task
        switch (clarificationContext.action) {
            case 'complete':
                const result = await this.completeTask(selectedTask);
                return {
                    success: result.success,
                    message: result.message,
                    executionResult: result
                };
                
            case 'delete':
                return await this.deleteTask(selectedTask);
                
            case 'edit':
                return await this.editTask(selectedTask, clarificationContext.newText);
                
            default:
                return {
                    success: false,
                    message: `Unknown action: ${clarificationContext.action}`
                };
        }
    }

    /**
     * Generate task response
     */
    async generateTaskResponse(userInput, command, result) {
        const systemPrompt = `You are a helpful task management assistant. 
        Generate a friendly, conversational response about the task operation.
        
        Keep responses concise but informative. Include relevant details about what was accomplished.`;

        const userPrompt = `User said: "${userInput}"
        
        Command: ${command.action}
        Result: ${JSON.stringify(result)}
        
        Generate a friendly response about what happened.`;

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
            console.error('Error generating task response:', error);
            return result.message || 'Task operation completed.';
        }
    }

    /**
     * Generate list response
     */
    async generateListResponse(userInput, result) {
        const systemPrompt = `You are a helpful list management assistant. 
        Generate a friendly, conversational response about the list operation.
        
        Keep responses concise but informative.`;

        const userPrompt = `User said: "${userInput}"
        
        List operation result: ${JSON.stringify(result)}
        
        Generate a friendly response about what happened.`;

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
            console.error('Error generating list response:', error);
            return result.message || 'List operation completed.';
        }
    }

    /**
     * Helper methods for task operations
     */
    async completeTask(task) {
        // Implementation would call the existing task API
        // This is a placeholder for the actual implementation
        return {
            success: true,
            message: `Marked "${task.text}" as completed`
        };
    }

    async addTask(taskType, taskText) {
        // Implementation would call the existing task API
        return {
            success: true,
            message: `Added "${taskText}" to your ${taskType} tasks`
        };
    }

    async deleteTask(task) {
        // Implementation would call the existing task API
        return {
            success: true,
            message: `Deleted task: "${task.text}"`
        };
    }

    async editTask(task, newText) {
        // Implementation would call the existing task API
        return {
            success: true,
            message: `Updated task from "${task.text}" to "${newText}"`
        };
    }

    async listTasks(taskType) {
        // Implementation would call the existing task API
        return {
            success: true,
            message: `Retrieved ${taskType} tasks`
        };
    }

    async getTaskStatus() {
        // Implementation would call the existing task API
        return {
            success: true,
            message: 'Retrieved task status'
        };
    }

    /**
     * Get system capabilities
     */
    getCapabilities() {
        return this.safeguards.getAvailableCapabilities();
    }

    /**
     * Get system status
     */
    getSystemStatus() {
        return {
            taskMatching: 'enhanced',
            calendarIntegration: this.calendarIntegration.isCalendarAvailable(),
            listManagement: 'available',
            safeguards: 'active',
            capabilities: this.safeguards.getCapabilityStatus()
        };
    }
}

export default EnhancedAIAssistant;