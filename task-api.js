import express from 'express';
import { 
    loadTasks, 
    saveTasks, 
    getTasksByType, 
    addTask, 
    toggleTask, 
    deleteTask, 
    editTask,
    getTasksForAI,
    addItemToList,
    removeItemFromList,
    toggleSubItem 
} from './task-storage.js';

const router = express.Router();

// Get all tasks
router.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await loadTasks();
        res.json({
            success: true,
            data: tasks,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch tasks' 
        });
    }
});

// Get tasks by type (work/personal)
router.get('/api/tasks/:type', async (req, res) => {
    try {
        const { type } = req.params;
        if (!['work', 'personal'].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid task type. Use "work" or "personal"' 
            });
        }
        
        const tasks = await getTasksByType(type);
        res.json({
            success: true,
            data: { [type]: tasks },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching tasks by type:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch tasks' 
        });
    }
});

// Add new task
router.post('/api/tasks/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { text, subItems } = req.body;
        
        if (!['work', 'personal'].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid task type. Use "work" or "personal"' 
            });
        }
        
        if (!text || !text.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: 'Task text is required' 
            });
        }
        
        const newTask = await addTask(type, text.trim(), subItems || []);
        
        if (newTask) {
            res.json({
                success: true,
                data: newTask,
                message: `Task added to ${type} list`,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to add task' 
            });
        }
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add task' 
        });
    }
});

// Toggle task completion
router.patch('/api/tasks/:type/:id/toggle', async (req, res) => {
    try {
        const { type, id } = req.params;
        
        if (!['work', 'personal'].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid task type. Use "work" or "personal"' 
            });
        }
        
        const updatedTask = await toggleTask(type, id);
        
        if (updatedTask) {
            res.json({
                success: true,
                data: updatedTask,
                message: `Task ${updatedTask.completed ? 'completed' : 'marked incomplete'}`,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Task not found' 
            });
        }
    } catch (error) {
        console.error('Error toggling task:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update task' 
        });
    }
});

// Edit task text
router.patch('/api/tasks/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const { text, subItems } = req.body;
        
        if (!['work', 'personal'].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid task type. Use "work" or "personal"' 
            });
        }
        
        // Support both string and object updates
        let updates;
        if (text && !subItems) {
            // Backward compatibility for simple text updates
            updates = text.trim();
        } else {
            // New object-based updates with sub-items support
            updates = {};
            if (text) updates.text = text.trim();
            if (subItems !== undefined) updates.subItems = subItems;
        }
        
        const updatedTask = await editTask(type, id, updates);
        
        if (updatedTask) {
            res.json({
                success: true,
                data: updatedTask,
                message: 'Task updated successfully',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Task not found' 
            });
        }
    } catch (error) {
        console.error('Error editing task:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to edit task' 
        });
    }
});

// Delete task
router.delete('/api/tasks/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        
        if (!['work', 'personal'].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid task type. Use "work" or "personal"' 
            });
        }
        
        const deletedTask = await deleteTask(type, id);
        
        if (deletedTask) {
            res.json({
                success: true,
                data: deletedTask,
                message: 'Task deleted successfully',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Task not found' 
            });
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete task' 
        });
    }
});

// Get tasks formatted for AI (used internally by AI assistant)
router.get('/api/tasks-for-ai', async (req, res) => {
    try {
        const aiFormattedTasks = await getTasksForAI();
        res.json({
            success: true,
            data: aiFormattedTasks,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting tasks for AI:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to format tasks for AI' 
        });
    }
});

// Add item to list task
router.post('/api/tasks/:type/:id/items', async (req, res) => {
    try {
        const { type, id } = req.params;
        const { text } = req.body;
        
        if (!['work', 'personal'].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid task type. Use "work" or "personal"' 
            });
        }
        
        if (!text || !text.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: 'Item text is required' 
            });
        }
        
        const newItem = await addItemToList(type, id, text.trim());
        
        if (newItem) {
            res.json({
                success: true,
                data: newItem,
                message: 'Item added to list',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Task not found' 
            });
        }
    } catch (error) {
        console.error('Error adding item to list:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add item to list' 
        });
    }
});

// Remove item from list task
router.delete('/api/tasks/:type/:id/items/:itemText', async (req, res) => {
    try {
        const { type, id, itemText } = req.params;
        
        if (!['work', 'personal'].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid task type. Use "work" or "personal"' 
            });
        }
        
        const removedItem = await removeItemFromList(type, id, decodeURIComponent(itemText));
        
        if (removedItem) {
            res.json({
                success: true,
                data: removedItem,
                message: 'Item removed from list',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Task or item not found' 
            });
        }
    } catch (error) {
        console.error('Error removing item from list:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to remove item from list' 
        });
    }
});

// Toggle sub-item completion
router.patch('/api/tasks/:type/:id/items/:itemText/toggle', async (req, res) => {
    try {
        const { type, id, itemText } = req.params;
        
        if (!['work', 'personal'].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid task type. Use "work" or "personal"' 
            });
        }
        
        const toggledItem = await toggleSubItem(type, id, decodeURIComponent(itemText));
        
        if (toggledItem) {
            res.json({
                success: true,
                data: toggledItem,
                message: `Item marked as ${toggledItem.completed ? 'completed' : 'incomplete'}`,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Task or item not found' 
            });
        }
    } catch (error) {
        console.error('Error toggling sub-item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to toggle sub-item' 
        });
    }
});

export default router;