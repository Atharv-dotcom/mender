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

// FIX 1: This fixes the "Cannot GET /" error!
app.get('/', (req, res) => {
    res.send('✅ Mender Backend API is running smoothly! Ready to accept requests.');
});

// Check if API key exists
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ CRITICAL: GEMINI_API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Endpoint for Worker Skill Extraction
app.post('/api/extract-skills', async (req, res) => {
    try {
        console.log("Received skill extraction request:", req.body.text);
        const { text } = req.body;
        const prompt = `Extract professional trade skills from this text. Return ONLY a JSON array of short skill strings (max 6 words each). Examples: ["AC Repair","Pipe Fitting"]. Text: "${text}"`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: { temperature: 0.2 }
        });

        const clean = response.text.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(clean));
    } catch (error) {
        console.error("Gemini AI Error (extract-skills):", error);
        res.status(500).json({ error: error.message || "Failed to process AI request" });
    }
});

// Endpoint for Customer Issue Analysis
app.post('/api/analyze-issue', upload.single('image'), async (req, res) => {
    try {
        console.log("Received issue analysis request");
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
            contents: parts,
            config: { temperature: 0.3 }
        });

        const clean = response.text.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(clean));
    } catch (error) {
        console.error("Gemini AI Error (analyze-issue):", error);
        res.status(500).json({ error: error.message || "Failed to process AI request" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
