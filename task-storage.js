import fs from 'fs/promises';
import path from 'path';

const TASKS_FILE = './tasks.json';

// Initialize tasks file if it doesn't exist
async function initializeTasksFile() {
    try {
        await fs.access(TASKS_FILE);
    } catch (error) {
        // File doesn't exist, create it
        const initialData = {
            work: [],
            personal: [],
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(TASKS_FILE, JSON.stringify(initialData, null, 2));
    }
}

// Load all tasks from storage
export async function loadTasks() {
    try {
        await initializeTasksFile();
        const data = await fs.readFile(TASKS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading tasks:', error);
        return { work: [], personal: [], lastUpdated: new Date().toISOString() };
    }
}

// Save all tasks to storage
export async function saveTasks(tasks) {
    try {
        const data = {
            ...tasks,
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving tasks:', error);
        return false;
    }
}

// Get tasks by type (work/personal)
export async function getTasksByType(type) {
    const allTasks = await loadTasks();
    return allTasks[type] || [];
}

// Add a new task (supports sub-items for lists)
export async function addTask(type, taskText, subItems = []) {
    const allTasks = await loadTasks();
    const newTask = {
        id: Date.now().toString(),
        text: taskText,
        completed: false,
        created: new Date().toISOString(),
        subItems: subItems.map(item => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2),
            text: typeof item === 'string' ? item : item.text,
            completed: false,
            addedAt: new Date().toISOString()
        }))
    };
    
    allTasks[type].push(newTask);
    const saved = await saveTasks(allTasks);
    
    return saved ? newTask : null;
}

// Update task completion status
export async function toggleTask(type, taskId) {
    const allTasks = await loadTasks();
    const task = allTasks[type].find(t => t.id === taskId);
    
    if (task) {
        task.completed = !task.completed;
        task.lastModified = new Date().toISOString();
        const saved = await saveTasks(allTasks);
        return saved ? task : null;
    }
    
    return null;
}

// Delete a task
export async function deleteTask(type, taskId) {
    const allTasks = await loadTasks();
    const taskIndex = allTasks[type].findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        const deletedTask = allTasks[type].splice(taskIndex, 1)[0];
        const saved = await saveTasks(allTasks);
        return saved ? deletedTask : null;
    }
    
    return null;
}

// Edit task text (supports sub-items for lists)
export async function editTask(type, taskId, updates) {
    const allTasks = await loadTasks();
    const task = allTasks[type].find(t => t.id === taskId);
    
    if (task) {
        // Handle string input (backward compatibility)
        if (typeof updates === 'string') {
            task.text = updates;
        } else {
            // Handle object input with sub-items support
            if (updates.text !== undefined) task.text = updates.text;
            if (updates.subItems !== undefined) task.subItems = updates.subItems;
        }
        task.lastModified = new Date().toISOString();
        const saved = await saveTasks(allTasks);
        return saved ? task : null;
    }
    
    return null;
}

// Add item to list task
export async function addItemToList(type, taskId, itemText) {
    const allTasks = await loadTasks();
    const task = allTasks[type].find(t => t.id === taskId);
    
    if (task) {
        if (!task.subItems) task.subItems = [];
        
        const newItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2),
            text: itemText,
            completed: false,
            addedAt: new Date().toISOString()
        };
        
        task.subItems.push(newItem);
        task.lastModified = new Date().toISOString();
        const saved = await saveTasks(allTasks);
        return saved ? newItem : null;
    }
    
    return null;
}

// Remove item from list task
export async function removeItemFromList(type, taskId, itemText) {
    const allTasks = await loadTasks();
    const task = allTasks[type].find(t => t.id === taskId);
    
    if (task && task.subItems) {
        const itemIndex = task.subItems.findIndex(item =>
            item.text.toLowerCase().includes(itemText.toLowerCase())
        );
        
        if (itemIndex !== -1) {
            const removedItem = task.subItems.splice(itemIndex, 1)[0];
            task.lastModified = new Date().toISOString();
            const saved = await saveTasks(allTasks);
            return saved ? removedItem : null;
        }
    }
    
    return null;
}

// Toggle sub-item completion
export async function toggleSubItem(type, taskId, itemText) {
    const allTasks = await loadTasks();
    const task = allTasks[type].find(t => t.id === taskId);
    
    if (task && task.subItems) {
        const item = task.subItems.find(item =>
            item.text.toLowerCase().includes(itemText.toLowerCase())
        );
        
        if (item) {
            item.completed = !item.completed;
            item.updatedAt = new Date().toISOString();
            task.lastModified = new Date().toISOString();
            const saved = await saveTasks(allTasks);
            return saved ? item : null;
        }
    }
    
    return null;
}

// Get all tasks formatted for AI context
export async function getTasksForAI() {
    const allTasks = await loadTasks();
    
    const formatTasks = (tasks, type) => {
        if (!tasks || tasks.length === 0) {
            return `${type.charAt(0).toUpperCase() + type.slice(1)} tasks: None`;
        }
        
        const taskList = tasks.map(task => {
            let taskLine = `- ${task.completed ? '✓' : '○'} ${task.text} (ID: ${task.id})`;
            
            // Add sub-items if they exist
            if (task.subItems && task.subItems.length > 0) {
                const subItemsList = task.subItems.map(item => 
                    `    • ${item.completed ? '✓' : '○'} ${item.text}`
                ).join('\n');
                taskLine += `\n${subItemsList}`;
            }
            
            return taskLine;
        }).join('\n');
        
        return `${type.charAt(0).toUpperCase() + type.slice(1)} tasks:\n${taskList}`;
    };
    
    return `Current Task Lists:\n\n${formatTasks(allTasks.work, 'work')}\n\n${formatTasks(allTasks.personal, 'personal')}`;
}