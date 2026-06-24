import React, { useState } from 'react';
import { X, Facebook, Copy, CheckCircle2, Star } from 'lucide-react';
import { Shift } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gig: Shift;
  reviewFeedback: string;
  providerName: string;
}

export const FacebookShareModal: React.FC<Props> = ({ isOpen, onClose, gig, reviewFeedback, providerName }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const afterPhoto = gig.completionPhotos?.[0] || gig.afterPhotos?.[0] || gig.arrivalPhotos?.[0];
  
  const textToShare = `I just had an amazing 5-star experience with ${providerName} on iNeeda.Work!\n\n"${reviewFeedback || gig.description}"\n\nFind trusted local pros at https://ineeda.work`;

  const handleShare = () => {
    navigator.clipboard.writeText(textToShare);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Open FB Sharer
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://ineeda.work')}`, '_blank', 'width=600,height=400');
    
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-navy-950/80 backdrop-blur-md animate-in fade-in">
        <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 relative">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                        <Facebook className="w-6 h-6 mr-2 text-[#1877F2]" /> Share the Love
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-100 text-gold-500 mb-4 shadow-inner">
                        <Star className="w-8 h-8 fill-current" />
                    </div>
                    <h4 className="text-lg font-bold text-navy-900 mb-2">Thanks for the 5-Star Review!</h4>
                    <p className="text-sm text-slate-500">
                        Help {providerName} get more jobs by sharing your experience with your friends on Facebook.
                    </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 relative group overflow-hidden">
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                         <button 
                             onClick={() => {
                                navigator.clipboard.writeText(textToShare);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                             }}
                             className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-slate-100 text-slate-500 transition-colors"
                             title="Copy text"
                         >
                             {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                         </button>
                    </div>

                    <div className="text-sm text-navy-800 whitespace-pre-wrap font-medium relative z-0">
                        {textToShare}
                    </div>

                    {afterPhoto && (
                        <div className="mt-4 rounded-xl overflow-hidden shadow-sm relative z-0">
                           <img src={afterPhoto} alt="Proof of work" className="w-full h-40 object-cover" />
                        </div>
                    )}
                </div>
                
                <div className="space-y-3">
                    <button
                        onClick={handleShare}
                        className="w-full py-3 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                    >
                        <Facebook className="w-5 h-5 fill-current" />
                        Copy Text & Share to Facebook
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                    >
                        No Thanks
                    </button>
                </div>
                
            </div>
        </div>
    </div>
  );
};
