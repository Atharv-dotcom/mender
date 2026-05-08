const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Set up multer to process image uploads in memory
const upload = multer({ storage: multer.memoryStorage() });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 1. Endpoint for Worker Skill Extraction
app.post('/api/extract-skills', async (req, res) => {
    try {
        const { text } = req.body;
        const prompt = `Extract professional trade skills from this text. Return ONLY a JSON array of short skill strings (max 6 words each). Examples: ["AC Repair","Pipe Fitting"]. Text: "${text}"`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0.2 }
        });

        const clean = response.text.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(clean));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Endpoint for Customer Issue Analysis
app.post('/api/analyze-issue', upload.single('image'), async (req, res) => {
    try {
        const { issueText } = req.body;
        const parts = [];

        if (req.file) {
            parts.push({
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype
                }
            });
        }

        const prompt = `You are an AI repair issue classifier for Mender. Analyze the issue: "${issueText}". Return ONLY valid JSON: {"category": "Device or service type", "urgency": "Low, Medium, or High", "summary": "Short explanation"}`;
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts }],
            config: { temperature: 0.3 }
        });

        const clean = response.text.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(clean));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));