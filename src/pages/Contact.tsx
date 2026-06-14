import React, { useState } from 'react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import { MessageSquare, Send, Phone, Mail, MapPin } from 'lucide-react';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const Contact: React.FC = () => {
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgEmail, setMsgEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      try {
        const newDocRef = doc(collection(db, 'supportMessages'));
        const messageData = {
          id: newDocRef.id,
          email: msgEmail,
          subject: msgSubject,
          body: msgBody,
          status: 'NEW',
          createdAt: serverTimestamp()
        };
        await setDoc(newDocRef, messageData);

        alert("Your message has been sent. We'll reply within 24 hours.");
        setMsgSubject('');
        setMsgBody('');
        setMsgEmail('');
      } catch (error) {
        console.error("Failed to send message:", error);
        alert("There was an error sending your message. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-gold-200">
      <PublicNav />

      <main className="flex-1 pt-40 md:pt-48 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-navy-900">Get in Touch</h1>
            <p className="text-slate-500 mt-2">Questions? We're here to help.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-4xl mx-auto">
            
            {/* Contact Form */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
                    <MessageSquare className="w-6 h-6 mr-3 text-gold-500" /> Send a Message
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Your Email</label>
                        <input 
                            type="email"
                            value={msgEmail}
                            onChange={e => setMsgEmail(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-gold-400"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Subject</label>
                        <select 
                            value={msgSubject}
                            onChange={e => setMsgSubject(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-gold-400"
                            required
                        >
                            <option value="">Select a topic...</option>
                            <option value="General">General Inquiry</option>
                            <option value="Payment">Payment Issue</option>
                            <option value="Account">Account Help</option>
                            <option value="Tech">App Bug/Issue</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Message</label>
                        <textarea 
                            value={msgBody}
                            onChange={e => setMsgBody(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-gold-400 h-32 resize-none"
                            placeholder="Describe your issue or question..."
                            required
                        />
                    </div>
                    <button 
                        disabled={isSubmitting}
                        className="w-full py-4 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                        <Send className={`w-5 h-5 mr-2 ${isSubmitting ? 'animate-pulse' : ''}`} /> 
                        {isSubmitting ? 'Sending...' : 'Send Message'}
                    </button>
                </form>
            </div>

            {/* Direct Contact */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start group hover:border-gold-300 transition-colors">
                    <div className="p-4 bg-navy-50 text-navy-600 rounded-xl mr-4 group-hover:bg-gold-50 group-hover:text-gold-600 transition-colors">
                        <Phone className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-navy-900 text-lg mb-1">Call Us</h3>
                        <p className="text-sm text-slate-600 mb-2">Mon-Fri, 8am - 6pm EST</p>
                        <a href="tel:555-123-4567" className="text-gold-600 font-bold hover:underline">(555) 123-4567</a>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start group hover:border-gold-300 transition-colors">
                    <div className="p-4 bg-navy-50 text-navy-600 rounded-xl mr-4 group-hover:bg-gold-50 group-hover:text-gold-600 transition-colors">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-navy-900 text-lg mb-1">Email Us</h3>
                        <p className="text-sm text-slate-600 mb-2">Typically reply within 24 hours.</p>
                        <a href="mailto:support@ineeda.work" className="text-gold-600 font-bold hover:underline">support@ineeda.work</a>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start group hover:border-gold-300 transition-colors">
                    <div className="p-4 bg-navy-50 text-navy-600 rounded-xl mr-4 group-hover:bg-gold-50 group-hover:text-gold-600 transition-colors">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-navy-900 text-lg mb-1">Headquarters</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            123 To Be Determined St.<br/>
                            Camp Hill, PA 17011
                        </p>
                    </div>
                </div>
            </div>

          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
