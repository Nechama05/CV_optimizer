
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
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.get('/api/download/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(GENERATED_DIR, filename);

  try {
    await fs.access(filePath); 


    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  
    const stream = fsSync.createReadStream(filePath);
    stream.pipe(res);



    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).end();
    });

  }
  catch (err) {
    res.status(404).json({ error: "File not found." });
  }
});


app.post('/api/optimize', upload.single('cv'), async (req, res) => {
  try {
    const jobDescription = req.body.job || "Optimize this CV for general use.";
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    const base64pdf = file.buffer.toString("base64");

    const contents = [
      {
        text: `
You are a CV optimization assistant. Improve the CV based on this job description:\n${jobDescription}
Update the CV to match the job description requirements.
Write the key skills required, suggested changes, missing skills, and hiring chance assessment.
Please provide recommendations for improving the CV.
When you finish with the content of the resume and move on to give me the rest of the data I requested, start with the title: Evaluation and changes made.
Attached is the PDF CV.
                `
      },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64pdf
        }
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents
    });

    const fullText = response.text || "";
    const SPLIT_KEY = "Evaluation and changes made";

    const [pdfText, clientText] = fullText.split(SPLIT_KEY);

    const pdfContent = pdfText || "";
    const frontendContent = clientText ? SPLIT_KEY + clientText : "";


const filename = `optimized_${Date.now()}.pdf`;
const filePath = path.join(GENERATED_DIR, filename);

const pdf = new PDFDocument({ margin: 50 });
const writer = pdf.pipe(fsSync.createWriteStream(filePath));

const lines = pdfContent.split("\n");
lines.forEach(line => {
    line = line.trim();
    if (line === "") {
        pdf.moveDown(0.5);
    } else if (line.startsWith("**") && line.endsWith("**")) {
        // כותרת מודגשת
        pdf.font('Helvetica-Bold').fontSize(14).text(line.replace(/\*\*/g, ""), { align: "left" });
        pdf.moveDown(0.3);
    } else if (line.startsWith("*")) {
        // רשימה עם נקודה במקום כוכבית
        pdf.font('Helvetica').fontSize(12).text("• " + line.slice(1).trim(), { indent: 20, lineGap: 2 });
    } else {
        // טקסט רגיל
        pdf.font('Helvetica').fontSize(12).text(line, { align: "left", lineGap: 2 });
    }
});

pdf.end();

writer.on("finish", () => {
    res.json({
        filename,
        frontendContent 
    });
});

  } catch (err) {
    console.error("Optimization error:", err);
    res.status(500).json({ error: "Server error during optimization." });
  }
});


app.get('/api/download/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(GENERATED_DIR, filename);

  try {
    await fs.access(filePath);
    res.download(filePath);
  } catch {
    res.status(404).json({ error: "File not found." });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});