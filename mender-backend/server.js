const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Set up multer to process image uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// Check if API key exists
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ CRITICAL: GEMINI_API_KEY is missing from environment variables.");
}

// Initialize standard Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Health check endpoint
app.get('/', (req, res) => {
    res.send('✅ Mender Backend API is running smoothly!');
});

// Endpoint for Worker Skill Extraction
app.post('/api/extract-skills', async (req, res) => {
    try {
        console.log("Extracting skills for:", req.body.text);
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Extract professional trade skills from this text. Return ONLY a JSON array of short skill strings (max 6 words each). Examples: ["AC Repair","Pipe Fitting"]. Text: "${req.body.text}"`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const clean = text.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(clean));
        
    } catch (error) {
        console.error("❌ Gemini Extract Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint for Customer Issue Analysis
app.post('/api/analyze-issue', upload.single('image'), async (req, res) => {
    try {
        console.log("Analyzing customer issue...");
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are an AI repair issue classifier for Mender. Analyze the issue: "${req.body.issueText}". Return ONLY valid JSON: {"category": "Device or service type", "urgency": "Low, Medium, or High", "summary": "Short explanation"}`;
        
        const imageParts = [];
        
        if (req.file) {
            imageParts.push({
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype
                }
            });
        }

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();

        const clean = text.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(clean));
        
    } catch (error) {
        console.error("❌ Gemini Analyze Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
