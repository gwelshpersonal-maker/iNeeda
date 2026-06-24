import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Megaphone, Plus, Save, Trash2, Edit2, X } from 'lucide-react';
import { PlatformMessage } from '../types';

export const AdminPlatformMessagesCMS: React.FC = () => {
    const { platformMessages, updatePlatformMessages } = useData();
    const [messages, setMessages] = useState<PlatformMessage[]>(platformMessages || []);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<PlatformMessage>>({});

    // Update local state when context changes
    React.useEffect(() => {
        setMessages(platformMessages || []);
    }, [platformMessages]);

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setEditForm(messages[index]);
    };

    const handleSave = () => {
        if (!editForm.text) return;

        let newMessages = [...messages];
        if (editingIndex === -1) {
            newMessages.push({
                text: editForm.text,
                author: editForm.author || '',
                type: editForm.type || 'brand'
            });
        } else if (editingIndex !== null) {
            newMessages[editingIndex] = {
                text: editForm.text,
                author: editForm.author || '',
                type: editForm.type || 'brand'
            };
        }

        setMessages(newMessages);
        updatePlatformMessages(newMessages);
        setEditingIndex(null);
        setEditForm({});
    };

    const handleDelete = (index: number) => {
        const newMessages = messages.filter((_, i) => i !== index);
        setMessages(newMessages);
        updatePlatformMessages(newMessages);
    };

    const startNew = () => {
        setEditingIndex(-1); // -1 signifies a new item
        setEditForm({ text: '', author: '', type: 'brand' });
    };

    return (
        <div className="bg-white rounded-2xl shadow-soft p-6 border border-slate-200 mt-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-navy-900 flex items-center">
                    <Megaphone className="w-5 h-5 mr-2 text-gold-500" /> Landing Page Banner Messages
                </h2>
                <button onClick={startNew} className="bg-navy-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-navy-800 transition-colors flex items-center">
                    <Plus className="w-4 h-4 mr-2" /> Add Message
                </button>
            </div>

            {editingIndex !== null && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-navy-900">{editingIndex === -1 ? 'New Message' : 'Edit Message'}</h3>
                        <button onClick={() => setEditingIndex(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message Text</label>
                        <input type="text" value={editForm.text || ''} onChange={e => setEditForm({...editForm, text: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm" placeholder="e.g. Choose Who You Trust" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                            <select value={editForm.type || 'brand'} onChange={e => setEditForm({...editForm, type: e.target.value as any})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm">
                                <option value="brand">Brand / Marketing</option>
                                <option value="review">Customer Review</option>
                            </select>
                        </div>
                        {editForm.type === 'review' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Author Name (Optional)</label>
                                <input type="text" value={editForm.author || ''} onChange={e => setEditForm({...editForm, author: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm" placeholder="e.g. Sarah M."/>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setEditingIndex(null)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-bold hover:bg-gold-400 transition-colors shadow flex items-center"><Save className="w-4 h-4 mr-2"/> Save Message</button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Message Text</th>
                            <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {messages.map((msg, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-4 px-4 text-sm font-bold text-navy-900">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase ${msg.type === 'review' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {msg.type}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-sm text-slate-700">
                                    "{msg.text}" {msg.author && <span className="text-slate-400 font-bold ml-1">- {msg.author}</span>}
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <button onClick={() => handleEdit(idx)} className="text-slate-400 hover:text-gold-600 mx-2 transition-colors"><Edit2 className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(idx)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                </td>
                            </tr>
                        ))}
                        {messages.length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-8 text-center text-slate-500 text-sm">
                                    No promotional messages active.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
