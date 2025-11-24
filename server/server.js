import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GENERATED_DIR = path.join(process.cwd(), 'generated');
await fs.mkdir(GENERATED_DIR, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({ storage });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

/* ---------------- DOWNLOAD ---------------- */
app.get('/api/download/:filename', async (req, res) => {
  const filePath = path.join(GENERATED_DIR, req.params.filename);

  try {
    await fs.access(filePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${req.params.filename}"`
    );

    fsSync.createReadStream(filePath).pipe(res);
  } catch {
    res.status(404).json({ error: 'File not found.' });
  }
});

/* ---------------- OPTIMIZE ---------------- */
app.post('/api/optimize', upload.single('cv'), async (req, res) => {
  try {
    const jobDescription = req.body.job || 'General software engineer role.';
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No PDF uploaded.' });
    }

    const base64pdf = file.buffer.toString('base64');

    const prompt = `
You are an expert CV rewriting assistant.

Your task:
1. Read the attached CV (PDF).
2. Rewrite the ENTIRE CV into a clean, professional, updated resume that fits the job description.
3. Your output **must be only the new rewritten CV**, no explanations.

Format:
- No Markdown.
- No asterisks.
- No hashtags.
- Plain structured text for a resume.

After the resume, write this exact title:
###EVALUATION###
Then write:
- Key missing skills
- Suggested improvements
- Hiring chance analysis

Do NOT include PDF formatting, just text.

Job description:
${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64pdf
          }
        }
      ]
    });

    const fullText = response.text || '';
    const MARKER = '###EVALUATION###';

    const [cvText, evalText] = fullText.split(MARKER);

    const cleanCV = (cvText || '').trim();
    const evaluation = (evalText || '').trim();

    // --- Write PDF ---
    const filename = `optimized_${Date.now()}.pdf`;
    const filePath = path.join(GENERATED_DIR, filename);

    const pdf = new PDFDocument({ margin: 50 });
    const stream = pdf.pipe(fsSync.createWriteStream(filePath));

    cleanCV.split('\n').forEach(line => {
      pdf.font('Helvetica').fontSize(12).text(line.trim());
      pdf.moveDown(0.4);
    });

    pdf.end();

    stream.on('finish', () => {
      res.json({
        filename,
        frontendContent: evaluation
      });
    });
  } catch (err) {
    console.error('Optimization error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ---------------- SERVER ---------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
