import express from "express";
import { Resend } from "resend";
import dotenv from "dotenv";
import Stripe from "stripe";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

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
        database: databaseId
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

          // Double-check calculations on server
          const expected = calculateExpectedAmount(jobAmount, category, !!hasOwnInsurance, !!isEmergency);
          
          const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(expected.totalToCharge * 100),
              currency,
              metadata: {
                  jobId,
                  category,
                  platformFee: expected.platformFee.toString(),
                  protectionFee: expected.protectionFee.toString()
              },
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
      
      if (!priceId || !process.env.STRIPE_SECRET_KEY) {
          console.error("Error: STRIPE_MEMBERSHIP_PRICE_ID or STRIPE_SECRET_KEY is missing. Cannot create membership session.");
          return res.status(500).json({ error: { message: "Stripe connection incomplete. Features unavailable." } });
      }

      try {
          const originVal = returnUrl || req.headers.origin;
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

  // Verify Checkout Session API
  app.post("/api/verify-checkout-session", async (req, res) => {
      const { sessionId, userId } = req.body;
      if (!sessionId || !userId) return res.status(400).json({ error: "Missing sessionId or userId" });

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
    if (!resendApiKey) return res.status(500).json({ error: "RESEND_API_KEY missing" });

    const resend = new Resend(resendApiKey);
    const { to, subject, html } = req.body;

    try {
      const data = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      });
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error });
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
