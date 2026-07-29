import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, history = [] } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const formattedHistory = history.map((msg: any) => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      formattedHistory.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: "Your conversational reply to the user. Explain what you built, or simply chat back if no website was requested."
          },
          files: {
            type: Type.ARRAY,
            description: "A list of source code files for the website. Only generate if the user asked to build a website or application. Leave empty for general chat.",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "The file name, e.g., index.html, styles.css, script.js" },
                language: { type: Type.STRING, description: "The language, e.g., html, css, javascript" },
                content: { type: Type.STRING, description: "The complete file contents." }
              },
              required: ["name", "language", "content"]
            }
          }
        },
        required: ["reply", "files"]
      };

      const generateWithRetry = async (retries = 5, delay = 2000): Promise<any> => {
        try {
          return await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: formattedHistory,
            config: {
              systemInstruction: `You are Harsh Website Builder, an expert full-stack web developer AI. Use emojis in your replies to be friendly.
          
CRITICAL INSTRUCTIONS:
- You have memory of the conversation. Use it to perform tweaks on the user's previously generated website.
- If the user is just chatting or asking a normal question, reply conversationally in the 'reply' field using emojis and leave the 'files' array empty.
- If the user asks to build a website or tweak an existing one, generate a fully functional, complete, and styled application EXACTLY as requested.
- THE USER WANTS EXTREMELY DETAILED, PRODUCTION-GRADE CODE. DO NOT output simple pages. You MUST generate massive, highly sophisticated web applications with beautiful modern UI, complex layouts, animations, and massive Javascript functionality.
- ABSOLUTELY NO PLACEHOLDERS. DO NOT use comments like "// logic here" or "// add more items". You MUST write out the FULL complete code.
- EVERY SINGLE BUTTON AND INTERACTIVE ELEMENT MUST WORK. You must attach real Javascript event listeners to every button, form, and clickable element so that it performs a tangible, visible action on the screen (e.g. showing modals, updating UI state, animations, playing sounds, creating elements).
- Do NOT assume a backend exists. Use client-side JavaScript (localStorage, JS variables, DOM manipulation) to simulate all logic (like adding to cart, saving settings, sending messages, etc).
- Provide the complete source code using HTML, CSS, and vanilla JS. 
- Ensure the website is fully working and responsive. Don't use external frameworks like React, just standard web technologies. 
- Structure the app into multiple files like index.html, styles.css, script.js.`,
              responseMimeType: "application/json",
              responseSchema: responseSchema,
            }
          });
        } catch (error: any) {
          const status = error?.status || error?.code || 500;
          if (retries > 0 && (status === 503 || status === 429 || status === 500 || status === 504 || error.message?.includes('429') || error.message?.includes('503'))) {
            console.log(`AI generation failed with ${status}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return generateWithRetry(retries - 1, delay * 1.5);
          }
          throw error;
        }
      };

      const aiResponse = await generateWithRetry();

      const responseText = aiResponse.text;
      if (!responseText) {
        throw new Error("Empty response from AI");
      }

      const result = JSON.parse(responseText);
      res.json(result);
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate website", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
