import express from 'express';
import { 
    loadTasks, 
    saveTasks, 
    getTasksByType, 
    addTask, 
    toggleTask, 
    deleteTask, 
    editTask,
    getTasksForAI 
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
                error: 'Task text is required' 
            });
        }
        
        const newTask = await addTask(type, text.trim());
        
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
                error: 'Task text is required' 
            });
        }
        
        const updatedTask = await editTask(type, id, text.trim());
        
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

export default router;