import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import cors from 'cors'; // Import cors

dotenv.config();
const app = express();

app.use(cors()); // Use cors middleware - this will allow all origins
app.use(express.json());

// ... rest of your index.js code
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/ask-gpt', async (req, res) => {
  // ... (your existing code for this route)
  // ...
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
