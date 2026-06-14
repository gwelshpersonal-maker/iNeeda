import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/**
 * Refines a raw job description into a structured format.
 */
export const refineJobDescription = async (rawDescription: string): Promise<string> => {
  if (!rawDescription.trim()) return "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Refine this job description into a professional format with: 1. Scope, 2. Materials, 3. Timeframe. Be concise. Raw: "${rawDescription}"`,
    });
    
    return response.text || rawDescription;
  } catch (error: any) {
    console.error("Error refining job description:", error);
    throw new Error(error.message || "AI refinement failed");
  }
};

export interface MarketPriceEstimate {
  min: number;
  max: number;
  tip: string;
}

/**
 * Gets a fair market price estimate for a job.
 */
export const getMarketPriceEstimate = async (category: string, description: string): Promise<MarketPriceEstimate> => {
  if (!category || !description.trim()) {
    throw new Error("Category and description are required.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Estimate pricing for ${category} in Harrisburg PA. Job: ${description}. Return ONLY a JSON object: {"min": number, "max": number, "tip": string}`,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text || "{}";
    const data = JSON.parse(text);
    
    return {
      min: data.min || 0,
      max: data.max || 0,
      tip: data.tip || "Estimation provided by AI."
    };

  } catch (error: any) {
    console.error("Error getting market price estimate:", error);
    throw new Error(error.message || "Price estimation failed");
  }
};

/**
 * Generates a professional line-item quote for a provider.
 */
export const generateProfessionalQuote = async (jobDescription: string, bidAmount: number): Promise<string> => {
  if (!jobDescription || !bidAmount) return "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an experienced, professional independent contractor bidding on a job. 
      
      The client's job description is: "${jobDescription}"
      Your total bid amount is: $${bidAmount}.

      Draft a brief, polite, and confident message to the client to accompany your bid. 
      
      Requirements:
      1. Acknowledge their specific problem/need based on the description.
      2. State that you have the skills to handle it efficiently.
      3. Clearly state the total proposed bid of $${bidAmount}.
      4. Keep it concise (3-4 sentences maximum).
      5. Do NOT invent specific material costs or fake past experiences. Keep it focused on solving their immediate problem.`,
    });
    
    return response.text || `Labor & Services: $${bidAmount}`;
  } catch (error: any) {
    console.error("Error generating professional quote:", error);
    // Fallback to the original math breakdown if the AI call fails
    return `Labor: $${(bidAmount * 0.8).toFixed(2)}\nMaterials: $${(bidAmount * 0.15).toFixed(2)}\nSoftware Service Expense: $${(bidAmount * 0.05).toFixed(2)}\n----------------\nTotal: $${bidAmount}`;
  }
};
