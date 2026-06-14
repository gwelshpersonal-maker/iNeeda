import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateJobDescription = async (title: string, role: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional job description for a ${title} in the ${role} field. Include key responsibilities and requirements.`,
    });
    
    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating content.";
  }
};

export const analyzeScheduleConflicts = async (scheduleData: string) => {
    // This could also be a backend route if critical
    return "Schedule analysis is currently performed via automated rules on the backend.";
}
