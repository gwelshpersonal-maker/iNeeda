
/**
 * Mock Notification Service
 * In a real app, this would connect to Twilio (SMS), SendGrid (Email), or FCM (Push).
 */

export const sendSMS = async (to: string, message: string) => {
  console.log(`%c[SMS SENT] To: ${to} | Msg: ${message}`, "color: #10b981; font-weight: bold; background: #ecfdf5; padding: 2px 5px; border-radius: 4px;");
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
};

export const sendEmail = async (to: string, subject: string, body: string) => {
  console.log(`%c[EMAIL SENT] To: ${to} | Subj: ${subject}`, "color: #3b82f6; font-weight: bold; background: #eff6ff; padding: 2px 5px; border-radius: 4px;");
  await new Promise(resolve => setTimeout(resolve, 100));
};

export const sendPush = async (userId: string, title: string, body: string) => {
  console.log(`%c[PUSH SENT] User: ${userId} | ${title}: ${body}`, "color: #f59e0b; font-weight: bold; background: #fffbeb; padding: 2px 5px; border-radius: 4px;");
  await new Promise(resolve => setTimeout(resolve, 100));
};
