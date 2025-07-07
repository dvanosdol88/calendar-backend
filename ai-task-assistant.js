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
     * Finds tasks by text match with enhanced confidence scoring and confirmation
     * @param {string} searchText - Text to search for in task descriptions
     * @param {string} taskType - 'work' or 'personal' (optional)
     * @returns {Object} Result with matches: { found: boolean, matches: Array, ambiguous: boolean, requiresConfirmation: boolean }
     */
    async findTasksByText(searchText, taskType = null) {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tasks`);
            const allTasks = response.data.data;
            
            const searchLower = searchText.toLowerCase().trim();
            const searchWords = searchLower.split(/\s+/).filter(word => word.length > 2);
            
            // Search in specified type or both types
            const typesToSearch = taskType ? [taskType] : ['work', 'personal'];
            
            let matches = [];
            
            for (const type of typesToSearch) {
                const tasks = allTasks[type] || [];
                
                for (const task of tasks) {
                    const taskLower = task.text.toLowerCase().trim();
                    const taskWords = taskLower.split(/\s+/);
                    let confidence = this.calculateMatchConfidence(searchLower, searchWords, taskLower, taskWords);
                    
                    // Debug logging for confidence calculation
                    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MATCHING) {
                        console.log(`🔍 Matching "${searchLower}" against "${taskLower}" - Confidence: ${confidence}%`);
                    }
                    
                    if (confidence > 0) {
                        matches.push({
                            ...task,
                            type,
                            confidence,
                            matchDetails: this.getMatchDetails(searchLower, searchWords, taskLower, taskWords)
                        });
                    }
                }
            }
            
            // Sort by confidence (highest first)
            matches.sort((a, b) => b.confidence - a.confidence);
            
            // Determine if confirmation is needed
            const highestConfidence = matches.length > 0 ? matches[0].confidence : 0;
            const requiresConfirmation = matches.length > 0 && highestConfidence < 90;
            
            return {
                found: matches.length > 0,
                matches,
                ambiguous: matches.length > 1,
                requiresConfirmation,
                highestConfidence
            };
        } catch (error) {
            console.error('Error finding tasks:', error);
            return { found: false, matches: [], ambiguous: false, requiresConfirmation: false };
        }
    }

    /**
     * Calculates match confidence score with strict thresholds
     * @param {string} searchText - Original search text (lowercase)
     * @param {Array} searchWords - Array of search words
     * @param {string} taskText - Task text (lowercase)
     * @param {Array} taskWords - Array of task words
     * @returns {number} Confidence score (0-100)
     */
    calculateMatchConfidence(searchText, searchWords, taskText, taskWords) {
        // Exact match gets 100 points
        if (searchText === taskText) {
            return 100;
        }
        
        // Exact substring match gets 95 points
        if (taskText.includes(searchText)) {
            return 95;
        }
        
        // Check if search text is contained within task text with minor variations
        if (this.isSubstringWithVariations(searchText, taskText)) {
            return 90;
        }
        
        let score = 0;
        const searchWordSet = new Set(searchWords);
        const taskWordSet = new Set(taskWords);
        
        // Calculate word-based scoring
        let exactWordMatches = 0;
        let partialWordMatches = 0;
        
        for (const searchWord of searchWords) {
            let wordFound = false;
            
            // Check for exact word match
            if (taskWordSet.has(searchWord)) {
                exactWordMatches++;
                wordFound = true;
            } else {
                // Check for partial word matches (substring)
                for (const taskWord of taskWords) {
                    if (taskWord.includes(searchWord) || searchWord.includes(taskWord)) {
                        partialWordMatches++;
                        wordFound = true;
                        break;
                    }
                }
            }
        }
        
        // Calculate percentage of search words found
        const wordMatchPercentage = (exactWordMatches + partialWordMatches * 0.7) / searchWords.length;
        
        // All words found gets high score
        if (exactWordMatches === searchWords.length) {
            score = 85;
        } else if (wordMatchPercentage >= 0.8) {
            score = 70;
        } else if (wordMatchPercentage >= 0.6) {
            score = 50;
        } else if (wordMatchPercentage >= 0.4) {
            score = 30;
        } else if (wordMatchPercentage > 0) {
            score = 15;
        }
        
        // Bonus for word order preservation
        if (score > 0 && this.hasPreservedWordOrder(searchWords, taskWords)) {
            score += 10;
        }
        
        // Penalty for significant length difference
        const lengthRatio = Math.min(searchText.length, taskText.length) / Math.max(searchText.length, taskText.length);
        if (lengthRatio < 0.3) {
            score *= 0.8;
        }
        
        return Math.round(score);
    }

    /**
     * Checks if search text is a substring with minor variations (punctuation, etc.)
     */
    isSubstringWithVariations(searchText, taskText) {
        // Remove punctuation and extra spaces for comparison
        const normalizeText = (text) => text.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        const normalizedSearch = normalizeText(searchText);
        const normalizedTask = normalizeText(taskText);
        
        return normalizedTask.includes(normalizedSearch);
    }

    /**
     * Checks if word order is preserved between search and task
     */
    hasPreservedWordOrder(searchWords, taskWords) {
        let searchIndex = 0;
        
        for (const taskWord of taskWords) {
            if (searchIndex < searchWords.length && taskWord.includes(searchWords[searchIndex])) {
                searchIndex++;
            }
        }
        
        return searchIndex === searchWords.length;
    }

    /**
     * Gets detailed match information for debugging/display
     */
    getMatchDetails(searchText, searchWords, taskText, taskWords) {
        const details = {
            exactMatch: searchText === taskText,
            substringMatch: taskText.includes(searchText),
            wordsFound: [],
            wordsNotFound: []
        };
        
        for (const searchWord of searchWords) {
            let found = false;
            for (const taskWord of taskWords) {
                if (taskWord.includes(searchWord) || searchWord.includes(taskWord)) {
                    details.wordsFound.push(searchWord);
                    found = true;
                    break;
                }
            }
            if (!found) {
                details.wordsNotFound.push(searchWord);
            }
        }
        
        return details;
    }

    /**
     * Finds a task by partial text match (backward compatibility)
     * @param {string} searchText - Text to search for in task descriptions
     * @param {string} taskType - 'work' or 'personal' (optional)
     * @returns {Object|null} Found task or null
     */
    async findTaskByText(searchText, taskType = null) {
        const result = await this.findTasksByText(searchText, taskType);
        return result.found ? result.matches[0] : null;
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
     * Marks a task as complete with enhanced confidence checking and confirmation
     */
    async completeTask(taskText, taskType = null) {
        const searchResult = await this.findTasksByText(taskText, taskType);
        
        if (!searchResult.found) {
            return {
                success: false,
                message: `Could not find any task matching "${taskText}". Please check the task text and try again.`
            };
        }

        const bestMatch = searchResult.matches[0];
        const confidence = bestMatch.confidence;
        
        // High confidence (90%+) - proceed automatically
        if (confidence >= 90 && !searchResult.ambiguous) {
            try {
                const response = await axios.patch(`${this.baseUrl}/api/tasks/${bestMatch.type}/${bestMatch.id}/toggle`);
                
                return {
                    success: true,
                    message: `Marked "${bestMatch.text}" as ${response.data.data.completed ? 'completed' : 'incomplete'} (${confidence}% confidence)`,
                    data: response.data.data,
                    confidence
                };
            } catch (error) {
                return {
                    success: false,
                    message: `Failed to update task: ${error.response?.data?.error || error.message}`
                };
            }
        }
        
        // Handle ambiguous matches (multiple high-confidence matches)
        if (searchResult.ambiguous && searchResult.matches.filter(m => m.confidence >= 70).length > 1) {
            const options = searchResult.matches.slice(0, 5).map((task, index) => 
                `${String.fromCharCode(65 + index)}. ${task.text} (${task.type}) - ${task.confidence}% confidence`
            ).join('\n');
            
            return {
                success: false,
                requiresClarification: true,
                message: `Multiple tasks match "${taskText}". Which one would you like to mark as complete?\n\n${options}`,
                matches: searchResult.matches
            };
        }
        
        // Low confidence (<90%) - require confirmation
        if (confidence < 90) {
            return {
                success: false,
                requiresConfirmation: true,
                message: `Found potential match: "${bestMatch.text}" (${bestMatch.type}) with ${confidence}% confidence.\n\nMark this task as complete? [Y/N]`,
                matches: [bestMatch],
                confidence
            };
        }

        // Fallback - single match with good confidence
        const task = searchResult.matches[0];
        
        try {
            const response = await axios.patch(`${this.baseUrl}/api/tasks/${task.type}/${task.id}/toggle`);
            
            return {
                success: true,
                message: `Marked "${task.text}" as ${response.data.data.completed ? 'completed' : 'incomplete'} (${confidence}% confidence)`,
                data: response.data.data,
                confidence
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to update task: ${error.response?.data?.error || error.message}`
            };
        }
    }

    /**
     * Deletes a task with enhanced confidence checking and confirmation
     */
    async deleteTask(taskText, taskType = null) {
        const searchResult = await this.findTasksByText(taskText, taskType);
        
        if (!searchResult.found) {
            return {
                success: false,
                message: `Could not find any task matching "${taskText}". Please check the task text and try again.`
            };
        }

        const bestMatch = searchResult.matches[0];
        const confidence = bestMatch.confidence;
        
        // High confidence (90%+) - proceed automatically
        if (confidence >= 90 && !searchResult.ambiguous) {
            try {
                const response = await axios.delete(`${this.baseUrl}/api/tasks/${bestMatch.type}/${bestMatch.id}`);
                
                return {
                    success: true,
                    message: `Deleted task: "${bestMatch.text}" (${confidence}% confidence)`,
                    data: response.data.data,
                    confidence
                };
            } catch (error) {
                return {
                    success: false,
                    message: `Failed to delete task: ${error.response?.data?.error || error.message}`
                };
            }
        }
        
        // Handle ambiguous matches (multiple high-confidence matches)
        if (searchResult.ambiguous && searchResult.matches.filter(m => m.confidence >= 70).length > 1) {
            const options = searchResult.matches.slice(0, 5).map((task, index) => 
                `${String.fromCharCode(65 + index)}. ${task.text} (${task.type}) - ${task.confidence}% confidence`
            ).join('\n');
            
            return {
                success: false,
                requiresClarification: true,
                message: `Multiple tasks match "${taskText}". Which one would you like to delete?\n\n${options}`,
                matches: searchResult.matches
            };
        }
        
        // Low confidence (<90%) - require confirmation
        if (confidence < 90) {
            return {
                success: false,
                requiresConfirmation: true,
                message: `Found potential match: "${bestMatch.text}" (${bestMatch.type}) with ${confidence}% confidence.\n\nDelete this task? [Y/N]`,
                matches: [bestMatch],
                confidence
            };
        }

        // Fallback - single match with good confidence
        const task = searchResult.matches[0];

        try {
            const response = await axios.delete(`${this.baseUrl}/api/tasks/${task.type}/${task.id}`);
            
            return {
                success: true,
                message: `Deleted task: "${task.text}" (${confidence}% confidence)`,
                data: response.data.data,
                confidence
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to delete task: ${error.response?.data?.error || error.message}`
            };
        }
    }

    /**
     * Edits a task's text with enhanced confidence checking and confirmation
     */
    async editTask(oldText, newText, taskType = null) {
        const searchResult = await this.findTasksByText(oldText, taskType);
        
        if (!searchResult.found) {
            return {
                success: false,
                message: `Could not find any task matching "${oldText}". Please check the task text and try again.`
            };
        }

        const bestMatch = searchResult.matches[0];
        const confidence = bestMatch.confidence;
        
        // High confidence (90%+) - proceed automatically
        if (confidence >= 90 && !searchResult.ambiguous) {
            try {
                const response = await axios.patch(`${this.baseUrl}/api/tasks/${bestMatch.type}/${bestMatch.id}`, {
                    text: newText
                });
                
                return {
                    success: true,
                    message: `Updated task from "${bestMatch.text}" to "${newText}" (${confidence}% confidence)`,
                    data: response.data.data,
                    confidence
                };
            } catch (error) {
                return {
                    success: false,
                    message: `Failed to edit task: ${error.response?.data?.error || error.message}`
                };
            }
        }
        
        // Handle ambiguous matches (multiple high-confidence matches)
        if (searchResult.ambiguous && searchResult.matches.filter(m => m.confidence >= 70).length > 1) {
            const options = searchResult.matches.slice(0, 5).map((task, index) => 
                `${String.fromCharCode(65 + index)}. ${task.text} (${task.type}) - ${task.confidence}% confidence`
            ).join('\n');
            
            return {
                success: false,
                requiresClarification: true,
                message: `Multiple tasks match "${oldText}". Which one would you like to edit?\n\n${options}`,
                matches: searchResult.matches
            };
        }
        
        // Low confidence (<90%) - require confirmation
        if (confidence < 90) {
            return {
                success: false,
                requiresConfirmation: true,
                message: `Found potential match: "${bestMatch.text}" (${bestMatch.type}) with ${confidence}% confidence.\n\nEdit this task to "${newText}"? [Y/N]`,
                matches: [bestMatch],
                confidence
            };
        }

        // Fallback - single match with good confidence
        const task = searchResult.matches[0];

        try {
            const response = await axios.patch(`${this.baseUrl}/api/tasks/${task.type}/${task.id}`, {
                text: newText
            });
            
            return {
                success: true,
                message: `Updated task from "${task.text}" to "${newText}" (${confidence}% confidence)`,
                data: response.data.data,
                confidence
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
     * Handles confirmation responses (Y/N) for low-confidence matches
     * @param {string} confirmationResponse - User's response (Y/N, Yes/No)
     * @param {Array} matches - Array of task matches from previous confirmation request
     * @param {string} originalAction - The original action (complete, delete, edit)
     * @param {string} newText - For edit commands, the new text
     * @returns {Object} Result of the confirmed command
     */
    async handleConfirmationResponse(confirmationResponse, matches, originalAction, newText = null) {
        const response = confirmationResponse.toLowerCase().trim();
        const isYes = ['y', 'yes', 'true', '1', 'confirm'].includes(response);
        const isNo = ['n', 'no', 'false', '0', 'cancel', 'abort'].includes(response);
        
        if (!isYes && !isNo) {
            return {
                success: false,
                message: `Please respond with 'Y' for Yes or 'N' for No. You responded: "${confirmationResponse}"`
            };
        }
        
        if (isNo) {
            return {
                success: false,
                message: 'Task operation cancelled. Please try with a more specific task description.'
            };
        }
        
        // User confirmed - proceed with the action
        const selectedTask = matches[0];
        
        try {
            switch (originalAction) {
                case 'complete':
                    const response = await axios.patch(`${this.baseUrl}/api/tasks/${selectedTask.type}/${selectedTask.id}/toggle`);
                    return {
                        success: true,
                        message: `Confirmed: Marked "${selectedTask.text}" as ${response.data.data.completed ? 'completed' : 'incomplete'}`,
                        data: response.data.data
                    };
                
                case 'delete':
                    await axios.delete(`${this.baseUrl}/api/tasks/${selectedTask.type}/${selectedTask.id}`);
                    return {
                        success: true,
                        message: `Confirmed: Deleted task "${selectedTask.text}"`
                    };
                
                case 'edit':
                    if (!newText) {
                        return {
                            success: false,
                            message: 'New text is required for edit operation'
                        };
                    }
                    const editResponse = await axios.patch(`${this.baseUrl}/api/tasks/${selectedTask.type}/${selectedTask.id}`, {
                        text: newText
                    });
                    return {
                        success: true,
                        message: `Confirmed: Updated task from "${selectedTask.text}" to "${newText}"`,
                        data: editResponse.data.data
                    };
                
                default:
                    return {
                        success: false,
                        message: `Unknown action: ${originalAction}`
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `Failed to ${originalAction} task: ${error.response?.data?.error || error.message}`
            };
        }
    }

    /**
     * Handles clarification responses (A, B, C, etc.)
     * @param {string} clarificationResponse - User's choice (A, B, C, etc.)
     * @param {Array} matches - Array of task matches from previous clarification
     * @param {string} originalAction - The original action (complete, delete, edit)
     * @param {string} newText - For edit commands, the new text
     * @returns {Object} Result of the clarified command
     */
    async handleClarificationResponse(clarificationResponse, matches, originalAction, newText = null) {
        const choice = clarificationResponse.toUpperCase().trim();
        const choiceIndex = choice.charCodeAt(0) - 65; // Convert A=0, B=1, etc.
        
        if (choiceIndex < 0 || choiceIndex >= matches.length) {
            return {
                success: false,
                message: `Invalid choice "${choice}". Please choose from A-${String.fromCharCode(65 + matches.length - 1)}.`
            };
        }
        
        const selectedTask = matches[choiceIndex];
        
        try {
            switch (originalAction) {
                case 'complete':
                    const response = await axios.patch(`${this.baseUrl}/api/tasks/${selectedTask.type}/${selectedTask.id}/toggle`);
                    return {
                        success: true,
                        message: `Marked "${selectedTask.text}" as ${response.data.data.completed ? 'completed' : 'incomplete'}`,
                        data: response.data.data
                    };
                
                case 'delete':
                    await axios.delete(`${this.baseUrl}/api/tasks/${selectedTask.type}/${selectedTask.id}`);
                    return {
                        success: true,
                        message: `Deleted task: "${selectedTask.text}"`
                    };
                
                case 'edit':
                    if (!newText) {
                        return {
                            success: false,
                            message: 'New text is required for edit operation'
                        };
                    }
                    const editResponse = await axios.patch(`${this.baseUrl}/api/tasks/${selectedTask.type}/${selectedTask.id}`, {
                        text: newText
                    });
                    return {
                        success: true,
                        message: `Updated task from "${selectedTask.text}" to "${newText}"`,
                        data: editResponse.data.data
                    };
                
                default:
                    return {
                        success: false,
                        message: `Unknown action: ${originalAction}`
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `Failed to ${originalAction} task: ${error.response?.data?.error || error.message}`
            };
        }
    }

    /**
     * Processes user input and returns an AI-enhanced response
     * @param {string} userInput - The user's natural language input
     * @param {Object} clarificationContext - Optional context from previous clarification
     * @returns {Object} AI response with task execution results
     */
    async processUserInput(userInput, clarificationContext = null) {
        // Handle clarification/confirmation responses
        if (clarificationContext) {
            let result;
            
            // Check if this is a confirmation response (Y/N) or clarification response (A/B/C)
            const isConfirmationResponse = clarificationContext.requiresConfirmation ||
                /^[yn]$/i.test(userInput.trim()) ||
                /^(yes|no|true|false|confirm|cancel|abort)$/i.test(userInput.trim());
            
            if (isConfirmationResponse) {
                result = await this.handleConfirmationResponse(
                    userInput,
                    clarificationContext.matches,
                    clarificationContext.action,
                    clarificationContext.newText
                );
            } else {
                result = await this.handleClarificationResponse(
                    userInput,
                    clarificationContext.matches,
                    clarificationContext.action,
                    clarificationContext.newText
                );
            }
            
            const currentTasks = await this.getCurrentTasks();
            const contextualResponse = await this.generateContextualResponse(
                userInput,
                { action: clarificationContext.action },
                result,
                currentTasks
            );
            
            return {
                isTaskCommand: true,
                commandAnalysis: { action: clarificationContext.action },
                executionResult: result,
                aiResponse: contextualResponse
            };
        }

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
        
        IMPORTANT CAPABILITY RESTRICTIONS:
        - You CAN: manage tasks (add, complete, delete, edit, list), provide conversation context, answer questions
        - You CANNOT: access calendars, send emails, create files, make phone calls, send notifications, access external APIs
        - NEVER claim to have done something you cannot actually do
        - Be honest about your limitations and suggest task-based alternatives
        
        Keep responses concise but helpful. Include relevant context about the user's task list when appropriate.
        
        Current tasks context:
        ${currentTasks}`;

        const userPrompt = `User said: "${userInput}"
        
        Command executed: ${command.action}
        Result: ${JSON.stringify(result)}
        
        Provide a friendly, honest response about what happened. Do not claim capabilities you don't have.`;

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