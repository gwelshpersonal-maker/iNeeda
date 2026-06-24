import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Mail, Phone, Building2, Calendar, CheckCircle2, Clock, Inbox } from 'lucide-react';

export const AdminFoundersApplications = () => {
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchApplications = async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'founders_club_applications'), orderBy('submittedAt', 'desc'));
            const snapshot = await getDocs(q);
            const apps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setApplications(apps);
        } catch (error) {
            console.error("Error fetching applications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'founders_club_applications', id), {
                status: newStatus
            });
            setApplications(applications.map(app => 
                app.id === id ? { ...app, status: newStatus } : app
            ));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-8 shadow-soft border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-navy-900 flex items-center gap-3">
                        <Inbox className="w-8 h-8 text-indigo-500" /> Founders Club Applications
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Review Velvet Rope intake submissions.</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100 font-bold">
                    Total: {applications.length}
                </div>
            </div>

            {applications.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">No applications yet</h3>
                    <p className="text-slate-500 max-w-md mx-auto mt-2">When pros submit the founders club application, they will appear here for review.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {applications.map((app) => (
                        <div key={app.id} className="border border-slate-200 rounded-2xl p-6 bg-slate-50 hover:bg-white transition-colors hover:shadow-md">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-slate-200">
                                <div className="flex items-center gap-4 mb-4 md:mb-0">
                                    <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl">
                                        {app.fullName?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-navy-900">{app.fullName}</h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm font-medium text-slate-500">
                                            {app.category && (
                                                <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-md text-navy-700">
                                                    {app.category}
                                                </span>
                                            )}
                                            {app.requestedCategory && (
                                                <span className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-amber-800 font-bold">
                                                    Requested: {app.requestedCategory}
                                                </span>
                                            )}
                                            {app.submittedAt && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" /> 
                                                    {app.submittedAt.toDate ? app.submittedAt.toDate().toLocaleDateString() : 'Recent'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 w-full md:w-auto">
                                    {app.status !== 'APPROVED' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(app.id, 'APPROVED')}
                                            className="flex-1 md:flex-none border border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Approve
                                        </button>
                                    )}
                                    {app.status !== 'REJECTED' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(app.id, 'REJECTED')}
                                            className="flex-1 md:flex-none border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                                        >
                                            Reject
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Contact Info</h4>
                                    <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-6">
                                        <div className="flex items-center gap-3 text-slate-700">
                                            <Mail className="w-5 h-5 text-indigo-400" />
                                            <a href={`mailto:${app.email}`} className="font-medium hover:text-indigo-600 transition-colors">{app.email}</a>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-700">
                                            <Phone className="w-5 h-5 text-emerald-400" />
                                            <a href={`tel:${app.phone}`} className="font-medium hover:text-emerald-600 transition-colors">{app.phone}</a>
                                        </div>
                                        {app.businessName && (
                                            <div className="flex items-center gap-3 text-slate-700">
                                                <Building2 className="w-5 h-5 text-amber-400" />
                                                <span className="font-medium">{app.businessName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Requested Categories</h4>
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
                                        {(() => {
                                            const selectedCats = Array.isArray(app.categories) && app.categories.length > 0
                                                ? app.categories
                                                : (app.category ? app.category.split(',').map((c: string) => c.trim()).filter(Boolean) : []);
                                            
                                            return (
                                                <>
                                                    {selectedCats.length > 0 && (
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selected Launch Categories</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedCats.map((cat: string, idx: number) => (
                                                                    <span key={idx} className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-indigo-700 font-bold text-xs shadow-sm">
                                                                        {cat}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {app.requestedCategory && (
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Category Request</p>
                                                            <span className="inline-block bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-amber-800 font-bold text-xs shadow-sm">
                                                                {app.requestedCategory}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {selectedCats.length === 0 && !app.requestedCategory && (
                                                        <p className="text-sm text-slate-400 italic">No categories selected</p>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Qualifying Answers</h4>
                                    <div className="space-y-4">
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 mb-2 border-b border-slate-100 pb-2">Why maximum 3 quotes matters:</p>
                                            <p className="text-sm text-navy-800 italic">"{app.biddingAnswer}"</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 mb-2 border-b border-slate-100 pb-2">Experience with unpaid invoices (Escrow value):</p>
                                            <p className="text-sm text-navy-800 italic">"{app.escrowAnswer}"</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {app.status === 'APPROVED' && (
                                <div className="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center justify-center font-bold text-sm">
                                    <CheckCircle2 className="w-5 h-5 mr-2" /> Application Approved
                                </div>
                            )}
                            {app.status === 'REJECTED' && (
                                <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-center font-bold text-sm">
                                    Application Rejected
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
