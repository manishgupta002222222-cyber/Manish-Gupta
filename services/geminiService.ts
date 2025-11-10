import { GoogleGenAI, Chat } from "@google/genai";
import type { Persona } from '../types';

// IMPORTANT: Do NOT expose your API key in client-side code.
// This is a placeholder and should be handled via a secure backend proxy in a real application.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd show a user-friendly error or disable the chat feature.
  console.error("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const createChatSession = (persona: Persona): Chat => {
  const model = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: persona.systemInstruction,
    },
  });
  return model;
};