# Production Readiness Checklist

This document tracks configuration settings and code blocks that are currently set up for **Testing/Development** and must be reviewed, changed, or removed before going **Live/Production**.

## 1. GPS Verification (TimeClock.tsx)
- **File:** `src/pages/TimeClock.tsx`
- **Setting:** `const REQUIRE_GPS_VERIFICATION = false;`
- **Action:** Change to `true` to enforce strict GPS location checks for Check-In and Job Completion.
- **Reason:** Currently disabled to allow testing on devices without GPS or in environments where location services are flaky.

## 2. Data Seeding (DataContext.tsx)
- **File:** `src/contexts/DataContext.tsx`
- **Function:** `seedMarketData` and `seedPricingData`
- **Action:** Ensure these functions are not accessible or automatically called in production. They are for populating the database with mock data.

## 3. Mock Data Constants (constants.ts)
- **File:** `src/constants.ts`
- **Content:** `MOCK_USERS`, `MOCK_SHIFTS`, etc.
- **Action:** Verify that the application is not falling back to these mock objects in critical production flows if the database connection fails (unless that is the intended offline behavior).

## 4. Supabase Client (lib/supabase.ts)
- **File:** `src/lib/supabase.ts`
- **Action:** Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables point to the **Production** Supabase project, not the testing/dev project.

## 5. AI Service (aiService.ts)
- **File:** `src/services/aiService.ts`
- **Action:** Ensure `GEMINI_API_KEY` is restricted and monitored in the Google Cloud Console for production usage.
- **Features Implemented:**
    - [x] **Job Description Refiner**: Helps clients write better job posts.
    - [x] **Pricing Assistant**: Helps clients set fair prices based on market data.
    - [x] **Pro Quote Builder**: Helps providers send professional, detailed bids.
    - [x] **Fair Price Guide AI**: Integrated AI Price Estimator with a polished UI.
    - [x] **UI Polish**: Minimized text areas in modals for better usability on small screens.

## 6. Firebase Security Rules (firestore.rules)
- **File:** `firestore.rules`
- **Action:** 
    - Restore strict `isValidNotification` check in the `notifications` collection.
    - Change `allow read: if isAuthenticated();` back to `allow read: if isOwner(resource.data.targetUserId) || isAdmin();`.
    - Remove hardcoded admin emails (`gwelshpersonal@gmail.com`, `daddygwelsh@gmail.com`) from the `isAdmin()` function.
- **Reason:** Loosened during dev to resolve permission errors and bypass verification steps.

## 7. Database Instance Strategy (server.ts)
- **File:** `server.ts`
- **Action:** Remove the "Fallback to Default" logic for Firestore connectivity. Ensure the application strictly uses the Enterprise database instance.
- **Reason:** A fallback allows the app to stay functional if the main DB isn't provisioned correctly, but can lead to "split brain" issues where data is spread across two databases.

## 8. Stripe Production Handover
- **Environment:** Update variables in the settings panel.
- **Action:** 
    - `STRIPE_SECRET_KEY`: Use the Live mode secret key.
    - `STRIPE_MEMBERSHIP_PRICE_ID`: Ensure this points to the Live product/price ID.
    - `STRIPE_WEBHOOK_SECRET`: Configure the Production webhook endpoint in the Stripe Dashboard.

## 10. Waitlist Maintenance (categoryRequests)
- **Feature:** Category/Skill waitlist.
- **Action:** 
    - Implement CAPTCHA or rate-limiting for anonymous requests to prevent database spam.
    - Periodically review and purge incomplete or duplicate requests.
    - Ensure a workflow exists to notify emails when a requested category goes live.

## 11. 1099 Compliance & Terminology
- **Action:** Ensure all references to W-2 specific terms (e.g., "Payroll", "Employees", "Wages") remain strictly removed or replaced.
- **Terminology:** "Payroll" has been fully replaced with "Settlements" to mitigate worker misclassification risks. Providers receive "Net Payouts", not "Paychecks".
- **Source of Truth:** The `calculateJobSplit` utility in `src/utils/feeEngine.ts` MUST be used as the definitive calculation engine for all manual and automated settlements. This prevents calculation desync between the UI and the central ledger.
