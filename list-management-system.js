/**
 * List Management System
 * Handles sub-items within tasks (grocery lists, etc.)
 */

import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class ListManagementSystem {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    /**
     * Enhanced task structure with sub-items
     */
    createTaskWithSubItems(taskText, subItems = []) {
        return {
            id: this.generateId(),
            text: taskText,
            completed: false,
            subItems: subItems.map(item => ({
                id: this.generateId(),
                text: item,
                completed: false,
                addedAt: new Date().toISOString()
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Generate unique ID for tasks and sub-items
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Parse list management commands
     */
    async parseListCommand(userInput) {
        const systemPrompt = `You are a list management command parser. Analyze the user input to determine if it's a list management command.

        VALID LIST COMMANDS:
        - "Add apples to grocery list"
        - "Remove Greek yogurt from shopping list"
        - "Mark milk as done in grocery list"
        - "Add 'Call John' to work todo list"
        - "Create grocery list with milk, bread, eggs"
        - "Show me my grocery list"
        - "Please delete greek yogurt from the grocery list and add apples"

        COMMAND TYPES:
        - add_item: Add new item to existing list
        - remove_item: Remove item from list
        - toggle_item: Mark item as done/undone
        - create_list: Create new list with items
        - show_list: Display list contents
        - modify_list: Multiple operations in one command (remove + add, etc.)

        Response format (JSON only):
        {
            "isListCommand": boolean,
            "action": "add_item|remove_item|toggle_item|create_list|show_list|modify_list",
            "listType": "grocery|shopping|todo|work|personal",
            "listName": "name of the list",
            "itemText": "text of the item",
            "items": ["array", "of", "items"],
            "operations": [{"action": "remove_item", "itemText": "item to remove"}, {"action": "add_item", "itemText": "item to add"}],
            "confidence": 0-100,
            "reasoning": "explanation of classification"
        }

        IMPORTANT: For compound commands like "delete X and add Y", use action="modify_list" and include operations array.`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                temperature: 0.1,
                max_tokens: 300
            });

            const response = completion.choices[0].message.content.trim();
            const analysis = JSON.parse(response);
            
            return analysis;
        } catch (error) {
            console.error('Error parsing list command:', error);
            return { 
                isListCommand: false, 
                confidence: 0,
                reasoning: "Failed to parse list command"
            };
        }
    }

    /**
     * Find tasks that contain lists
     */
    async findListTasks(listType, listName) {
        try {
            console.log(`🔍 Finding list tasks with listType: "${listType}", listName: "${listName}"`);
            
            const response = await axios.get(`${this.baseUrl}/api/tasks`);
            const allTasks = response.data.data;
            
            let matches = [];
            
            // Search through all task types
            for (const [taskType, tasks] of Object.entries(allTasks)) {
                for (const task of tasks) {
                    console.log(`Checking task: "${task.text}" against listType: "${listType}"`);
                    
                    // Check if task text matches list criteria
                    if (this.isListTask(task.text, listType, listName)) {
                        console.log(`✅ Match found: "${task.text}"`);
                        matches.push({
                            ...task,
                            taskType,
                            subItems: task.subItems || []
                        });
                    }
                }
            }
            
            console.log(`🎯 Found ${matches.length} matching list tasks`);
            return matches;
        } catch (error) {
            console.error('Error finding list tasks:', error);
            return [];
        }
    }

    /**
     * Check if a task is a list task
     */
    isListTask(taskText, listType, listName) {
        if (!taskText) return false;
        
        const taskLower = taskText.toLowerCase();
        
        // Common list keywords
        const listKeywords = {
            grocery: ['grocery', 'groceries', 'shopping', 'food', 'buy'],
            shopping: ['shopping', 'buy', 'purchase', 'store'],
            todo: ['todo', 'to-do', 'tasks', 'checklist'],
            work: ['work', 'office', 'business', 'project'],
            personal: ['personal', 'home', 'family']
        };
        
        // Check for list type keywords
        if (listType && listKeywords[listType]) {
            return listKeywords[listType].some(keyword => 
                taskLower.includes(keyword)
            );
        }
        
        // Check for specific list name
        if (listName && taskLower.includes(listName.toLowerCase())) {
            return true;
        }
        
        // Check for general list indicators
        return taskLower.includes('list') || 
               taskLower.includes('buy') || 
               taskLower.includes('get') ||
               taskLower.includes('shopping');
    }

    /**
     * Add item to existing list
     */
    async addItemToList(listTask, itemText) {
        try {
            // Ensure subItems array exists
            if (!listTask.subItems) {
                listTask.subItems = [];
            }
            
            // Add new item
            const newItem = {
                id: this.generateId(),
                text: itemText,
                completed: false,
                addedAt: new Date().toISOString()
            };
            
            listTask.subItems.push(newItem);
            
            // Update the task
            const response = await axios.patch(
                `${this.baseUrl}/api/tasks/${listTask.taskType}/${listTask.id}`,
                { 
                    text: listTask.text,
                    subItems: listTask.subItems 
                }
            );
            
            return {
                success: true,
                message: `Added "${itemText}" to ${listTask.text}`,
                task: response.data.data,
                addedItem: newItem
            };
        } catch (error) {
            console.error('Error adding item to list:', error);
            return {
                success: false,
                message: `Failed to add item to list: ${error.message}`
            };
        }
    }

    /**
     * Remove item from list
     */
    async removeItemFromList(listTask, itemText) {
        try {
            if (!listTask.subItems || listTask.subItems.length === 0) {
                return {
                    success: false,
                    message: `No items found in ${listTask.text}`
                };
            }
            
            // Find items to remove (partial match)
            const itemsToRemove = listTask.subItems.filter(item =>
                item.text.toLowerCase().includes(itemText.toLowerCase())
            );
            
            if (itemsToRemove.length === 0) {
                return {
                    success: false,
                    message: `Item "${itemText}" not found in ${listTask.text}`
                };
            }
            
            if (itemsToRemove.length > 1) {
                // Multiple matches - ask for clarification
                const options = itemsToRemove.map((item, index) => 
                    `${String.fromCharCode(65 + index)}. ${item.text}`
                ).join('\n');
                
                return {
                    success: false,
                    requiresClarification: true,
                    message: `Multiple items match "${itemText}". Which one would you like to remove?\n\n${options}`,
                    matches: itemsToRemove
                };
            }
            
            // Remove the item
            const itemToRemove = itemsToRemove[0];
            listTask.subItems = listTask.subItems.filter(item => 
                item.id !== itemToRemove.id
            );
            
            // Update the task
            const response = await axios.patch(
                `${this.baseUrl}/api/tasks/${listTask.taskType}/${listTask.id}`,
                { 
                    text: listTask.text,
                    subItems: listTask.subItems 
                }
            );
            
            return {
                success: true,
                message: `Removed "${itemToRemove.text}" from ${listTask.text}`,
                task: response.data.data,
                removedItem: itemToRemove
            };
        } catch (error) {
            console.error('Error removing item from list:', error);
            return {
                success: false,
                message: `Failed to remove item from list: ${error.message}`
            };
        }
    }

    /**
     * Toggle item completion status
     */
    async toggleItemInList(listTask, itemText) {
        try {
            if (!listTask.subItems || listTask.subItems.length === 0) {
                return {
                    success: false,
                    message: `No items found in ${listTask.text}`
                };
            }
            
            // Find item to toggle
            const itemToToggle = listTask.subItems.find(item =>
                item.text.toLowerCase().includes(itemText.toLowerCase())
            );
            
            if (!itemToToggle) {
                return {
                    success: false,
                    message: `Item "${itemText}" not found in ${listTask.text}`
                };
            }
            
            // Toggle completion status
            itemToToggle.completed = !itemToToggle.completed;
            itemToToggle.updatedAt = new Date().toISOString();
            
            // Update the task
            const response = await axios.patch(
                `${this.baseUrl}/api/tasks/${listTask.taskType}/${listTask.id}`,
                { 
                    text: listTask.text,
                    subItems: listTask.subItems 
                }
            );
            
            return {
                success: true,
                message: `Marked "${itemToToggle.text}" as ${itemToToggle.completed ? 'completed' : 'incomplete'}`,
                task: response.data.data,
                toggledItem: itemToToggle
            };
        } catch (error) {
            console.error('Error toggling item in list:', error);
            return {
                success: false,
                message: `Failed to toggle item in list: ${error.message}`
            };
        }
    }

    /**
     * Create new list task with items
     */
    async createListTask(listName, items, taskType = 'personal') {
        try {
            const listTask = this.createTaskWithSubItems(listName, items);
            
            const response = await axios.post(`${this.baseUrl}/api/tasks/${taskType}`, {
                text: listTask.text,
                subItems: listTask.subItems
            });
            
            return {
                success: true,
                message: `Created ${listName} with ${items.length} items`,
                task: response.data.data
            };
        } catch (error) {
            console.error('Error creating list task:', error);
            return {
                success: false,
                message: `Failed to create list task: ${error.message}`
            };
        }
    }

    /**
     * Show list contents
     */
    async showListContents(listTask) {
        if (!listTask.subItems || listTask.subItems.length === 0) {
            return {
                success: true,
                message: `${listTask.text} is empty`,
                items: []
            };
        }
        
        const completedItems = listTask.subItems.filter(item => item.completed);
        const pendingItems = listTask.subItems.filter(item => !item.completed);
        
        let message = `${listTask.text}:\n\n`;
        
        if (pendingItems.length > 0) {
            message += "📋 Pending:\n";
            pendingItems.forEach(item => {
                message += `• ${item.text}\n`;
            });
        }
        
        if (completedItems.length > 0) {
            message += "\n✅ Completed:\n";
            completedItems.forEach(item => {
                message += `• ${item.text}\n`;
            });
        }
        
        return {
            success: true,
            message: message.trim(),
            items: listTask.subItems,
            stats: {
                total: listTask.subItems.length,
                completed: completedItems.length,
                pending: pendingItems.length
            }
        };
    }

    /**
     * Process list management command
     */
    async processListCommand(userInput) {
        const analysis = await this.parseListCommand(userInput);
        
        if (!analysis.isListCommand || analysis.confidence < 70) {
            return {
                success: false,
                isListCommand: false,
                message: "This doesn't appear to be a list management command."
            };
        }
        
        try {
            switch (analysis.action) {
                case 'add_item':
                    return await this.handleAddItem(analysis);
                    
                case 'remove_item':
                    return await this.handleRemoveItem(analysis);
                    
                case 'toggle_item':
                    return await this.handleToggleItem(analysis);
                    
                case 'create_list':
                    return await this.handleCreateList(analysis);
                    
                case 'show_list':
                    return await this.handleShowList(analysis);
                    
                case 'modify_list':
                    return await this.handleModifyList(analysis);
                    
                default:
                    return {
                        success: false,
                        message: `Unknown list action: ${analysis.action}`
                    };
            }
        } catch (error) {
            console.error('Error processing list command:', error);
            return {
                success: false,
                message: 'Failed to process list command'
            };
        }
    }

    /**
     * Handle add item command
     */
    async handleAddItem(analysis) {
        const listTasks = await this.findListTasks(analysis.listType, analysis.listName);
        
        if (listTasks.length === 0) {
            // Create new list if none exists
            return await this.createListTask(
                analysis.listName || `${analysis.listType} list`,
                [analysis.itemText],
                analysis.listType === 'work' ? 'work' : 'personal'
            );
        }
        
        if (listTasks.length > 1) {
            // Multiple lists found - ask for clarification
            const options = listTasks.map((task, index) => 
                `${String.fromCharCode(65 + index)}. ${task.text}`
            ).join('\n');
            
            return {
                success: false,
                requiresClarification: true,
                message: `Multiple lists found. Which one would you like to add "${analysis.itemText}" to?\n\n${options}`,
                matches: listTasks
            };
        }
        
        return await this.addItemToList(listTasks[0], analysis.itemText);
    }

    /**
     * Handle remove item command
     */
    async handleRemoveItem(analysis) {
        const listTasks = await this.findListTasks(analysis.listType, analysis.listName);
        
        if (listTasks.length === 0) {
            return {
                success: false,
                message: `No ${analysis.listType || 'list'} found to remove items from`
            };
        }
        
        if (listTasks.length > 1) {
            // Multiple lists found - ask for clarification
            const options = listTasks.map((task, index) => 
                `${String.fromCharCode(65 + index)}. ${task.text}`
            ).join('\n');
            
            return {
                success: false,
                requiresClarification: true,
                message: `Multiple lists found. Which one would you like to remove "${analysis.itemText}" from?\n\n${options}`,
                matches: listTasks
            };
        }
        
        return await this.removeItemFromList(listTasks[0], analysis.itemText);
    }

    /**
     * Handle toggle item command
     */
    async handleToggleItem(analysis) {
        const listTasks = await this.findListTasks(analysis.listType, analysis.listName);
        
        if (listTasks.length === 0) {
            return {
                success: false,
                message: `No ${analysis.listType || 'list'} found`
            };
        }
        
        if (listTasks.length > 1) {
            // Multiple lists found - ask for clarification
            const options = listTasks.map((task, index) => 
                `${String.fromCharCode(65 + index)}. ${task.text}`
            ).join('\n');
            
            return {
                success: false,
                requiresClarification: true,
                message: `Multiple lists found. Which one contains "${analysis.itemText}"?\n\n${options}`,
                matches: listTasks
            };
        }
        
        return await this.toggleItemInList(listTasks[0], analysis.itemText);
    }

    /**
     * Handle create list command
     */
    async handleCreateList(analysis) {
        const listName = analysis.listName || `${analysis.listType} list`;
        const items = analysis.items || [];
        const taskType = analysis.listType === 'work' ? 'work' : 'personal';
        
        return await this.createListTask(listName, items, taskType);
    }

    /**
     * Handle show list command
     */
    async handleShowList(analysis) {
        const listTasks = await this.findListTasks(analysis.listType, analysis.listName);
        
        if (listTasks.length === 0) {
            return {
                success: false,
                message: `No ${analysis.listType || 'list'} found`
            };
        }
        
        if (listTasks.length > 1) {
            // Show all lists
            let message = `Found ${listTasks.length} lists:\n\n`;
            listTasks.forEach((task, index) => {
                message += `${index + 1}. ${task.text} (${task.subItems?.length || 0} items)\n`;
            });
            
            return {
                success: true,
                message: message.trim(),
                lists: listTasks
            };
        }
        
        return await this.showListContents(listTasks[0]);
    }

    /**
     * Handle modify list command (compound operations)
     */
    async handleModifyList(analysis) {
        if (!analysis.operations || analysis.operations.length === 0) {
            return {
                success: false,
                message: "No operations specified for list modification"
            };
        }

        const listTasks = await this.findListTasks(analysis.listType, analysis.listName);
        
        if (listTasks.length === 0) {
            return {
                success: false,
                message: `No ${analysis.listType || 'list'} found to modify`
            };
        }
        
        if (listTasks.length > 1) {
            // Multiple lists found - ask for clarification
            const options = listTasks.map((task, index) => 
                `${String.fromCharCode(65 + index)}. ${task.text}`
            ).join('\n');
            
            return {
                success: false,
                requiresClarification: true,
                message: `Multiple lists found. Which one would you like to modify?\n\n${options}`,
                matches: listTasks
            };
        }

        const listTask = listTasks[0];
        const results = [];
        let hasErrors = false;

        // Execute each operation in sequence
        for (const operation of analysis.operations) {
            let result;
            
            switch (operation.action) {
                case 'remove_item':
                    result = await this.removeItemFromList(listTask, operation.itemText);
                    break;
                case 'add_item':
                    result = await this.addItemToList(listTask, operation.itemText);
                    break;
                case 'toggle_item':
                    result = await this.toggleItemInList(listTask, operation.itemText);
                    break;
                default:
                    result = {
                        success: false,
                        message: `Unknown operation: ${operation.action}`
                    };
            }
            
            results.push(result);
            
            if (!result.success) {
                hasErrors = true;
            }
        }

        // Generate summary message
        const successfulOps = results.filter(r => r.success);
        const failedOps = results.filter(r => !r.success);
        
        let message = '';
        if (successfulOps.length > 0) {
            const messages = successfulOps.map(r => r.message).join(', ');
            message = `Successfully: ${messages}`;
        }
        
        if (failedOps.length > 0) {
            const errorMessages = failedOps.map(r => r.message).join(', ');
            if (message) {
                message += `. Issues: ${errorMessages}`;
            } else {
                message = `Failed: ${errorMessages}`;
            }
        }

        return {
            success: successfulOps.length > 0,
            message: message,
            operations: results,
            task: listTask
        };
    }
}

export default ListManagementSystem;