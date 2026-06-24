import express from "express";
import { Resend } from "resend";
import dotenv from "dotenv";
import Stripe from "stripe";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import rateLimit from "express-rate-limit";

dotenv.config();

console.log("SERVER.TS START GEMINI_API_KEY preview:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) : 'none');

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

if (!admin.apps.length) {
    let credential = admin.credential.applicationDefault();
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            credential = admin.credential.cert(serviceAccount);
            console.log("[Firebase Admin] Using FIREBASE_SERVICE_ACCOUNT_KEY from environment.");
        } catch (e: any) {
            console.error(`[Firebase Admin] WARNING: FIREBASE_SERVICE_ACCOUNT_KEY is invalid. Details: ${e.message}`);
            console.error(`[Firebase Admin] Ensure you generate and paste the ENTIRE JSON file from Firebase Console -> Project Settings -> Service Accounts -> Generate new private key.`);
        }
    } else {
        console.warn("[Firebase Admin] No FIREBASE_SERVICE_ACCOUNT_KEY provided. Relying on applicationDefault(), which may lack permissions for the named database.");
    }
    
    admin.initializeApp({
        projectId: firebaseConfig.projectId,
        credential
    });
}

// Ensure we use the correct database ID using getFirestore to avoid potential initialization issues
const db = getFirestore(admin.apps[0], firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId);

