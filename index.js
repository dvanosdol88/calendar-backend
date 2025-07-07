import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import cors from 'cors'; // <--- Added this line
import gmailRouter from './gmail-integration.js';
import taskRouter from './task-api.js';
import aiTaskRouter from './ai-task-routes.js';
import AITaskAssistant from './ai-task-assistant.js';

dotenv.config();
const app = express();

app.use(cors()); // <--- Added this line to enable CORS for all origins
app.use(express.json());

// Gmail integration routes
app.use(gmailRouter);

// Task management routes
app.use(taskRouter);

// AI task assistant routes
app.use(aiTaskRouter);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize AI task assistant
const aiTaskAssistant = new AITaskAssistant();

app.post('/ask-gpt', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).send({ error: "No prompt provided." });

  try {
    // First, check if this is a task-related command
    const taskResult = await aiTaskAssistant.processUserInput(prompt);
    
    if (taskResult.isTaskCommand) {
      // Handle task commands
      return res.send({
        answer: taskResult.aiResponse,
        taskCommand: true,
        executionResult: taskResult.executionResult
      });
    }

    // If not a task command, proceed with calendar/general AI response
    const calendarData = JSON.parse(fs.readFileSync('./calendar_plan.json', 'utf-8'));
    
    // Get current tasks for additional context
    const currentTasks = await aiTaskAssistant.getCurrentTasks();
    
    const baseContext = `
You are a helpful planning assistant. Use the user's prompt and the data below to generate a response.

Calendar Plan:
${JSON.stringify(calendarData, null, 2)}

Current Tasks:
${currentTasks}

You can help with:
- Calendar planning and scheduling
- Task management queries
- General productivity advice
- Analyzing calendar data and task lists
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: "system", content: baseContext },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    res.send({ 
      answer: completion.choices[0].message.content,
      taskCommand: false 
    });
  } catch (err) {
    console.error("🔥 FULL ERROR:", err); // This line helps see errors on Render
    res.status(500).send({ error: "Error communicating with GPT." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
