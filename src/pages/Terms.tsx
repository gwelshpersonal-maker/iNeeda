import React from 'react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-gold-200">
      <PublicNav />

      <main className="flex-1 pt-40 md:pt-48 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
            <h1 className="text-3xl md:text-5xl font-extrabold text-navy-900 mb-4">TERMS OF SERVICE</h1>
            <p className="text-sm text-slate-500 mb-8 border-b border-slate-100 pb-8">
              <strong>Last Updated:</strong> May 14, 2026
            </p>

            <div className="prose prose-slate max-w-none font-serif text-slate-700 leading-relaxed">
              <p>Welcome to "iNeeda" ("Platform," "we," "us," or "our"). By registering an account, accessing, or using our mobile application or website, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Platform.</p>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">1. Nature of the Platform</h3>
              <p><strong>1.1 Marketplace Facilitator:</strong> "iNeeda" is a technology platform that connects individuals or businesses seeking services ("Clients") with independent service professionals ("Pros").</p>
              <p><strong>1.2 No Agency or Employment:</strong> We do not employ, hire, or direct the Pros. Pros are independent contractors and customers of our software. We are not a party to the actual service contract formed directly between the Client and the Pro. We make no representations or guarantees regarding the quality, safety, or legality of the services provided.</p>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">2. User Accounts & Verification</h3>
              <p><strong>2.1 Account Types:</strong> Users may register as a Client or a Pro. You must provide accurate and up-to-date information.</p>
              <p><strong>2.2 Pro Verification:</strong> To become an active Pro, users must pass a background check and pay a one-time non-refundable activation fee. "iNeeda" reserves the right to deny or revoke Pro access based on the results of this background check or any violation of our community standards.</p>
              <p><strong>2.3 Insurance Gating:</strong> Pros must either opt-in to the "Daily Shield" program (which deducts a per-job fee based on category risk) or upload a valid Certificate of Insurance (COI) subject to Admin verification.</p>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">3. Payments, Escrow, & Fees</h3>
              <p><strong>3.1 Direct Hire:</strong> Clients pay Pros directly for services. "iNeeda" utilizes third-party payment processors (e.g., Stripe) to secure and transfer these funds.</p>
              <p><strong>3.2 Escrow & Funding:</strong> When a Client accepts a Pro's quote or bid, the total job amount is placed on hold (Escrow). Funds are released to the Pro only after the Client verifies job completion or upon the expiration of the automated release window ("Silent Release"), provided no dispute has been filed.</p>
              <p><strong>3.3 Platform Fees:</strong> Pros agree to pay a monthly $20 Software Service Expense (Platform Fee) in exchange for access to the Platform and lead generation. This fee is not deducted from individual jobs.</p>
              <p><strong>3.4 Emergency Requests:</strong> Clients initiating an "Emergency Request" agree to an additional percentage-based priority fee, capped at a maximum limit, to expedite localized Pro alerts.</p>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">4. Taxes & Compliance</h3>
              <p><strong>4.1 Client Sales Tax:</strong> Under Pennsylvania law, "iNeeda" acts as a marketplace facilitator and is required to calculate, collect, and remit applicable state and local sales taxes (including surcharges for Philadelphia and Allegheny County) on certain taxable services.</p>
              <p><strong>4.2 Pro Income Tax:</strong> Pros are independent business owners responsible for their own income and self-employment taxes. "iNeeda" does not withhold taxes or issue 1099-NEC forms. Pros meeting federal or state volume thresholds will receive a Form 1099-K directly from our payment processor (Stripe).</p>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">5. Daily Shield Program</h3>
              <p><strong>5.1 Not Insurance:</strong> The "Daily Shield" program is a limited contractual indemnity provided to active Pros as a feature of the software. <strong>It is not a contract of insurance.</strong> It is subject to its own specific terms, limits, and exclusions.</p>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">6. Dispute Resolution & Arbitration</h3>
              <p><strong>6.1 Job Disputes:</strong> If a Client is dissatisfied with a Pro's work, they must initiate a dispute through the Platform before the Escrow release window expires. We will freeze the funds pending Admin review, but we are not legally responsible for resolving private contractual disputes between Clients and Pros.</p>
              <p><strong>6.2 Legal Arbitration:</strong> Any claim, controversy, or dispute arising out of or relating to these Terms or the use of the Platform shall be settled by binding arbitration administered in <strong>Cumberland County, Pennsylvania</strong>.</p>
              <p><strong>6.3 WAIVER OF JURY TRIAL:</strong> BY USING THIS PLATFORM, YOU EXPRESSLY WAIVE YOUR CONSTITUTIONAL AND STATUTORY RIGHTS TO GO TO COURT AND HAVE A TRIAL IN FRONT OF A JUDGE OR A JURY. YOU ALSO WAIVE THE RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT.</p>

              <h3 className="text-xl font-bold text-navy-900 mt-8 mb-4 font-sans">7. Limitation of Liability</h3>
              <p className="uppercase">To the fullest extent permitted by Pennsylvania law, "iNeeda" shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenue, arising out of or related to the actions, omissions, or services of any Pro or Client on the platform.</p>
            </div>
            
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
