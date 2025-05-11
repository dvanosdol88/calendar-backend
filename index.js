import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
const app = express();
app.use(express.json());

app.post('/ask-gpt', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).send({ error: "No prompt provided." });

  const calendarData = JSON.parse(fs.readFileSync('./calendar_plan.json', 'utf-8'));

  return res.send({
    answer: `✅ Read ${calendarData.recurring_blocks.length} calendar blocks. Prompt was: "${prompt}"`
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));