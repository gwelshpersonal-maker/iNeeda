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

export const generateJobDescription = async (title: string, role: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/gemini/job-description", {
      method: "POST",
      headers,
      body: JSON.stringify({ title, role }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating content.";
  }
};

export const analyzeScheduleConflicts = async (scheduleData: string) => {
    // This could also be a backend route if critical
    return "Schedule analysis is currently performed via automated rules on the backend.";
}
