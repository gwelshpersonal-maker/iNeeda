import React, { useState } from 'react';
import { Rocket, X, Send, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Role } from '../types';

interface CategoryRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoryName: string, description: string, email: string, phoneNumber: string) => Promise<void>;
  userRole: Role;
  initialEmail?: string;
  initialPhone?: string;
}

export const CategoryRequestModal: React.FC<CategoryRequestModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  userRole,
  initialEmail = '',
  initialPhone = ''
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(categoryName.trim(), description.trim(), email.trim(), phone.trim());
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setCategoryName('');
        setDescription('');
        setEmail(initialEmail);
        setPhone(initialPhone);
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Failed to submit category request", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 bg-navy-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-500/20 rounded-xl">
              <Rocket className="w-6 h-6 text-gold-400" />
            </div>
            <h3 className="font-extrabold text-xl tracking-tight">Request Category</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white/70 hover:text-white" />
          </button>
        </div>

        <div className="p-8">
          {isSuccess ? (
            <div className="text-center py-8 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-black text-navy-900 mb-2">Request Received!</h4>
              <p className="text-slate-500 font-medium">
                We've added your request to our waitlist. We'll notify you as soon as this category goes live.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gold-50 border border-gold-100 rounded-2xl p-4 flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-gold-600 shrink-0 mt-1" />
                <p className="text-xs font-semibold text-gold-800 leading-relaxed">
                  {userRole === Role.PROVIDER 
                    ? "Wishes he could be a pro? Tell us what you fix, paint, or build, and we'll get you on the platform."
                    : "Need something done that we don't cover yet? Let us know and we'll recruit a Local Pro for you."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy-900 mb-2 uppercase tracking-wider">
                  Category Name
                </label>
                <input 
                  type="text" 
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Billiards Table Repair"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-gold-100 focus:border-gold-400 transition-all font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-navy-900 mb-2 uppercase tracking-wider">
                    Email
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-gold-100 focus:border-gold-400 transition-all text-sm font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-navy-900 mb-2 uppercase tracking-wider">
                    Phone
                  </label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-gold-100 focus:border-gold-400 transition-all text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy-900 mb-2 uppercase tracking-wider">
                  Details (Optional)
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us a little more about this skill or the service you need..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-gold-100 focus:border-gold-400 transition-all h-32 resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !categoryName.trim() || !email.trim()}
                className="w-full py-4 bg-navy-900 text-gold-400 font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    JOIN THE WAITLIST
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
