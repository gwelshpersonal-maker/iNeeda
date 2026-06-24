import React from 'react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-gold-200">
      <PublicNav />

      <main className="flex-1 pt-40 md:pt-48 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
            <h1 className="text-3xl md:text-5xl font-extrabold text-navy-900 mb-4">PRIVACY POLICY</h1>
            <p className="text-sm text-slate-500 mb-8 border-b border-slate-100 pb-8">
              <strong>Last Updated:</strong> May 14, 2026
            </p>

            <div className="prose prose-slate max-w-none font-serif text-slate-700 leading-relaxed">
              <p>"iNeeda" respects your privacy. This Privacy Policy explains how we collect, use, and share your personal information when you use our Platform.</p>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">1. Information We Collect</h3>
              <p>We collect information you provide directly to us when you create an account, post a job, bid on a job, or contact support.</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, phone number, and physical address.</li>
                <li><strong>Pro Information:</strong> Company name, professional skills, profile/portfolio photos, background check data, and Certificates of Insurance (COI).</li>
                <li><strong>Financial Information:</strong> We utilize third-party processors (Stripe, Zelle). We do not store full credit card numbers or bank account details on our servers. We do store your preferred payout method and transaction history.</li>
                <li><strong>Location Data:</strong> We collect precise or approximate location data (e.g., via GPS or your provided address) to match Clients with local Pros, calculate travel distance, and trigger Emergency SMS alerts to nearby Pros.</li>
                <li><strong>Communication Data:</strong> We securely log chat messages, job descriptions, and photos exchanged between Clients and Pros within the app.</li>
              </ul>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">2. How We Use Your Information</h3>
              <p>We use the collected information to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Facilitate the marketplace connection between Clients and Pros.</li>
                <li>Process payments, calculate platform fees, and remit PA state/local taxes.</li>
                <li>Verify Pro identities and manage the "Daily Shield" risk gating logic.</li>
                <li>Send transactional notifications (SMS, Email, Push) regarding job status, bids, en-route alerts, and escrow releases.</li>
                <li>Administer referral programs and pay out referral bonuses.</li>
                <li>Improve Platform functionality, including utilizing AI to help Auto-Refine job descriptions and draft quotes.</li>
              </ul>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">3. How We Share Your Information</h3>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Between Users:</strong> When a Client posts a job, local Pros see the job details and approximate location. When a Pro bids, the Client sees the Pro's profile, ratings, badges, and quote. Upon job acceptance, precise addresses and contact tools are shared to facilitate the work.</li>
                <li><strong>Service Providers:</strong> We share necessary data with trusted third parties that help us operate our business, such as payment processors (Stripe), background check providers, and AI/communication services (e.g., SMS gateways).</li>
                <li><strong>Legal & Compliance:</strong> We may disclose your information if required by law, subpoena, or to protect the safety, rights, or property of "iNeeda", our users, or the public. We share transaction volume data with our payment processors to comply with 1099-K reporting laws.</li>
              </ul>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">4. Data Retention and Security</h3>
              <p>We implement commercially reasonable security measures to protect your data. Information regarding job history, transactions, and tax calculation is retained as required by financial and tax compliance laws.</p>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">5. Your Choices & Rights</h3>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Location Services:</strong> You may disable location tracking through your device settings, though this will significantly limit your ability to post or claim local jobs.</li>
                <li><strong>Communications:</strong> You may toggle "Emergency Texts" and other notification preferences directly in your Account Profile.</li>
                <li><strong>Account Deletion:</strong> You may request account deletion by contacting our Support team. Certain transaction records will be retained for legal and tax compliance purposes.</li>
              </ul>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">6. Contact Us</h3>
              <p>If you have any questions about this Privacy Policy or our data practices, please contact us via the Support section of the app or email us at service@ineeda.work.</p>
            </div>
            
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
