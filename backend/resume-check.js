import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Multer setup for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Initialize Gemini with API key from environment    
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY is not set in environment variables!");
  console.error("Please add GEMINI_API_KEY to your .env file");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

console.log("✓ Gemini initialized with API key from environment");

// Function to convert file to base64
function fileToBase64(filePath) {
  const fileContent = fs.readFileSync(filePath);
  return fileContent.toString('base64');
}

// Function to get MIME type from file extension
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// ATS Analysis Endpoint
router.post('/analyze-resume', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const mimeType = getMimeType(fileName);

    console.log(`Analyzing file: ${fileName}, MIME type: ${mimeType}`);

    // Validate file type
    const validMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!validMimeTypes.includes(mimeType)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Invalid file type. Please upload PDF or DOC/DOCX files.' });
    }

    // Read file and convert to base64
    const fileData = fileToBase64(filePath);
    console.log(`File converted to base64: ${fileData.length} characters`);

    // Initialize the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create the prompt for ATS analysis
    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and resume expert. Analyze this resume and provide:

1. **ATS Score** (0-100): Rate how well this resume will perform with ATS systems. Consider:
   - Use of standard formatting
   - Keyword optimization
   - Clarity and structure
   - File format compatibility
   - Section organization
   - Proper use of bullet points
   - Clear job titles and company names
   - Quantifiable achievements

2. **Strengths** (list 4-5 key strengths):
   - What aspects of the resume are ATS-friendly
   - What stands out positively
   - Well-formatted sections
   - Good use of keywords

3. **Weaknesses** (list 4-5 areas to improve):
   - ATS-unfriendly formatting or content
   - Missing important keywords or sections
   - Structural issues
   - Hard to parse information

4. **Actionable Improvement Tips** (provide 6-8 specific, detailed tips):
   - How to improve the ATS score
   - Specific changes to make
   - Keywords to add based on the resume
   - Format improvements
   - Section suggestions

Please respond ONLY with valid JSON in this exact format:
{
  "score": <number between 0-100>,
  "strengths": ["strength1", "strength2", "strength3", "strength4", "strength5"],
  "weaknesses": ["weakness1", "weakness2", "weakness3", "weakness4", "weakness5"],
  "suggestions": ["tip1", "tip2", "tip3", "tip4", "tip5", "tip6", "tip7", "tip8"]
}

Make sure all arrays have the specified number of items. Do not include any text outside the JSON.`;

    try {
      console.log("Sending request to Gemini API...");
      
      // Analyze resume with Gemini
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: fileData,
          },
        },
        prompt,
      ]);

      console.log("✓ Received response from Gemini");

      const responseText = result.response.text();
      console.log("Response text length:", responseText.length);

      // Parse the JSON response
      let analysisResult;
      try {
        analysisResult = JSON.parse(responseText);
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          console.error('Gemini Response:', responseText);
          throw new Error('Could not extract valid JSON from Gemini response');
        }
      }

      // Validate response structure
      if (
        typeof analysisResult.score !== 'number' ||
        !Array.isArray(analysisResult.strengths) ||
        !Array.isArray(analysisResult.weaknesses) ||
        !Array.isArray(analysisResult.suggestions)
      ) {
        throw new Error('Invalid analysis response structure');
      }

      // Ensure score is between 0-100
      const score = Math.min(100, Math.max(0, analysisResult.score));

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      console.log("✓ Analysis complete. Score:", score);

      res.json({
        score,
        strengths: analysisResult.strengths,
        weaknesses: analysisResult.weaknesses,
        suggestions: analysisResult.suggestions,
      });
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError.message);
      console.error('Full error:', geminiError);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.status(500).json({
        error: 'Failed to analyze resume with Gemini',
        details: geminiError.message,
      });
    }
  } catch (error) {
    console.error('Error in resume analysis:', error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Failed to process resume',
      details: error.message,
    });
  }
});

export default router;
