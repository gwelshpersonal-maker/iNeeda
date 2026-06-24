import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, ArrowRight, AlertCircle, Wrench, Hammer, Zap, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text?: string;
  isTool?: boolean;
  toolDetails?: {
    action: 'NAVIGATE_DASHBOARD' | 'NAVIGATE_DIRECTORY';
    category?: string;
    description?: string;
  };
}

const SUGGESTIONS = [
  { label: "Estimate cleaning cost", text: "Estimate a price for deep cleaning a 3-bedroom house in Harrisburg PA" },
  { label: "Find lawn care help", text: "Show me registered landscaping and lawn care professionals in the directory" },
  { label: "Draft handyman request", text: "I need to draft a job description for hanging shelves and assembling furniture" },
  { label: "General labor help", text: "Find a local professional for general labor and yard cleanup" }
];

export const AIChatWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [guestMsgCount, setGuestMsgCount] = useState<number>(() => {
    const val = sessionStorage.getItem('ineeda_guest_msg_count');
    return val ? parseInt(val, 10) : 0;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm your iNeeda.Work AI Assistant. 🌟\n\nI can help you:\n• Estimate costs for cleaning, landscaping, furniture assembly, and handyman tasks.\n• Draft professional job descriptions and direct you to set up a quote request.\n• Help you search our local database of registered home & lawn care professionals.\n\n*Please note: Pricing provided is a rough guide for informational purposes. Final prices are determined independently by each service professional.*"
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Reset guest message counter if the user logs in
  useEffect(() => {
    if (currentUser) {
      sessionStorage.removeItem('ineeda_guest_msg_count');
      setGuestMsgCount(0);
    }
  }, [currentUser]);

  // Scroll messages area to the bottom whenever messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isGenerating) return;

    if (!currentUser && guestMsgCount >= 5) {
      return;
    }

    setErrorStatus(null);
    const userMsgId = `user-${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputMessage('');
    setIsGenerating(true);

    if (!currentUser) {
      const nextCount = guestMsgCount + 1;
      setGuestMsgCount(nextCount);
      sessionStorage.setItem('ineeda_guest_msg_count', nextCount.toString());
    }

    try {
      // Structure the history correctly according to what `/api/gemini/assistant` route accepts
      const historyPayload = messages
        .filter(m => !m.isTool && m.text)
        .map(m => ({
          role: m.role,
          text: m.text || ''
        }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (currentUser) {
        try {
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        } catch (tokenErr) {
          console.error("Error fetching ID token:", tokenErr);
        }
      }

      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Handle function execution navigation
      if (data.action === 'NAVIGATE_DASHBOARD') {
        const dCategory = data.category || 'GENERAL_LABOR';
        const dDesc = data.description || textToSend;
        
        const assistantResponseMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          text: currentUser 
            ? `Great! I've prefilled a quote request for **${dCategory}** containing your details.\n\nRedirecting you to the Request Dashboard now to complete and publish your request...`
            : `Great! I can prefill a quote request for **${dCategory}** containing your details.\n\nSince you are not logged in, redirecting you to sign up first. Once you sign up, your draft request will be waiting for you inside the dashboard!`
        };

        const toolResponseMsg: ChatMessage = {
          id: `tool-${Date.now()}`,
          role: 'model',
          isTool: true,
          toolDetails: {
            action: 'NAVIGATE_DASHBOARD',
            category: dCategory,
            description: dDesc
          }
        };

        setMessages(prev => [...prev, assistantResponseMsg, toolResponseMsg]);

        // Navigate after short delay so the user understands what happened
        setTimeout(() => {
          if (currentUser) {
            navigate(`/dashboard?draft=true&category=${encodeURIComponent(dCategory)}&desc=${encodeURIComponent(dDesc)}`);
          } else {
            navigate(`/signup?category=${encodeURIComponent(dCategory)}&desc=${encodeURIComponent(dDesc)}`);
          }
        }, 1500);

      } else if (data.action === 'NAVIGATE_DIRECTORY') {
        const dCategory = data.category || 'ALL';
        
        const assistantResponseMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          text: `Certainly! I'm opening our local service directory filtered for **${dCategory}** professionals so you can inspect registered pros.`
        };

        const toolResponseMsg: ChatMessage = {
          id: `tool-${Date.now()}`,
          role: 'model',
          isTool: true,
          toolDetails: {
            action: 'NAVIGATE_DIRECTORY',
            category: dCategory
          }
        };

        setMessages(prev => [...prev, assistantResponseMsg, toolResponseMsg]);

        setTimeout(() => {
          navigate(`/directory?category=${encodeURIComponent(dCategory)}`);
        }, 1500);

      } else {
        // Plain text model answer
        const assistantResponseMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          text: data.text || "I apologize, but I received an empty response. Please try reframing your message."
        };
        setMessages(prev => [...prev, assistantResponseMsg]);
      }

    } catch (err: any) {
      console.error("AI Chat Widget Error:", err);
      setErrorStatus(err.message || 'Connection failed.');
      
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: "I ran into a problem communicating with the service. Please make sure that your **GEMINI_API_KEY** is configured correctly in **Settings > Secrets**."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestionClick = (text: string) => {
    sendMessage(text);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: "Hello! I'm your iNeeda.Work AI Assistant. 🌟\n\nI can help you:\n• Estimate costs for cleaning, landscaping, furniture assembly, and handyman tasks.\n• Draft professional job descriptions and direct you to set up a quote request.\n• Help you search our local database of registered home & lawn care professionals.\n\nWhat kind of assistance do you need today?"
      }
    ]);
    setErrorStatus(null);
  };

  // Safe wrapper to prevent any potential render errors from taking down the app
  return (
    <>
      {/* Floating Action Button Launcher with scale transition */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          id="ai-widget-launcher"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform active:scale-95 ${
            isOpen 
              ? 'bg-[#0b1e36] text-gold-400 border border-gold-400/40 rotate-90' 
              : 'bg-navy-950 text-gold-400 border-2 border-gold-400 hover:scale-105'
          }`}
          aria-label="Toggle AI Assistant Chat"
          title="Need help? Talk to iNeeda AI"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <div className="relative">
              <MessageSquare className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-navy-950 animate-pulse"></span>
            </div>
          )}
        </button>
      </div>

      {/* Main Drawer Shell */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-widget-panel"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-96 h-[550px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50"
          >
            {/* Header section themed with deep navy-950 and gold text */}
            <div className="bg-navy-950 text-white p-4 flex items-center justify-between border-b border-navy-900/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center border border-gold-400/30">
                  <Sparkles className="w-4.5 h-4.5 text-gold-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                    iNeeda AI Assistant
                  </h3>
                  <span className="text-[10px] font-mono text-gold-400/80 uppercase tracking-widest block font-semibold leading-3">
                    Inference Node Active
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearChat}
                  className="p-1 px-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1"
                  title="Reset conversation"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Reset</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Message window */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar flex flex-col">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all ${
                        isUser
                          ? 'bg-[#0b1e36] text-white rounded-tr-none'
                          : msg.isTool
                          ? 'bg-amber-50 text-amber-900 border border-amber-200/60 rounded-tl-none font-medium flex flex-col gap-2'
                          : 'bg-white text-navy-900 border border-slate-200/80 rounded-tl-none'
                      }`}
                    >
                      {/* Rich representation of regular messages */}
                      {!msg.isTool ? (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                      ) : (
                        // Representation for backend navigation actions triggers
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                            {msg.toolDetails?.action === 'NAVIGATE_DASHBOARD' ? (
                              <>
                                <Hammer className="w-3.5 h-3.5" />
                                <span>Automation: Prefilling Quote</span>
                              </>
                            ) : (
                              <>
                                <Wrench className="w-3.5 h-3.5" />
                                <span>Automation: Search Directory</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-slate-600">
                            {msg.toolDetails?.action === 'NAVIGATE_DASHBOARD' ? (
                              <p> Prefilled **Category: ${msg.toolDetails.category}**</p>
                            ) : (
                              <p>Searching directory for: **${msg.toolDetails?.category}** professionals</p>
                            )}
                          </div>
                          
                          <button
                            onClick={() => {
                              if (msg.toolDetails?.action === 'NAVIGATE_DASHBOARD') {
                                navigate(`/dashboard?draft=true&category=${encodeURIComponent(msg.toolDetails.category || '')}&desc=${encodeURIComponent(msg.toolDetails.description || '')}`);
                              } else {
                                navigate(`/directory?category=${encodeURIComponent(msg.toolDetails?.category || '')}`);
                              }
                            }}
                            className="w-full flex items-center justify-center gap-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow transition-colors"
                          >
                            <span>Open Page Manually</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Displaying ongoing Generation State */}
              {isGenerating && (
                <div className="flex justify-start w-full">
                  <div className="bg-white text-slate-500 border border-slate-200/85 rounded-2xl rounded-tl-none px-4 py-3.5 text-xs flex items-center gap-3 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
                    </span>
                    <span className="font-semibold tracking-wide animate-pulse">Assistant is constructing answer...</span>
                  </div>
                </div>
              )}

              {/* Display Error Warning bubble */}
              {errorStatus && (
                <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-200/60 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">System Connection Interrupted</p>
                    <p className="opacity-90">{errorStatus}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Selection Overlay */}
            {messages.length === 1 && (
              <div className="p-3 bg-white border-t border-slate-200/60 flex flex-col gap-2 shrink-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1 font-mono">
                  <Zap className="w-3 h-3 text-gold-500" />
                  <span>Suggested tasks</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(sug.text)}
                      className="text-left p-2 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 border border-slate-200/70 rounded-xl text-xs font-medium text-navy-900 transition-all text-ellipsis overflow-hidden whitespace-nowrap active:scale-[0.98]"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Submission Footer Form or Guest Lock CTA */}
            {!currentUser && guestMsgCount >= 5 ? (
              <div className="bg-gradient-to-br from-[#0b1e36] to-navy-950 text-white p-4 border-t border-gold-400/30 flex flex-col items-center text-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-gold-400/10 flex items-center justify-center border border-gold-400/40 animate-bounce">
                  <Sparkles className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gold-400">Unlock Unlimited Access</h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-[280px]">
                    You have used your 5 free guest messages. Sign up or log in to continue chatting and start receiving contractor bids!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/signup');
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-navy-950 font-bold rounded-xl text-xs shadow-lg hover:shadow-gold-400/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  Create Free Account
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/login');
                  }}
                  className="text-xs text-slate-400 hover:text-gold-400 transition-colors font-medium underline font-semibold cursor-pointer"
                >
                  Already have an account? Log In
                </button>
              </div>
            ) : (
              <div className="bg-white border-t border-slate-100 shrink-0">
                <form
                  onSubmit={handleFormSubmit}
                  className="p-3 pb-1.5 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={isGenerating ? "Please wait..." : "Ask estimate, find plumbing list, draft shift..."}
                    disabled={isGenerating}
                    className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-navy-900 placeholder:text-slate-400 text-sm border border-slate-200/80 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1.5 focus:ring-navy-900 focus:border-transparent transition-all outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isGenerating}
                    className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                      inputMessage.trim() && !isGenerating
                        ? 'bg-[#0b1e36] text-gold-400 hover:scale-105 shadow-md active:scale-95 cursor-pointer'
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="px-4 pb-2.5 text-center">
                  <p className="text-[10px] text-slate-400 leading-normal">
                    ⚠️ <strong>Disclaimer:</strong> Estimates are provided by AI for informational purposes. Registered professionals set their own final rates.
                  </p>
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
