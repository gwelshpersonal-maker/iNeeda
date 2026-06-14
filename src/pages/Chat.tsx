import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BadgeDisplay } from '../components/BadgeDisplay';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Send, User, ArrowLeft, MessageCircle, Trash2, X, Paperclip, File, Download, Image as ImageIcon } from 'lucide-react';
import { Attachment } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const Chat = () => {
  const { currentUser } = useAuth();
  const { shifts, messages, sendMessage, users } = useData();
  const navigate = useNavigate();
  const { id: routeGigId } = useParams();
  
  const [selectedGigId, setSelectedGigId] = useState<string | null>(routeGigId || null);
  const [newMessage, setNewMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

   // Filter gigs where I am involved
   const myChats = useMemo(() => {
       // Group shifts by the counterpart user ID so we only show one thread per person
       const uniqueChats = new Map();
       
       shifts.forEach(s => {
           if (s.userId === currentUser?.id || s.clientId === currentUser?.id) {
               const isClient = currentUser?.id === s.clientId;
               const counterpartId = isClient ? s.userId : s.clientId;
               
               // Only add if we haven't seen this person before, or if this shift has more recent messages
               if (counterpartId) {
                   const existing = uniqueChats.get(counterpartId);
                   const currentMsgs = messages.filter(m => m.shiftId === s.id);
                   const existingMsgs = existing ? messages.filter(m => m.shiftId === existing.id) : [];
                   
                   const currentLastMsg = currentMsgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                   const existingLastMsg = existingMsgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                   
                   if (!existing) {
                       uniqueChats.set(counterpartId, s);
                   } else if (currentLastMsg && existingLastMsg) {
                       if (new Date(currentLastMsg.timestamp) > new Date(existingLastMsg.timestamp)) {
                           uniqueChats.set(counterpartId, s);
                       }
                   } else if (currentLastMsg && !existingLastMsg) {
                       uniqueChats.set(counterpartId, s);
                   }
               }
           }
       });
       
       return Array.from(uniqueChats.values());
   }, [shifts, currentUser?.id, messages]);

   const activeGig = useMemo(() => myChats.find(s => s.id === selectedGigId), [myChats, selectedGigId]);
   
   const chatMessages = useMemo(() => {
     if (!selectedGigId) return [];
     return messages
       .filter(m => m.shiftId === selectedGigId)
       .sort((a, b) => {
           const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
           const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
           return timeA - timeB;
       });
   }, [messages, selectedGigId, currentUser?.id]);

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [chatMessages]);

  const handleSend = () => {
      if ((!newMessage.trim() && pendingAttachments.length === 0) || !selectedGigId || !currentUser) return;
      sendMessage(selectedGigId, currentUser.id, newMessage, pendingAttachments);
      setNewMessage('');
      setPendingAttachments([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      if (pendingAttachments.length + files.length > 5) {
          alert("Maximum 5 attachments allowed per message.");
          return;
      }

      Array.from(files).forEach((file: File) => {
          const isImage = file.type.startsWith('image/');
          const reader = new FileReader();
          
          reader.onload = (event) => {
              if (!event.target?.result) return;
              
              if (isImage) {
                  const img = new Image();
                  img.onload = () => {
                      const canvas = document.createElement('canvas');
                      let width = img.width;
                      let height = img.height;
                      const maxDimension = 800;

                      if (width > height) {
                          if (width > maxDimension) {
                              height = Math.round((height * maxDimension) / width);
                              width = maxDimension;
                          }
                      } else {
                          if (height > maxDimension) {
                              width = Math.round((width * maxDimension) / height);
                              height = maxDimension;
                          }
                      }

                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(img, 0, 0, width, height);
                      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);

                      const newAttachment: Attachment = {
                          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                          type: 'image/jpeg',
                          url: compressedBase64,
                          size: Math.round(compressedBase64.length * 0.75) // Rough approx of binary size
                      };
                      setPendingAttachments(prev => [...prev, newAttachment]);
                  };
                  img.src = event.target.result as string;
              } else {
                  // Non-image files
                  if (file.size > 500 * 1024) {
                      alert(`File ${file.name} is too large (max 500KB).`);
                      return;
                  }
                  const newAttachment: Attachment = {
                      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      name: file.name,
                      type: file.type,
                      url: event.target.result as string,
                      size: file.size
                  };
                  setPendingAttachments(prev => [...prev, newAttachment]);
              }
          };
          reader.readAsDataURL(file);
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
      setPendingAttachments(prev => prev.filter(a => a.id !== id));
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-[calc(100vh-80px)] bg-slate-50">
        {/* Sidebar List */}
        <div className={`w-full md:w-80 bg-white border-r border-slate-200 flex flex-col ${selectedGigId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-100 font-bold text-lg text-navy-900">
                Messages
            </div>
            <div className="flex-1 overflow-y-auto">
                {myChats.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No active conversations.
                    </div>
                ) : (
                    myChats.map(gig => {
                        const isClient = currentUser.id === gig.clientId;
                        const counterpartId = isClient ? gig.userId : gig.clientId;
                        const counterpart = users.find(u => u.id === counterpartId);
                        const chatMsgs = messages.filter(m => m.shiftId === gig.id);
                        const lastMsg = chatMsgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                        return (
                            <div 
                                key={gig.id}
                                onClick={() => setSelectedGigId(gig.id)}
                                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${selectedGigId === gig.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}
                            >
                                <div className="flex items-center gap-3 mb-1">
                                    {counterpart?.profileImage ? (
                                        <img src={counterpart.profileImage} alt={counterpart.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                            {counterpart?.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-navy-900 truncate text-sm flex items-center gap-1">
                                                {counterpart?.name || 'Unknown User'}
                                                <BadgeDisplay badges={counterpart?.badges} size="sm" />
                                            </span>
                                {lastMsg && (
                                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                                        {(() => {
                                            try {
                                                return formatDistanceToNow(new Date(lastMsg.timestamp), { addSuffix: true });
                                            } catch (e) {
                                                return 'recently';
                                            }
                                        })()}
                                    </span>
                                )}
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium truncate">{gig.description}</div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 truncate pl-11">
                                    {lastMsg ? (lastMsg.senderId === currentUser.id ? 'You: ' : '') + lastMsg.content : 'No messages yet'}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col bg-slate-50 ${!selectedGigId ? 'hidden md:flex' : 'flex'}`}>
            {selectedGigId && activeGig ? (
                <>
                    <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center">
                            <button onClick={() => setSelectedGigId(null)} className="md:hidden mr-3 p-2 hover:bg-slate-100 rounded-full">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div>
                                <div className="font-bold text-navy-900 flex items-center gap-2">
                                    {users.find(u => u.id === (currentUser.id === activeGig.clientId ? activeGig.userId : activeGig.clientId))?.name}
                                    <BadgeDisplay badges={users.find(u => u.id === (currentUser.id === activeGig.clientId ? activeGig.userId : activeGig.clientId))?.badges} size="sm" />
                                </div>
                                <div className="text-xs text-slate-500">{activeGig.description}</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        {chatMessages.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm">
                                Start the conversation!
                            </div>
                        )}
                        {chatMessages.map(msg => {
                            const isMe = msg.senderId === currentUser.id;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                    <div className={`relative max-w-[75%] p-3 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                                        {msg.content && <div className="mb-1">{msg.content}</div>}

                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="flex flex-col gap-2 mt-2">
                                                {msg.attachments.map(att => (
                                                    <div key={att.id} className={`rounded-lg overflow-hidden border ${isMe ? 'border-indigo-500/30' : 'border-slate-200'} bg-black/5`}>
                                                        {att.type.startsWith('image/') ? (
                                                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="block relative group/img">
                                                                <img src={att.url} alt={att.name} className="max-w-full h-auto max-h-48 object-cover" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <Download className="w-6 h-6 text-white" />
                                                                </div>
                                                            </a>
                                                        ) : (
                                                            <a href={att.url} download={att.name} className="flex items-center gap-2 p-2 hover:bg-black/5 transition-colors">
                                                                <div className={`p-2 rounded-lg ${isMe ? 'bg-indigo-500/20 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                                                                    <File className="w-4 h-4" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-medium truncate">{att.name}</div>
                                                                    <div className={`text-[10px] ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                                        {(att.size / 1024).toFixed(1)} KB
                                                                    </div>
                                                                </div>
                                                                <Download className="w-4 h-4 shrink-0 opacity-50" />
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            {(() => {
                                                try {
                                                    return formatDistanceToNow(new Date(msg.timestamp));
                                                } catch (e) {
                                                    return 'just now';
                                                }
                                            })()} ago
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 bg-white border-t border-slate-200">
                        {pendingAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                                {pendingAttachments.map(att => (
                                    <div key={att.id} className="relative group flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1.5 pr-8 max-w-[200px]">
                                        {att.type.startsWith('image/') ? (
                                            <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden shrink-0">
                                                <img src={att.url} alt="preview" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                                                <File className="w-4 h-4" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-slate-700 truncate">{att.name}</div>
                                            <div className="text-[10px] text-slate-400">{(att.size / 1024).toFixed(1)} KB</div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => removeAttachment(att.id)}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-full transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <form 
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex gap-2 items-end"
                        >
                            <input 
                                type="file"
                                multiple
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button 
                                type="submit"
                                disabled={!newMessage.trim() && pendingAttachments.length === 0}
                                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-slate-300" />
                    </div>
                    <p>Select a conversation to start chatting</p>
                </div>
            )}
        </div>
    </div>
  );
};
