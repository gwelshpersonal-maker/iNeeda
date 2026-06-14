import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Loader2, Lock, ChevronRight, Info } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock');

interface PaymentModalProps {
  jobId: string;
  amount: number;
  description: string;
  hasOwnInsurance?: boolean;
  isEmergency?: boolean;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  subtotal?: number;
  taxAmount?: number;
}

const CheckoutForm = ({ amount, onSuccess }: { amount: number, onSuccess: (id: string) => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.error("Stripe not initialized");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
        const result = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin, 
            },
            redirect: "if_required",
        });

        if (result.error) {
            setError(result.error.message || "Payment failed");
        } else if (result.paymentIntent && (result.paymentIntent.status === "succeeded" || result.paymentIntent.status === "processing")) {
            onSuccess(result.paymentIntent.id);
        } else {
            console.warn("Unexpected payment status:", result.paymentIntent?.status);
            setError("Unexpected payment status: " + (result.paymentIntent?.status || "Unknown"));
        }
    } catch (e: any) {
        console.error("Payment confirmation error:", e);
        setError(e.message);
    }
    
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button 
        type="submit" 
        disabled={!stripe || processing}
        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center disabled:opacity-50"
      >
        {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay $${amount.toFixed(2)}`}
      </button>
      <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <strong className="block text-navy-900 mb-1">Direct Hire & Escrow Authorization</strong>
        <p className="mb-2">By clicking confirm, you authorize a hold on your card for the Total Settlement amount.</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Escrow:</strong> These funds are securely held by Stripe and will not be released to your Pro until you verify the job is complete (or the standard verification window expires).</li>
          <li><strong>Direct Contract:</strong> You acknowledge that you are hiring this independent professional directly. "iNeeda" is acting solely as the software provider to secure your transaction.</li>
        </ul>
      </div>
    </form>
  );
};

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  jobId,
  amount, 
  description, 
  onSuccess, 
  onCancel,
  hasOwnInsurance,
  isEmergency,
  subtotal,
  taxAmount
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    // Only fetch if we don't have a secret and we're not in an error/timeout state
    if (clientSecret || error || isTimeout) return;

    const timer = setTimeout(() => {
        if (!clientSecret) {
            setIsTimeout(true);
        }
    }, 8000); // 8 second timeout for API (increased for reliability)

    // Create PaymentIntent as soon as the modal opens
    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        jobId, 
        amount,
        hasOwnInsurance: !!hasOwnInsurance, 
        isEmergency: !!isEmergency 
      }),
    })
      .then(async (res) => {
          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error?.message || `Server error: ${res.status}`);
          }
          return res.json();
      })
      .then((data) => {
          if (data.error) throw new Error(data.error.message);
          setClientSecret(data.clientSecret);
      })
      .catch(err => {
          console.error("Error creating payment intent:", err);
          setError(err.message);
          // Only fallback if it's a real error, not just a slow response (handled by timeout)
          if (!isTimeout) {
            setClientSecret("mock_secret_error_" + Date.now());
          }
      })
      .finally(() => clearTimeout(timer));
    
    return () => clearTimeout(timer);
  }, [jobId, hasOwnInsurance, isEmergency, clientSecret, error, isTimeout]);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-navy-950/80 backdrop-blur-md animate-in fade-in">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 relative">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                <Lock className="w-6 h-6 mr-2 text-emerald-600" /> Secure Payment
            </h3>
            <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
            </button>
        </div>
        
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-sm text-slate-500 font-medium">Payment for:</p>
            <div className="relative">
                <p className={`font-bold text-navy-900 ${isExpanded ? '' : 'line-clamp-4'}`}>
                    {description}
                </p>
                {description.length > 150 && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-1 flex items-center"
                    >
                        {isExpanded ? 'Show Less' : 'Read More'} <ChevronRight className={`w-3 h-3 ml-1 transition-transform ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                    </button>
                )}
            </div>
            {subtotal !== undefined && taxAmount !== undefined ? (
                <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Subtotal:</span>
                        <span className="font-bold text-navy-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Sales Tax:</span>
                        <span className="font-bold text-navy-900">${taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                        <span className="font-extrabold text-navy-900">Total:</span>
                        <span className="text-2xl font-black text-emerald-600">${amount.toFixed(2)}</span>
                    </div>
                </div>
            ) : (
                <div className="mt-2 text-2xl font-black text-emerald-600">${amount.toFixed(2)}</div>
            )}
        </div>

        {error && !clientSecret && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 italic">
                Connection issues detected. Switched to offline mock mode.
            </div>
        )}

        {clientSecret && (clientSecret.includes('mock') || isTimeout) ? (
             <div className="space-y-4">
                <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-sm border border-blue-100">
                    <p className="font-bold mb-1">Demo Mode Activated:</p>
                    <p className="mb-2">We'll process this as a secure simulation. No real funds will be moved.</p>
                    <div className="bg-white/50 p-3 rounded-lg border border-blue-100 text-xs font-medium">
                        <p className="text-blue-600 mb-1 font-bold">Safe Environment</p>
                        <ul className="space-y-1 list-disc pl-4 opacity-80">
                            <li>Instant secure processing</li>
                            <li>Verifies escrow logic</li>
                            <li>No card needed for demo</li>
                        </ul>
                    </div>
                </div>
                <button 
                    onClick={(e) => {
                        const btn = e.currentTarget;
                        btn.innerHTML = '<span class="flex items-center"><svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Securing Funds...</span>';
                        btn.disabled = true;
                        setTimeout(() => onSuccess(`pi_mock_${Date.now()}`), 1200);
                    }}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center shadow-lg hover:shadow-emerald-200"
                >
                    Confirm & Fund ${amount.toFixed(2)}
                </button>
                <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                  <strong className="block text-navy-900 mb-1">Direct Hire & Escrow Authorization</strong>
                  <p className="mb-2">By clicking confirm, you authorize a hold on your card for the Total Settlement amount.</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Escrow:</strong> These funds are securely held by Stripe and will not be released to your Pro until you verify the job is complete (or the standard verification window expires).</li>
                    <li><strong>Direct Contract:</strong> You acknowledge that you are hiring this independent professional directly. "iNeeda" is acting solely as the software provider to secure your transaction.</li>
                  </ul>
                </div>
             </div>
        ) : clientSecret ? (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs border border-blue-100">
                    <p className="font-bold mb-1 flex items-center"><Info className="w-3 h-3 mr-1" /> Stripe Test Card:</p>
                    <p className="font-mono">4242 4242 4242 4242 | CVC: 123</p>
                </div>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm amount={amount} onSuccess={onSuccess} />
                </Elements>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                <p className="text-sm text-slate-500 animate-pulse">Initializing secure connection...</p>
                {isTimeout && (
                    <button 
                        onClick={() => setClientSecret("manual_mock_" + Date.now())}
                        className="mt-6 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline decoration-dotted underline-offset-4"
                    >
                        Taking too long? Use Demo Mode
                    </button>
                )}
            </div>
        )}
        
        <div className="mt-4 text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center">
                <Lock className="w-3 h-3 mr-1" /> Payments secured by Stripe
            </p>
        </div>
        </div>
      </div>
    </div>
  );
};
