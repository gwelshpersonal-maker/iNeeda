import { auth } from '../lib/firebase';

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch (e) {
      console.error("Error retrieving Firebase ID token:", e);
    }
  }
  return headers;
};

export const refineJobDescription = async (rawDescription: string): Promise<string> => {
  if (!rawDescription.trim()) return "";
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/gemini/refine-job", {
      method: "POST",
      headers,
      body: JSON.stringify({ rawDescription }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.text;
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

export const getMarketPriceEstimate = async (category: string, description: string): Promise<MarketPriceEstimate> => {
  if (!category || !description.trim()) {
    throw new Error("Category and description are required.");
  }
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/gemini/estimate-price", {
      method: "POST",
      headers,
      body: JSON.stringify({ category, description }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    const parsed = JSON.parse(data.text);
    return {
      min: parsed.min || 0,
      max: parsed.max || 0,
      tip: parsed.tip || "Estimation provided by AI."
    };
  } catch (error: any) {
    console.error("Error getting market price estimate:", error);
    throw new Error(error.message || "Price estimation failed");
  }
};

export const generateProfessionalQuote = async (jobDescription: string, bidAmount: number): Promise<string> => {
  if (!jobDescription || !bidAmount) return "";
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/gemini/generate-quote", {
      method: "POST",
      headers,
      body: JSON.stringify({ jobDescription, bidAmount }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.text;
  } catch (error: any) {
    console.error("Error generating professional quote:", error);
    return `Labor: $${(bidAmount * 0.8).toFixed(2)}\nMaterials: $${(bidAmount * 0.15).toFixed(2)}\nSoftware Service Expense: $${(bidAmount * 0.05).toFixed(2)}\n----------------\nTotal: $${bidAmount}`;
  }
};