console.log(`[Firebase Admin] Initialized for project: ${firebaseConfig.projectId}, database: ${databaseId}`);
console.log('[DEBUG] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
console.log('[DEBUG] VITE_GEMINI_API_KEY present:', !!process.env.VITE_GEMINI_API_KEY);

// Fee Calculation Constants (Replicated from src/constants.ts for security)
const PLATFORM_COMMISSION = 0.15;
const INSURANCE_FEES = {
  LOW: 3.00,
  MEDIUM: 5.00,
  HIGH: 12.00
};
const CATEGORY_RISK_MAPPING: Record<string, string> = {
  MOVING: 'HIGH', PLUMBING: 'HIGH', AUTO: 'HIGH', CONSTRUCTION: 'HIGH', JOBSITE_LABOR: 'HIGH', 
  POWER_WASHING: 'HIGH', PEST_CONTROL: 'HIGH', GUTTER_CLEANING: 'HIGH',
  HANDYMAN: 'MEDIUM', GENERAL_LABOR: 'MEDIUM', LANDSCAPING: 'MEDIUM', SMART_HOME_INSTALL: 'MEDIUM', FURNITURE_ASSEMBLY: 'MEDIUM',
  CLEANING: 'LOW', COMPUTER: 'LOW', WEB_APP_DEV: 'LOW'
};

const calculateExpectedAmount = (jobAmount: number, category: string, hasOwnInsurance: boolean, isEmergency: boolean) => {
    let platformFee = jobAmount * PLATFORM_COMMISSION;
    if (isEmergency) {
        const basePrice = jobAmount / 1.05;
        const emergencyFeeTotal = jobAmount - basePrice;
        platformFee += emergencyFeeTotal * 0.40;
    }
    const riskLevel = CATEGORY_RISK_MAPPING[category] || 'LOW';
    const protectionFee = hasOwnInsurance ? 0 : (INSURANCE_FEES[riskLevel as keyof typeof INSURANCE_FEES] || 3.00);
    return {
        totalToCharge: jobAmount, // Customer pays the full amount
        platformFee: Number(platformFee.toFixed(2)),
        protectionFee: Number(protectionFee.toFixed(2))
    };
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2025-01-27.acacia' as any,
      typescript: true,
  });

  const processStripeConnectTransfer = async (stripeAccountId: string, amount: number, jobId: string) => {
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_mock') {
          console.log(`[Stripe Connect Mock] Transferring $${amount} to account ${stripeAccountId} for Job ${jobId}`);
          return { id: `tr_mock_${Date.now()}` };
      }
      try {
          const transfer = await stripe.transfers.create({
              amount: Math.round(amount * 100),
              currency: 'usd',
              destination: stripeAccountId,
              description: `Payout for Job ${jobId}`,
              metadata: { jobId }
          });
          return transfer;
      } catch (err: any) {
          console.error(`[Stripe Connect Error] Failed transfer to ${stripeAccountId}:`, err.message);
          throw err;
      }
  };

  const processStripeRefund = async (paymentIntentId: string, jobId: string) => {
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_mock') {
          console.log(`[Stripe Refund Mock] Refunding Payment Intent ${paymentIntentId} for Job ${jobId}`);
          return { id: `re_mock_${Date.now()}` };
      }
      try {
          const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
              metadata: { jobId }
          });
          return refund;
      } catch (err: any) {
          console.error(`[Stripe Refund Error] Failed refunding PI ${paymentIntentId}:`, err.message);
          throw err;
      }
  };

  const calculatePlatformFeeServer = (grossAmount: number, rateCategory: string = 'STANDARD') => {
      let platformFee = 0;
      if (rateCategory === 'RECURRING') {
        platformFee = grossAmount * 0.08;
      } else if (rateCategory === 'STANDARD') {
        platformFee = grossAmount * 0.15;
      } else if (rateCategory === 'SPECIALIZED') {
        platformFee = grossAmount * 0.15;
        if (platformFee > 60) {
          platformFee = 60;
        }
      } else {
        platformFee = grossAmount * 0.15;
      }
      return Number(platformFee.toFixed(2));
  };

  const calculateProviderNetServer = (shift: any, provider: any) => {
      const jobAmount = shift.price || 0;
      const category = shift.category || "GENERAL_LABOR";
      const rateCategory = shift.rateCategory || "STANDARD";
      const hasOwnInsurance = shift.hasOwnInsurance ?? provider?.hasOwnInsurance ?? false;
      const isEmergency = shift.isEmergency ?? false;
      
      let platformFee = calculatePlatformFeeServer(jobAmount, rateCategory);
      
      if (isEmergency) {
          const emergencyFeeTotal = 25;
          const platformEmergencyShare = emergencyFeeTotal * 0.40;
          platformFee += platformEmergencyShare;
      }
      
      let baseProtectionFee = 3.00;
      if (shift.insuranceFee !== undefined && shift.insuranceFee !== null) {
          baseProtectionFee = shift.insuranceFee;
      } else {
          const riskLevel = CATEGORY_RISK_MAPPING[category] || 'LOW';
          baseProtectionFee = INSURANCE_FEES[riskLevel as keyof typeof INSURANCE_FEES] || 3.00;
      }
      
      const protectionFee = hasOwnInsurance ? 0 : baseProtectionFee;
      const paymentMethod = provider?.payoutMethod || 'ZELLE';
      const totalDeductions = paymentMethod === 'ZELLE' ? platformFee : (platformFee + protectionFee);
      
      return Number((jobAmount - totalDeductions).toFixed(2));
  };

  const runAutomationsTick = async () => {
      const now = new Date();
      console.log(`[Automations Cron] Tick start at ${now.toISOString()}`);
      try {
          // 1. Process 24-hour Auto-Releases
          const completedShiftsSnap = await db.collection("shifts")
              .where("status", "==", "COMPLETED")
              .get();

          for (const doc of completedShiftsSnap.docs) {
              try {
                  const shift = doc.data();
                  if (shift.isFrozen || shift.escrowStatus === 'FROZEN' || shift.isDisputed || shift.escrowStatus === 'DISPUTED') {
                      continue;
                  }

                  const completedAtDate = shift.completedAt ? (shift.completedAt.toDate ? shift.completedAt.toDate() : new Date(shift.completedAt)) : null;
                  if (!completedAtDate) continue;

                  const reviewExpires = shift.reviewWindowExpiresAt 
                      ? (shift.reviewWindowExpiresAt.toDate ? shift.reviewWindowExpiresAt.toDate() : new Date(shift.reviewWindowExpiresAt))
                      : new Date(completedAtDate.getTime() + 24 * 60 * 60 * 1000);

                  if (now >= reviewExpires) {
                      const providerDoc = await db.collection("users").doc(shift.userId).get();
                      const providerData = providerDoc.exists ? providerDoc.data() : null;
                      const payoutMethod = providerData?.payoutMethod || 'ZELLE';
                      const providerNet = calculateProviderNetServer(shift, providerData);

                      let payoutTimestamp = new Date().toISOString();
                      let isPaid = false;
                      let payoutReconciled = false;

                      if (payoutMethod === 'STRIPE') {
                          const stripeAccountId = providerData?.stripeAccountId;
                          if (stripeAccountId) {
                              await processStripeConnectTransfer(stripeAccountId, providerNet, doc.id);
                              isPaid = true;
                              payoutReconciled = true;
                          } else {
                              console.warn(`[Cron] Stripe provider ${shift.userId} has no stripeAccountId for Job ${doc.id}. Flagging for manual Zelle fallback.`);
                          }
                      }

                      await doc.ref.update({
                          status: 'VERIFIED',
                          escrowStatus: 'RELEASED',
                          isPaid,
                          payoutReconciled,
                          payoutTimestamp,
                          clientFeedback: "Auto-released after 24-hour review window."
                      });

                      const resendApiKey = process.env.RESEND_API_KEY;
                      if (resendApiKey) {
                          const resend = new Resend(resendApiKey);

                          // Notify Client
                          const clientDoc = await db.collection("users").doc(shift.clientId).get();
                          const clientData = clientDoc.exists ? clientDoc.data() : null;
                          if (clientData?.email) {
                              try {
                                  await resend.emails.send({
                                      from: "iNeeda Service <service@notifications.ineeda.work>",
                                      to: [clientData.email],
                                      subject: `Funds Released for Job: ${shift.description || 'Service Job'}`,
                                      html: `<p>Hello,</p><p>The 24-hour review window for your job <strong>${shift.description || 'Service Job'}</strong> has closed, and the escrowed funds of $${shift.price} have been released to the provider.</p><p>Thank you for choosing iNeeda!</p>`
                                  });
                              } catch (emailErr: any) {
                                  console.error("[Cron Email Client] Failed to send email:", emailErr.message);
                              }
                          }

                          // Notify Provider
                          if (providerData?.email) {
                              try {
                                  await resend.emails.send({
                                      from: "iNeeda Service <service@notifications.ineeda.work>",
                                      to: [providerData.email],
                                      subject: `Job Payout Released: ${shift.description || 'Service Job'}`,
                                      html: `<p>Hello,</p><p>The funds for your completed job <strong>${shift.description || 'Service Job'}</strong> have been released.</p><p>Payout Method: ${payoutMethod}</p><p>Amount: $${providerNet}</p><p>Thank you for using iNeeda!</p>`
                                  });
                              } catch (emailErr: any) {
                                  console.error("[Cron Email Provider] Failed to send email:", emailErr.message);
                              }
                          }
                      }
                      console.log(`[Cron] Auto-released shift ${doc.id}`);
                  }
              } catch (shiftErr: any) {
                  console.error(`[Cron] Error auto-releasing shift ${doc.id}:`, shiftErr.message);
              }
          }

          // 2. Process Scheduled/Accepted shifts 2h past start time with no check-in
          const openAcceptedShiftsSnap = await db.collection("shifts").get();
          const overdueShifts = openAcceptedShiftsSnap.docs.filter(doc => {
              const shift = doc.data();
              const isOverdueStatus = shift.status === 'ACCEPTED' || shift.status === 'SCHEDULED';
              if (!isOverdueStatus) return false;
              if (shift.isFrozen || shift.escrowStatus === 'FROZEN') return false;
              if (shift.noShowNotificationSent) return false;

              const startVal = shift.start ? (shift.start.toDate ? shift.start.toDate() : new Date(shift.start)) : null;
              if (!startVal) return false;

              const twoHoursPastStart = new Date(startVal.getTime() + 2 * 60 * 60 * 1000);
              return now > twoHoursPastStart;
          });

          for (const doc of overdueShifts) {
              try {
                  const shift = doc.data();
                  if (shift.userId) {
                      const providerRef = db.collection("users").doc(shift.userId);
                      const providerDoc = await providerRef.get();
                      if (providerDoc.exists) {
                          const provider = providerDoc.data();
                          const currentNoShowCount = provider?.noShowCount || 0;
                          const currentNoShowGigs = provider?.noShowGigs || [];
                          if (!currentNoShowGigs.includes(doc.id)) {
                              await providerRef.update({
                                  noShowCount: currentNoShowCount + 1,
                                  noShowGigs: [...currentNoShowGigs, doc.id]
                              });
                          }
                      }
                  }

                  await doc.ref.update({
                      noShowNotificationSent: true,
                      noShowRecorded: true
                  });

                  const resendApiKey = process.env.RESEND_API_KEY;
                  if (resendApiKey) {
                      const resend = new Resend(resendApiKey);

                      const clientDoc = await db.collection("users").doc(shift.clientId).get();
                      const clientData = clientDoc.exists ? clientDoc.data() : null;
                      if (clientData?.email) {
                          const startVal = shift.start ? (shift.start.toDate ? shift.start.toDate() : new Date(shift.start)) : new Date();
                          try {
                              await resend.emails.send({
                                  from: "iNeeda Service <service@notifications.ineeda.work>",
                                  to: [clientData.email],
                                  subject: `Action Required: Provider No-Show for Job: ${shift.description || 'Service Job'}`,
                                  html: `<p>Hello,</p><p>Your scheduled provider has not checked in for the job <strong>${shift.description || 'Service Job'}</strong>, which was scheduled to start at ${startVal.toLocaleString()}.</p><p>You can choose to either:</p><ul><li><strong>Extend Grace Period:</strong> Give the provider more time. This will update the scheduled start time and clear their no-show record for this job.</li><li><strong>Cancel & Refund:</strong> Cancel the shift and refund the secured payment to your card.</li></ul><p>Please log in to your dashboard to take action.</p>`
                              });
                          } catch (emailErr: any) {
                              console.error("[Cron Email No-Show] Failed to send email:", emailErr.message);
                          }
                      }
                  }
                  console.log(`[Cron] Processed no-show for shift ${doc.id}`);
              } catch (overdueErr: any) {
                  console.error(`[Cron] Error processing overdue shift ${doc.id}:`, overdueErr.message);
              }
          }
      } catch (err: any) {
          console.error("[Automations Cron] Error during tick:", err.message);
      }
  };

  // Run on startup, then every 5 minutes in local development
  runAutomationsTick();
  setInterval(runAutomationsTick, 5 * 60 * 1000);

  // Daily Cron Job to silently deactivate expired subscriptions
  const runDailyCron = async () => {
      try {
          const now = new Date();
          console.log(`[Cron] Running subscription expiry check at ${now.toISOString()}`);
          
          let expiredUsersSnapshot;
          try {
              expiredUsersSnapshot = await db.collection('users')
                  .where('subscriptionStatus', '==', 'active')
                  .where('subscriptionPeriodEnd', '<', now)
                  .get();
          } catch (dbErr: any) {
              if (dbErr.code === 5 || dbErr.code === 7 || dbErr.message?.includes('PERMISSION_DENIED')) {
                  const fallbackDb = getFirestore(admin.apps[0]);
                  expiredUsersSnapshot = await fallbackDb.collection('users')
                      .where('subscriptionStatus', '==', 'active')
                      .where('subscriptionPeriodEnd', '<', now)
                      .get();
              } else {
                  throw dbErr;
              }
          }

          if (!expiredUsersSnapshot.empty) {
              const activeDb = expiredUsersSnapshot.docs[0].ref.firestore;
              const batch = activeDb.batch();
              expiredUsersSnapshot.docs.forEach(doc => {
                  batch.update(doc.ref, { subscriptionStatus: 'inactive' });
                  console.log(`[Cron] Deactivated subscription for user: ${doc.id}`);
              });
              await batch.commit();
          }
      } catch (error) {
          console.error("[Cron] Error running subscription expiry check:", error);
      }
  };

  // Run on startup, then every 24 hours
  runDailyCron();
  setInterval(runDailyCron, 24 * 60 * 60 * 1000);

  // Stripe Webhook (NEEDS RAW BODY - MUST be before express.json())
  app.post("/api/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret || !sig) {
        console.warn("Stripe webhook secret or signature missing. Skipping verification.");
        return res.status(200).json({ received: true });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const { type, data } = event;
    const object: any = data.object;

    try {
        if (type === 'checkout.session.completed') {
            const userId = object.client_reference_id || object.metadata?.userId;
            const subscriptionId = object.subscription;
            const customerId = object.customer;
            
            if (userId && subscriptionId) {
                try {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const updateData = {
                        subscriptionId,
                        stripeCustomerId: customerId,
                        subscriptionStatus: subscription.status,
                        subscriptionPeriodEnd: new Date((subscription as any).current_period_end * 1000)
                    };
                    try {
                        await db.collection("users").doc(userId).set(updateData, { merge: true });
                    } catch (dbErr: any) {
                        if (dbErr.code === 5 || dbErr.code === 7 || dbErr.message?.includes('PERMISSION_DENIED')) {
                            const fallbackDb = getFirestore(admin.apps[0]);
                            await fallbackDb.collection("users").doc(userId).set(updateData, { merge: true });
                        } else {
                            throw dbErr;
                        }
                    }
                    console.log(`Updated subscription for user ${userId} upon checkout completion.`);
                } catch (err) {
                    console.error("Error retrieving subscription during checkout sync:", err);
                }
            } else if (userId) {
                const updateData = {
                    stripeCustomerId: customerId,
                    subscriptionStatus: 'active',
                    subscriptionPeriodEnd: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000) // Fallback
                };
                try {
                    await db.collection("users").doc(userId).set(updateData, { merge: true });
                } catch (dbErr: any) {
                    if (dbErr.code === 5 || dbErr.code === 7 || dbErr.message?.includes('PERMISSION_DENIED')) {
                        const fallbackDb = getFirestore(admin.apps[0]);
                        await fallbackDb.collection("users").doc(userId).set(updateData, { merge: true });
                    } else {
                        throw dbErr;
                    }
                }
            }
        }

        if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
            const subscriptionId = object.id;
            const status = object.status; 
            const periodEnd = new Date(object.current_period_end * 1000);

            let userDocs;
            try {
                userDocs = await db.collection("users").where("subscriptionId", "==", subscriptionId).get();
            } catch (dbErr: any) {
                if (dbErr.code === 5 || dbErr.code === 7 || dbErr.message?.includes('PERMISSION_DENIED')) {
                    const fallbackDb = getFirestore(admin.apps[0]);
                    userDocs = await fallbackDb.collection("users").where("subscriptionId", "==", subscriptionId).get();
                } else {
                    throw dbErr;
                }
            }
            
            if (!userDocs.empty) {
                const userDoc = userDocs.docs[0];
                await userDoc.ref.set({
                    subscriptionStatus: status,
                    subscriptionPeriodEnd: periodEnd
                }, { merge: true });
            }
        }
    } catch (error) {
        console.error("Error processing Stripe webhook:", error);
    }

    res.json({received: true});
  });

  app.use(express.json());

  // API Cache Control
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  // Health check with database connectivity test
  app.get("/api/health", async (req, res) => {
    const health: any = { 
        status: "ok", 
        timestamp: new Date().toISOString(),
        project: firebaseConfig.projectId,
        database: databaseId,
        geminiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
        geminiKeyPreview: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) : 'none',
        viteGeminiKeyLength: process.env.VITE_GEMINI_API_KEY ? process.env.VITE_GEMINI_API_KEY.length : 0
    };
    
    try {
        const testSnap = await db.collection("shifts").limit(1).get();
        health.firestore = "connected";
        health.testSize = testSnap.size;
    } catch (e: any) {
        health.firestore = "error";
        health.error = e.message;
        health.code = e.code;
    }
    
    res.json(health);
  });

  // SECURE Payment Intent with Fee Validation
  app.post("/api/create-payment-intent", async (req, res) => {
      const { jobId, amount, hasOwnInsurance, isEmergency, currency = "usd" } = req.body;

      if (!jobId) return res.status(400).send({ error: { message: "jobId is required" } });

      if (!process.env.STRIPE_SECRET_KEY) {
          console.error("Error: STRIPE_SECRET_KEY is missing in environment variables. Cannot process payment.");
          return res.status(500).json({ error: { message: "Stripe configuration is missing. Payments cannot be processed until the platform provides API keys." } });
      }

      try {
          // Authorization: Authoritatively fetch the job from Firestore
          console.log(`[Stripe] Creating payment intent for Job: ${jobId}`);
          
          let jobAmount = amount || 50; 
          let category = "GENERAL_LABOR";
          
          let jobSnap;
          try {
              jobSnap = await db.collection("shifts").doc(jobId).get();
          } catch (dbErr: any) {
              const errorCode = dbErr.code;
              // Suppress massive stack trace for known auth issues
              if (errorCode === 5 || errorCode === 7) {
                  console.warn(`[Firebase Admin] Could not verify job against DB ${databaseId} due to permission/not-found (Code ${errorCode}). Utilizing fallback client data.`);
              } else {
                  console.error(`[Firebase Admin] Firestore fetch error for db ${databaseId}:`, dbErr.message);
              }
              
              // Fallback to default database if named database fails with NOT_FOUND or PERMISSION_DENIED
              const shouldFallback = errorCode === 5 || errorCode === 7 || 
                                   dbErr.message?.includes('NOT_FOUND') || 
                                   dbErr.message?.includes('PERMISSION_DENIED');

              if (shouldFallback) {
                  try {
                    const fallbackDb = getFirestore(admin.apps[0]);
                    jobSnap = await fallbackDb.collection("shifts").doc(jobId).get();
                  } catch (fallbackErr: any) {
                      if (fallbackErr.code === 5 || fallbackErr.code === 7) {
                          console.warn(`[Firebase Admin] Could not verify job against default DB either (Code ${fallbackErr.code}).`);
                      } else {
                          console.error("[Firebase Admin] Fallback database also failed:", fallbackErr.message);
                      }
                  }
              }
          }

          if (jobSnap && jobSnap.exists) {
              const jobData = jobSnap.data();
              if (jobData && jobData.price > 0) {
                  jobAmount = jobData.price;
                  category = jobData.category || category;
                  console.log(`[Stripe] Verified job price from database: $${jobAmount}`);
              } else {
                  console.warn(`[Stripe] Job ${jobId} does not have a valid price set. Fallback to client amount: $${jobAmount}`);
              }
          } else {
              console.warn(`[Stripe] Job ${jobId} not found or unreachable in DB. Relying on client reported amount: $${jobAmount}`);
          }

          if (jobAmount <= 0) {
              return res.status(400).json({ error: { message: "Job does not have a valid amount" } });
          }

          let amountToCharge = amount * 100;
          let metadataToAttach: any = { jobId };

          if (jobId === 'background-check' || jobId.startsWith('sub_') || jobId.startsWith('subscription_')) {
              // Direct fixed-fee charge, do not apply job formulas
              amountToCharge = Math.round(amount * 100);
              metadataToAttach = { jobId, type: 'fee' };
          } else {
              // Double-check calculations on server for regular jobs
              const expected = calculateExpectedAmount(jobAmount, category, !!hasOwnInsurance, !!isEmergency);
              amountToCharge = Math.round(expected.totalToCharge * 100);
              metadataToAttach = {
                  jobId,
                  category,
                  platformFee: expected.platformFee.toString(),
                  protectionFee: expected.protectionFee.toString()
              };
          }
          
          const paymentIntent = await stripe.paymentIntents.create({
              amount: amountToCharge,
              currency,
              metadata: metadataToAttach,
              automatic_payment_methods: { enabled: true },
          });

          res.send({ clientSecret: paymentIntent.client_secret });
      } catch (e: any) {
          console.error("Stripe Error Details:", e.message);
          res.status(400).send({ error: { message: "Payment initialization failed." } });
      }
  });

  // SECURE Create Membership Session
  app.post("/api/create-membership-session", async (req, res) => {
      const { userId, email, returnUrl } = req.body;
      if (!userId) return res.status(400).json({ error: { message: "userId required" } });

      const priceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID;
      
      const originVal = returnUrl || req.headers.origin;

      if (!priceId || !process.env.STRIPE_SECRET_KEY) {
          console.warn("Using mock membership session because STRIPE_MEMBERSHIP_PRICE_ID is missing.");
          const mockSessionId = `mock_session_${Date.now()}`;
          return res.json({ url: `${originVal}/profile?session_id=${mockSessionId}&tab=financials` });
      }

      try {
          const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              line_items: [{ price: priceId, quantity: 1 }],
              mode: 'subscription',
              customer_email: email,
              client_reference_id: userId,
              success_url: `${originVal}/profile?session_id={CHECKOUT_SESSION_ID}&tab=financials`,
              cancel_url: `${originVal}/profile?tab=financials`,
              metadata: { userId }
          });
          res.json({ url: session.url });
      } catch (e: any) {
          console.error("Stripe Session Error:", e);
          res.status(500).json({ error: { message: e.message } });
      }
  });

  // Create AI Marketing Session
  app.post("/api/create-ai-marketing-session", async (req, res) => {
      const { userId, email, returnUrl } = req.body;
      if (!userId) return res.status(400).json({ error: { message: "userId required" } });

      const priceId = process.env.STRIPE_AI_MARKETING_PRICE_ID;
      const originVal = returnUrl || req.headers.origin;

      if (!priceId || !process.env.STRIPE_SECRET_KEY) {
          console.warn("Using mock AI marketing session because STRIPE_AI_MARKETING_PRICE_ID is missing.");
          const mockSessionId = `mock_ai_session_${Date.now()}`;
          return res.json({ url: `${originVal}/profile?ai_session_id=${mockSessionId}&tab=financials` });
      }

      try {
          const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              line_items: [{ price: priceId, quantity: 1 }],
              mode: 'subscription',
              customer_email: email,
              client_reference_id: userId,
              success_url: `${originVal}/profile?ai_session_id={CHECKOUT_SESSION_ID}&tab=financials`,
              cancel_url: `${originVal}/profile?tab=financials`,
              metadata: { userId, isAiMarketing: "true" }
          });
          res.json({ url: session.url });
      } catch (e: any) {
          console.error("Stripe AI Session Error:", e);
          res.status(500).json({ error: { message: e.message } });
      }
  });

  // SECURE Set Custom Claims for Admin
  app.post("/api/admin/set-claim", async (req, res) => {
      const { uid, role } = req.body;
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: "Missing or invalid authorization header" });
      }

      const idToken = authHeader.split('Bearer ')[1];

      try {
          // Verify the requester's token
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          
          // Check if requester is already an admin, OR if this is the very first admin (bootstrap)
          // For bootstrapping, we can check a master email or just allow the first user if there are no admins based on your use case.
          // Since the user is `gwelshpersonal@gmail.com`, let's allow it as super admin for bootstrapping.
          const isSuperAdminEmail = decodedToken.email === 'gwelshpersonal@gmail.com' || decodedToken.email === 'admin@ineeda.work';
          if (!decodedToken.admin && !isSuperAdminEmail) {
              return res.status(403).json({ error: "Only existing admins can set claims." });
          }

          if (role === 'ADMIN') {
              await admin.auth().setCustomUserClaims(uid, { admin: true });
              console.log(`[Admin] Set admin claim for user: ${uid}`);
          } else {
              // Remove admin claim
              await admin.auth().setCustomUserClaims(uid, { admin: false });
              console.log(`[Admin] Removed admin claim for user: ${uid}`);
          }
          
          res.json({ success: true });
      } catch (error: any) {
          console.error("Error setting custom claims:", error);
          res.status(500).json({ error: error.message || "Internal Server Error" });
      }
  });

  // Cancel Pro Membership Subscription
  app.post("/api/cancel-subscription", async (req, res) => {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      try {
          const userRef = db.collection("users").doc(userId);
          await userRef.set({
              subscriptionStatus: 'canceled'
          }, { merge: true });

          res.json({ success: true });
      } catch (error: any) {
          console.error("Error cancelling pro subscription:", error);
          res.status(500).json({ error: error.message });
      }
  });

  // Cancel AI Marketing Subscription
  app.post("/api/cancel-ai-marketing-subscription", async (req, res) => {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      try {
          const userRef = db.collection("users").doc(userId);
          const userDoc = await userRef.get();
          let currentBadges: string[] = [];
          if (userDoc.exists) {
              currentBadges = userDoc.data()?.badges || [];
          }
          currentBadges = currentBadges.filter(b => b !== 'AI_PREFERRED');

          await userRef.set({
              aiMarketingStatus: 'inactive',
              badges: currentBadges
          }, { merge: true });

          res.json({ success: true });
      } catch (error: any) {
          console.error("Error cancelling AI marketing:", error);
          res.status(500).json({ error: error.message });
      }
  });

  // Verify AI Marketing checkout session
  app.post("/api/verify-ai-marketing-session", async (req, res) => {
      const { sessionId, userId } = req.body;
      if (!sessionId || !userId) return res.status(400).json({ error: "Missing sessionId or userId" });

      if (sessionId.startsWith('mock_ai_session_')) {
          const updateData = {
              aiMarketingId: `mock_ai_sub_${Date.now()}`,
              aiMarketingStatus: 'active',
              aiMarketingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          };

          try {
              const userRef = db.collection("users").doc(userId);
              const userDoc = await userRef.get();
              let currentBadges: string[] = [];
              if (userDoc.exists) {
                  currentBadges = userDoc.data()?.badges || [];
              }
              if (!currentBadges.includes('AI_PREFERRED')) {
                  currentBadges.push('AI_PREFERRED');
              }

              await userRef.set({
                  ...updateData,
                  badges: currentBadges
              }, { merge: true });

              let existingPayments = await db.collection("subscription_payments").where("stripeSessionId", "==", sessionId).get();
              if (existingPayments.empty) {
                  await db.collection("subscription_payments").add({
                      userId,
                      amount: 15.00,
                      date: new Date(),
                      description: 'AI Marketing Premium Tier (Mock)',
                      status: 'Paid',
                      stripeSessionId: sessionId
                  });
              }
              return res.json({ success: true });
          } catch (dbErr: any) {
              const fallbackDb = getFirestore(admin.apps[0]);
              const userRef = fallbackDb.collection("users").doc(userId);
              const userDoc = await userRef.get();
              let currentBadges: string[] = [];
              if (userDoc.exists) {
                  currentBadges = userDoc.data()?.badges || [];
              }
              if (!currentBadges.includes('AI_PREFERRED')) {
                  currentBadges.push('AI_PREFERRED');
              }

              await userRef.set({
                  ...updateData,
                  badges: currentBadges
              }, { merge: true });

              let existingPayments = await fallbackDb.collection("subscription_payments").where("stripeSessionId", "==", sessionId).get();
              if (existingPayments.empty) {
                  await fallbackDb.collection("subscription_payments").add({
                      userId,
                      amount: 15.00,
                      date: new Date(),
                      description: 'AI Marketing Premium Tier (Mock)',
                      status: 'Paid',
                      stripeSessionId: sessionId
                  });
              }
              return res.json({ success: true });
          }
      }

      try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if ((session.payment_status === 'paid' || session.payment_status === 'no_payment_required') && session.subscription) {
              const subscriptionId = session.subscription as string;
              
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              
              const updateData = {
                  aiMarketingId: subscriptionId,
                  aiMarketingStatus: 'active',
                  aiMarketingPeriodEnd: new Date((subscription as any).current_period_end * 1000)
              };

              const userRef = db.collection("users").doc(userId);
              const userDoc = await userRef.get();
              let currentBadges: string[] = [];
              if (userDoc.exists) {
                  currentBadges = userDoc.data()?.badges || [];
              }
              if (!currentBadges.includes('AI_PREFERRED')) {
                  currentBadges.push('AI_PREFERRED');
              }

              try {
                  await userRef.set({
                      ...updateData,
                      badges: currentBadges
                  }, { merge: true });
              } catch (dbErr: any) {
                  const fallbackDb = getFirestore(admin.apps[0]);
                  await fallbackDb.collection("users").doc(userId).set({
                      ...updateData,
                      badges: currentBadges
                  }, { merge: true });
              }

              if (session.payment_status === 'paid') {
                  const amount = session.amount_total ? session.amount_total / 100 : 15.00;
                  
                  let existingPayments;
                  try {
                      existingPayments = await db.collection("subscription_payments")
                          .where("stripeSessionId", "==", sessionId)
                          .get();
                  } catch (dbErr: any) {
                      const fallbackDb = getFirestore(admin.apps[0]);
                      existingPayments = await fallbackDb.collection("subscription_payments")
                          .where("stripeSessionId", "==", sessionId)
                          .get();
                  }
                      
                  if (existingPayments.empty) {
                      const activeDb = existingPayments.docs?.[0]?.ref?.firestore || (existingPayments as any)._query?.firestore || db;
                      await activeDb.collection("subscription_payments").add({
                          userId,
                          amount,
                          date: new Date(),
                          description: 'AI Marketing Premium Tier Upgrade',
                          status: 'Paid',
                          stripeSessionId: sessionId
                        });
                  }
              }

              res.json({ success: true });
          } else {
              res.json({ success: false, status: session.payment_status });
          }
      } catch (error) {
          console.error("Error verifying AI subscription session:", error);
          res.status(500).json({ error: "Verification failed" });
      }
  });

  // Verify Checkout Session API
  app.post("/api/verify-checkout-session", async (req, res) => {
      const { sessionId, userId } = req.body;
      if (!sessionId || !userId) return res.status(400).json({ error: "Missing sessionId or userId" });

      if (sessionId.startsWith('mock_session_')) {
          const updateData = {
              subscriptionId: `mock_sub_${Date.now()}`,
              stripeCustomerId: `mock_cus_${Date.now()}`,
              subscriptionStatus: 'active',
              subscriptionPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          };

          try {
              await db.collection("users").doc(userId).set(updateData, { merge: true });
              let existingPayments = await db.collection("subscription_payments").where("stripeSessionId", "==", sessionId).get();
              if (existingPayments.empty) {
                  await db.collection("subscription_payments").add({
                      userId,
                      amount: 20.00,
                      date: new Date(),
                      description: 'Platform Membership (Mock)',
                      status: 'Paid',
                      stripeSessionId: sessionId
                  });
              }
              return res.json({ success: true });
          } catch (dbErr: any) {
              if (dbErr.code === 5 || dbErr.code === 7 || dbErr.message?.includes('PERMISSION_DENIED')) {
                  const fallbackDb = getFirestore(admin.apps[0]);
                  await fallbackDb.collection("users").doc(userId).set(updateData, { merge: true });
                  let existingPayments = await fallbackDb.collection("subscription_payments").where("stripeSessionId", "==", sessionId).get();
                  if (existingPayments.empty) {
                      await fallbackDb.collection("subscription_payments").add({
                          userId,
                          amount: 20.00,
                          date: new Date(),
                          description: 'Platform Membership (Mock)',
                          status: 'Paid',
                          stripeSessionId: sessionId
                      });
                  }
                  return res.json({ success: true });
              } else {
                  console.error("Mock verify error:", dbErr);
                  return res.status(500).json({ error: "Verification failed" });
              }
          }
      }

      try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if ((session.payment_status === 'paid' || session.payment_status === 'no_payment_required') && session.subscription) {
              const subscriptionId = session.subscription as string;
              const customerId = session.customer as string;
              
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              
              const updateData = {
                  subscriptionId,
                  stripeCustomerId: customerId,
                  subscriptionStatus: subscription.status,
                  subscriptionPeriodEnd: new Date((subscription as any).current_period_end * 1000)
              };

              try {
                  await db.collection("users").doc(userId).set(updateData, { merge: true });
              } catch (dbErr: any) {
                  if (dbErr.code === 5 || dbErr.code === 7 || dbErr.message?.includes('PERMISSION_DENIED')) {
                      const fallbackDb = getFirestore(admin.apps[0]);
                      await fallbackDb.collection("users").doc(userId).set(updateData, { merge: true });
                  } else {
                      throw dbErr;
                  }
              }

              // Create initial ledger payment
              if (session.payment_status === 'paid') {
                  const amount = session.amount_total ? session.amount_total / 100 : 20.00; // default to $20 if not present
                  
                  // Check if payment already exists
                  let existingPayments;
                  try {
                      existingPayments = await db.collection("subscription_payments")
                          .where("stripeSessionId", "==", sessionId)
                          .get();
                  } catch (dbErr: any) {
                      if (dbErr.code === 5 || dbErr.code === 7 || dbErr.message?.includes('PERMISSION_DENIED')) {
                          const fallbackDb = getFirestore(admin.apps[0]);
                          existingPayments = await fallbackDb.collection("subscription_payments")
                              .where("stripeSessionId", "==", sessionId)
                              .get();
                      } else {
                          throw dbErr;
                      }
                  }
                      
                  if (existingPayments.empty) {
                      const activeDb = existingPayments.docs?.[0]?.ref?.firestore || (existingPayments as any)._query?.firestore || db;
                      await activeDb.collection("subscription_payments").add({
                          userId,
                          amount,
                          date: new Date(),
                          description: 'Platform Membership',
                          status: 'Paid',
                          stripeSessionId: sessionId
                      });
                  }
              }

              res.json({ success: true });
          } else {
              res.json({ success: false, status: session.payment_status });
          }
      } catch (error) {
          console.error("Error verifying checkout session:", error);
          res.status(500).json({ error: "Verification failed" });
      }
  });

  // Resend Email Route
  app.post("/api/send-email", async (req, res) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("[Resend] Failed to send email: RESEND_API_KEY is not defined in environment variables.");
      return res.status(500).json({ error: "RESEND_API_KEY is missing from environment variables. Please configure it in your Settings." });
    }

    // Masked key for diagnostic purposes
    const maskedKey = resendApiKey.length > 8 
      ? `${resendApiKey.slice(0, 6)}...${resendApiKey.slice(-4)}`
      : "Invalid Key Length";
    console.log(`[Resend] Initiating email dispatch using API Key: ${maskedKey}`);

    const resend = new Resend(resendApiKey);
    const { to, subject, html } = req.body;

    try {
      console.log(`[Resend] Sending email to ${to} with subject "${subject}"...`);
      // Send to the requested recipient using the verified custom domain with requested display name
      const data = await resend.emails.send({
        from: "iNeeda Service <service@notifications.ineeda.work>",
        to: [to],
        subject,
        html,
      });

      console.log("[Resend] Main email dispatch response:", JSON.stringify(data));

      res.status(200).json(data);
    } catch (error: any) {
      console.error("[Resend] Main send error occurred:", error);
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error);
      res.status(500).json({ error: errorMessage });
    }
  });



  // Dynamic XML Sitemap for SEO & LLM crawlers (GEO/SEO optimization)
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const host = req.get('host') || 'ineeda.work';
      const protocol = req.secure ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      // Static routes
      const staticPages = [
        "",
        "/about",
        "/how-it-works",
        "/services",
        "/pro-services",
        "/support-public",
        "/contact",
        "/public/jobs",
        "/directory"
      ];

      // Dynamic category pages
      const categories = [
        'LANDSCAPING', 'MOVING', 'CLEANING', 'HANDYMAN', 'PLUMBING', 'AUTO', 
        'AUTO_DETAILING', 'CONSTRUCTION', 'COMPUTER', 'GENERAL_LABOR', 'JOBSITE_LABOR', 
        'POWER_WASHING', 'SMART_HOME_INSTALL', 'PEST_CONTROL', 'WEB_APP_DEV', 
        'FURNITURE_ASSEMBLY', 'GUTTER_CLEANING', 'LISTING_TOUCH_UP'
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // 1. Add static pages
      staticPages.forEach(p => {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}${p}</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>${p === "" ? "1.0" : "0.8"}</priority>\n`;
        xml += `  </url>\n`;
      });

      // 2. Add category queries for SEO
      categories.forEach(cat => {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/directory?category=${encodeURIComponent(cat)}</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      });

      // 3. Add dynamic verified professional profiles from Firestore
      try {
        const publicProfilesSnapshot = await db.collection("public_profiles").get();
        if (!publicProfilesSnapshot.empty) {
          publicProfilesSnapshot.forEach(doc => {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}/directory?pro=${encodeURIComponent(doc.id)}</loc>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>0.6</priority>\n`;
            xml += `  </url>\n`;
          });
        }
      } catch (dbErr) {
        console.warn("Could not fetch public_profiles for sitemap:", dbErr);
      }

      xml += `</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err: any) {
      console.error("Error generating sitemap:", err);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Dynamic robots.txt
  app.get("/robots.txt", (req, res) => {
    const host = req.get('host') || 'ineeda.work';
    const protocol = req.secure ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    let robots = `User-agent: *\n`;
    robots += `Allow: /\n`;
    robots += `Allow: /directory\n`;
    robots += `Allow: /public/jobs\n`;
    robots += `Allow: /services\n`;
    robots += `Allow: /pro-services\n`;
    robots += `Allow: /how-it-works\n`;
    robots += `Allow: /about\n`;
    robots += `Disallow: /dashboard\n`;
    robots += `Disallow: /admin\n`;
    robots += `Disallow: /settings\n`;
    robots += `Disallow: /profile\n`;
    robots += `Disallow: /schedule\n`;
    robots += `Disallow: /chat\n`;
    robots += `\n`;
    robots += `Sitemap: ${baseUrl}/sitemap.xml\n`;

    res.header('Content-Type', 'text/plain');
    res.send(robots);
  });

  // Authentication & Geo-Fencing Middleware for AI assistant
  const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header - treat as guest
      (req as any).user = { role: 'GUEST', id: 'guest' };
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Fetch the user document from Firestore to verify their profile location/zip code
      const userDoc = await db.collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.exists ? userDoc.data() : null;

      (req as any).user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        role: userData?.role || 'CLIENT',
        zipCode: userData?.zipCode || '',
        state: userData?.state || ''
      };
      next();
    } catch (error) {
      console.error("Auth Token verification failed:", error);
      return res.status(401).json({ error: "Unauthorized access: Invalid or expired token" });
    }
  };

  const geoFenceCheck = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    // Guests are allowed to query (handled separately by rate-limiter and AI system prompt limits)
    if (user.role === 'GUEST') {
      return next();
    }

    // Verify registered location (must have a valid US state or zipCode check)
    const zip = user.zipCode || '';
    const state = user.state || '';

    // Simple geo-fence: User must have registered a ZIP code or state in the US
    if (!zip && !state) {
       return res.status(403).json({ error: "Access Denied: Service is only available within our active service area. Please update your profile address." });
    }

    next();
  };

  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role === 'GUEST') {
      return res.status(401).json({ error: "Unauthorized: You must be logged in to access this feature." });
    }
    next();
  };

  // Rate Limiter for Gemini endpoints
  const aiRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: (req) => {
      const user = (req as any).user;
      if (user && user.role === 'GUEST') {
        return 5; // Max 5 requests per hour for guests
      }
      return 180; // Max 180 requests per hour for logged-in users
    },
    keyGenerator: (req) => {
      const user = (req as any).user;
      if (user && user.id && user.id !== 'guest') {
        return user.id;
      }
      return req.ip || 'anonymous';
    },
    validate: false,
    message: { error: "Too many requests. Guest users are limited to 5 queries per hour. Please sign up to continue!" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/cron/process-automations", async (req, res) => {
      console.log("[API Cron] Manually triggered process-automations...");
      try {
          await runAutomationsTick();
          res.json({ success: true, message: "Automations executed successfully." });
      } catch (err: any) {
          console.error("[API Cron] Error running automations manually:", err.message);
          res.status(500).json({ error: err.message });
      }
  });

  app.post("/api/shifts/:id/extend-grace-period", authenticateUser, async (req, res) => {
      const shiftId = req.params.id;
      const { newStartTime } = req.body;
      const user = (req as any).user;
      
      if (!user || user.id === 'guest') {
          return res.status(401).json({ error: "Unauthorized" });
      }
      
      try {
          const shiftRef = db.collection('shifts').doc(shiftId);
          const shiftSnap = await shiftRef.get();
          if (!shiftSnap.exists) {
              return res.status(404).json({ error: "Shift not found" });
          }
          const shift = shiftSnap.data();
          if (shift.clientId !== user.id) {
              return res.status(403).json({ error: "Forbidden: You do not own this shift" });
          }
          if (shift.isFrozen || shift.escrowStatus === 'FROZEN') {
              return res.status(400).json({ error: "This shift is frozen by an admin and cannot be modified." });
          }

          // Update shift start time and clear no-show flags
          await shiftRef.update({
              start: admin.firestore.Timestamp.fromDate(new Date(newStartTime)),
              noShowNotificationSent: false,
              noShowRecorded: false
          });

          // Decrement noShowCount for provider if it was recorded
          if (shift.userId && shift.noShowRecorded) {
              const providerRef = db.collection('users').doc(shift.userId);
              const providerDoc = await providerRef.get();
              if (providerDoc.exists) {
                  const providerData = providerDoc.data();
                  const noShowCount = providerData?.noShowCount || 0;
                  const noShowGigs = providerData?.noShowGigs || [];
                  const updatedGigs = noShowGigs.filter((id: string) => id !== shiftId);
                  const newCount = Math.max(0, noShowCount - 1);
                  await providerRef.update({
                      noShowCount: newCount,
                      noShowGigs: updatedGigs
                  });
              }
          }

          res.json({ success: true });
      } catch (err: any) {
          console.error("Error extending grace period:", err);
          res.status(500).json({ error: err.message });
      }
  });

  app.post("/api/shifts/:id/cancel-no-show", authenticateUser, async (req, res) => {
      const shiftId = req.params.id;
      const user = (req as any).user;
      
      if (!user || user.id === 'guest') {
          return res.status(401).json({ error: "Unauthorized" });
      }
      
      try {
          const shiftRef = db.collection('shifts').doc(shiftId);
          const shiftSnap = await shiftRef.get();
          if (!shiftSnap.exists) {
              return res.status(404).json({ error: "Shift not found" });
          }
          const shift = shiftSnap.data();
          if (shift.clientId !== user.id) {
              return res.status(403).json({ error: "Forbidden: You do not own this shift" });
          }
          if (shift.isFrozen || shift.escrowStatus === 'FROZEN') {
              return res.status(400).json({ error: "This shift is frozen by an admin and cannot be cancelled." });
          }

          // Trigger Stripe refund if payment intent ID exists
          if (shift.stripePaymentIntentId) {
              await processStripeRefund(shift.stripePaymentIntentId, shiftId);
          }

          // Update shift status
          await shiftRef.update({
              status: 'CANCELLED',
              escrowStatus: 'REFUNDED',
              cancelledAt: admin.firestore.Timestamp.fromDate(new Date())
          });

          res.json({ success: true });
      } catch (err: any) {
          console.error("Error cancelling no-show shift:", err);
          res.status(500).json({ error: err.message });
      }
  });

  // We will initialize the AI client per request to ensure it uses the latest API key

  app.post("/api/gemini/refine-job", authenticateUser, geoFenceCheck, requireAuth, aiRateLimiter, async (req, res) => {
    try {
      const k = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''; if (!k || k === 'MY_GEMINI_API_KEY' || k.includes('your-api')) {
          return res.status(400).json({ error: "Missing GEMINI_API_KEY. Please provide this in Settings > Secrets." });
      }
      const ai = new GoogleGenAI({ 
          apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const { rawDescription } = req.body;
      if (!rawDescription) return res.status(400).json({error: "rawDescription is required"});
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Refine this job description into a professional format with: 1. Scope, 2. Materials, 3. Timeframe. Be concise. Raw: "${rawDescription}"`,
      });
      res.json({ text: response.text || rawDescription });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/estimate-price", authenticateUser, geoFenceCheck, requireAuth, aiRateLimiter, async (req, res) => {
    try {
      const k = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''; if (!k || k === 'MY_GEMINI_API_KEY' || k.includes('your-api')) {
          return res.status(400).json({ error: "Missing GEMINI_API_KEY. Please provide this in Settings > Secrets." });
      }
      const ai = new GoogleGenAI({ 
          apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const { category, description } = req.body;
      if (!category || !description) return res.status(400).json({error: "category and description are required"});
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Estimate pricing for ${category} in Harrisburg PA. Job: ${description}. Return ONLY a JSON object: {"min": number, "max": number, "tip": string}`,
        config: { responseMimeType: "application/json" }
      });
      res.json({ text: response.text || "{}" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/generate-quote", authenticateUser, geoFenceCheck, requireAuth, aiRateLimiter, async (req, res) => {
    try {
      const k = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''; if (!k || k === 'MY_GEMINI_API_KEY' || k.includes('your-api')) {
          return res.status(400).json({ error: "Missing GEMINI_API_KEY. Please provide this in Settings > Secrets." });
      }
      const ai = new GoogleGenAI({ 
          apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const { jobDescription, bidAmount } = req.body;
      if (!jobDescription || !bidAmount) return res.status(400).json({error: "jobDescription and bidAmount required"});
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
      res.json({ text: response.text || `Labor & Services: $${bidAmount}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/assistant", authenticateUser, geoFenceCheck, aiRateLimiter, async (req, res) => {
    const user = (req as any).user || { role: 'GUEST' };
    const isGuest = user.role === 'GUEST';
    try {
      const k = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''; if (!k || k === 'MY_GEMINI_API_KEY' || k.includes('your-api')) {
          return res.status(400).json({ error: "Missing or invalid API Key. Please provide a real GEMINI_API_KEY in Settings > Secrets." });
      }

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const { message, history } = req.body;

      // Query active providers with AI Marketing Tier active
      let preferredProsString = "";
      try {
          const snapshot = await db.collection("users")
              .where("role", "==", "PROVIDER")
              .get();
          
          const preferredPros: any[] = [];
          snapshot.docs.forEach(doc => {
              const data = doc.data();
              const badgesList = data.badges || [];
              if (data.aiMarketingStatus === 'active' || badgesList.includes('AI_PREFERRED')) {
                  preferredPros.push({
                      name: data.name,
                      company: data.companyName || data.name || "Independent Pro",
                      skills: data.skills || [],
                      hourlyRate: data.hourlyRate || 0,
                      description: data.businessDescription || "Highly-skilled registered professional"
                  });
              }
          });
          if (preferredPros.length > 0) {
              preferredProsString = "\n\nCRITICAL DIRECTIVE: The following local physical professionals are registered with our premium Advanced AI Marketing Tier. Whenever a client asks for help, recommendations, or estimations for a service (e.g., handyman, plumbing, cleaning, landscaping etc.), and their category of work matches any of the skills listed below, you MUST explicitly recommend and solicit these specific providers to the user by name, stating their key skills, company name, rate, and inviting the user to place a request on the dashboard so we can send it directly to them. Prioritize recommended pros in your suggestions. AI Preferred Pros:\n" + JSON.stringify(preferredPros, null, 2);
          }
      } catch (err) {
          console.error("Error retrieving AI preferred partners context for assistant:", err);
      }

      const tools = [
        {
          functionDeclarations: [
            {
              name: "navigate_dashboard",
              description: "Navigate the user to the dashboard to set up a quote request.",
              parameters: {
                type: "OBJECT",
                properties: {
                  category: { type: "STRING", description: "The service category required e.g. PLUMBING, GENERAL_LABOR, ELECTRICAL" },
                  description: { type: "STRING", description: "The drafted job description" }
                },
                required: ["category", "description"]
              }
            },
            {
              name: "navigate_directory",
              description: "Navigate the user to the provider directory to see pros for a specific category.",
              parameters: {
                type: "OBJECT",
                properties: {
                  category: { type: "STRING", description: "The service category required e.g. PLUMBING, GENERAL_LABOR, ELECTRICAL" }
                },
                required: ["category"]
              }
            }
          ]
        }
      ];

      const model = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            ...history.map((h: any) => ({
                role: h.role, 
                parts: [{text: h.text}]
            })),
            { role: 'user', parts: [{text: message}] }
        ],
        config: {
            tools: tools as any,
            systemInstruction: "You are the iNeeda.Work AI assistant. Help clients find local professionals and estimate project costs. When a user asks for a price estimate (e.g., for cleaning, landscaping, handyman tasks, plumbing, or electrical), always provide a realistic price estimate range in your reply text using your general knowledge of standard rates. Always mention briefly that this is a tentative estimate and that registered professionals define their own final prices. After giving the estimate, explain that you can prefill a request for them on their dashboard to get actual bids, and call 'navigate_dashboard' if they explicitly request to start/draft a request, or ask them if they'd like to proceed to the dashboard. Be extremely concise and professional. Once you invoke a tool, the user will be instantly navigated." + 
            (isGuest ? " CRITICAL DIRECTIVE: The current user is an anonymous guest. Keep your answers extremely brief (1-2 sentences maximum). Remind them that to view pro details, contact them, or submit a request to get bids, they must log in or create an account by clicking the link in the chat." : "") +
            preferredProsString,
        }
      });
      
      const response = await model;
      
      if (response.functionCalls && response.functionCalls.length > 0) {
          const call = response.functionCalls[0];
          if (call.name === 'navigate_dashboard') {
              return res.json({ action: 'NAVIGATE_DASHBOARD', category: call.args.category, description: call.args.description });
          } else if (call.name === 'navigate_directory') {
              return res.json({ action: 'NAVIGATE_DIRECTORY', category: call.args.category });
          }
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/job-description", authenticateUser, geoFenceCheck, requireAuth, aiRateLimiter, async (req, res) => {
    try {
      const k = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''; if (!k || k === 'MY_GEMINI_API_KEY' || k.includes('your-api')) {
          return res.status(400).json({ error: "Missing GEMINI_API_KEY. Please provide this in Settings > Secrets." });
      }
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const { title, role } = req.body;
      if (!title || !role) return res.status(400).json({error: "title and role are required"});
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Create a professional job description for a ${title} in the ${role} field. Include key responsibilities and requirements.`,
      });
      res.json({ text: response.text || "No description generated." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
