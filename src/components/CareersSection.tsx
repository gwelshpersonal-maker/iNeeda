
import React, { useState } from 'react';
import { generateJobDescription } from '../services/geminiService';
import { Briefcase, Globe, Lock, Sparkles, Send, Users, ChevronRight, Check, X, Eye, MapPin, DollarSign, Clock, Calendar, UserPlus, Phone, Trash2, AlertTriangle, FileText, Upload, Download } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { JobPosting, JobApplication, Role, StaffType, User } from '../types';
import { formatDistanceToNow } from 'date-fns';

export const CareersSection = () => {
    const { currentUser } = useAuth();
    const { jobs, addJob, updateJob, deleteJob, applications, updateApplication, submitApplication, addUser, users } = useData();
    
    // Check if user is Manager OR Admin to grant access to job creation/management
    const isManagerView = currentUser?.role === Role.MANAGER || currentUser?.role === Role.ADMIN;
    
    // Manager State
    const [newTitle, setNewTitle] = useState('');
    const [generatedDesc, setGeneratedDesc] = useState('');
    const [newDepartment, setNewDepartment] = useState<'INTERNAL' | 'EXTERNAL'>('EXTERNAL');
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewingApplicantsFor, setViewingApplicantsFor] = useState<string | null>(null);
    const [jobToDelete, setJobToDelete] = useState<JobPosting | null>(null);

    // Application Modal State
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [selectedJobForApply, setSelectedJobForApply] = useState<JobPosting | null>(null);
    const [applyMessage, setApplyMessage] = useState('');
    const [resumeFile, setResumeFile] = useState<string | null>(null);
    const [resumeName, setResumeName] = useState('');

    // Onboarding Modal State
    const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
    const [selectedAppForHire, setSelectedAppForHire] = useState<JobApplication | null>(null);
    const [hireFormData, setHireFormData] = useState({
        role: Role.EMPLOYEE,
        hourlyRate: 20,
        staffType: StaffType.W2
    });

    // Employee State
    const [employeeView, setEmployeeView] = useState<'JOBS' | 'MY_APPS'>('JOBS');

    const handleGenerate = async () => {
        if (!newTitle) return;
        setIsGenerating(true);
        const desc = await generateJobDescription(newTitle, "Construction/Landscaping");
        setGeneratedDesc(desc);
        setIsGenerating(false);
    };

    const toggleStatus = (job: JobPosting) => {
        updateJob({ ...job, isPublic: !job.isPublic });
    };

    const confirmDelete = (e: React.MouseEvent, job: JobPosting) => {
        e.stopPropagation();
        setJobToDelete(job);
    };

    const executeDelete = () => {
        if (jobToDelete) {
            deleteJob(jobToDelete.id);
            setJobToDelete(null);
        }
    };

    const handlePublish = () => {
        if (!newTitle) return;
        const newJob: JobPosting = {
            id: `job_${Date.now()}`,
            orgId: 'org_1',
            title: newTitle,
            description: generatedDesc,
            payRange: 'TBD',
            isPublic: true,
            department: newDepartment,
            status: 'OPEN',
            createdAt: new Date()
        };
        addJob(newJob);
        setNewTitle('');
        setGeneratedDesc('');
        setNewDepartment('EXTERNAL');
    };

    const handleEasyApply = (job: JobPosting) => {
        if (!currentUser) return;
        
        // Check if already applied
        const existing = applications.find(a => a.jobId === job.id && a.candidateEmail === currentUser.email);
        if (existing) {
            alert("You have already applied for this position.");
            return;
        }

        setSelectedJobForApply(job);
        setApplyMessage('');
        setResumeFile(null);
        setResumeName('');
        setIsApplyModalOpen(true);
    };

    const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setResumeName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setResumeFile(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const submitApplicationForm = () => {
        if (!selectedJobForApply || !currentUser) return;
        const newApp: JobApplication = {
            id: `app_${Date.now()}`,
            jobId: selectedJobForApply.id,
            candidateName: currentUser.name,
            candidateEmail: currentUser.email,
            candidatePhone: currentUser.phone,
            experience: 'Internal Applicant - See Employee Profile',
            message: applyMessage,
            resume: resumeFile || undefined,
            status: 'NEW',
            appliedAt: new Date()
        };
        submitApplication(newApp);
        setIsApplyModalOpen(false);
        setSelectedJobForApply(null);
        alert(`Successfully applied for ${selectedJobForApply.title}!`);
    };

    const getApplicantCount = (jobId: string) => applications.filter(a => a.jobId === jobId).length;
    
    const currentApplicants = viewingApplicantsFor 
        ? applications.filter(a => a.jobId === viewingApplicantsFor) 
        : [];

    const handleStatusUpdate = (app: JobApplication, status: JobApplication['status']) => {
        updateApplication({ ...app, status });
    };

    // Open the onboarding modal to convert Applicant -> Staff
    const initiateOnboarding = (app: JobApplication) => {
        // Check if user already exists by email
        const existingUser = users.find(u => u.email.toLowerCase() === app.candidateEmail.toLowerCase());
        if (existingUser) {
            alert(`Warning: A user with email ${app.candidateEmail} already exists (${existingUser.name}). Proceeding will create a new account.`);
        }

        setSelectedAppForHire(app);
        setHireFormData({
            role: Role.EMPLOYEE,
            hourlyRate: 20,
            staffType: StaffType.W2
        });
        setIsOnboardModalOpen(true);
    };

    const submitHiring = () => {
        if (!selectedAppForHire) return;

        // 1. Create the new User
        const newUser: User = {
            id: `user_${Date.now()}`,
            orgId: 'org_1',
            name: selectedAppForHire.candidateName,
            email: selectedAppForHire.candidateEmail,
            phone: selectedAppForHire.candidatePhone,
            role: hireFormData.role,
            staffType: hireFormData.staffType,
            hourlyRate: hireFormData.hourlyRate,
            isActive: true,
            urgentAlertsEnabled: true
        };
        
        addUser(newUser);

        // 2. Update Application Status
        updateApplication({ ...selectedAppForHire, status: 'HIRED' });

        // 3. Cleanup
        alert(`${newUser.name} has been hired and added to the Staff list!`);
        setIsOnboardModalOpen(false);
        setSelectedAppForHire(null);
    };

    // --- RENDER MANAGER VIEW ---
    if (isManagerView) {
        return (
            <div className="space-y-8 relative animate-in fade-in">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-navy-950">Recruitment Portal</h1>
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded uppercase">
                        {currentUser?.role === Role.ADMIN ? 'ADMIN ACCESS' : 'MANAGER VIEW'}
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Create Form - Manager Only */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gold-200 h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center text-navy-900">
                            <Briefcase className="w-5 h-5 mr-2 text-navy-600"/> Create New Posting
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                                <input 
                                    type="text" 
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none"
                                    placeholder="e.g. Irrigation Technician"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Job Category (Target Audience)</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg border cursor-pointer transition-colors ${newDepartment === 'EXTERNAL' ? 'bg-gold-50 border-gold-400 text-navy-900 font-medium z-10 scale-[1.02]' : 'bg-white border-slate-200 text-slate-500'}`}>
                                        <input 
                                            type="radio" 
                                            name="department" 
                                            className="hidden" 
                                            checked={newDepartment === 'EXTERNAL'} 
                                            onChange={() => setNewDepartment('EXTERNAL')} 
                                        />
                                        Public Job Board
                                    </label>
                                    <label className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg border cursor-pointer transition-colors ${newDepartment === 'INTERNAL' ? 'bg-navy-50 border-navy-400 text-navy-900 font-medium z-10 scale-[1.02]' : 'bg-white border-slate-200 text-slate-500'}`}>
                                        <input 
                                            type="radio" 
                                            name="department" 
                                            className="hidden" 
                                            checked={newDepartment === 'INTERNAL'} 
                                            onChange={() => setNewDepartment('INTERNAL')} 
                                        />
                                        Internal Staff (Careers)
                                    </label>
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !newTitle}
                                className="w-full py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center text-sm font-medium"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                {isGenerating ? 'Asking Gemini...' : 'Generate Description with AI'}
                            </button>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea 
                                    value={generatedDesc}
                                    onChange={(e) => setGeneratedDesc(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none h-40 text-sm"
                                    placeholder="Enter details or generate above..."
                                />
                            </div>

                            <button 
                                onClick={handlePublish}
                                disabled={!newTitle}
                                className="w-full py-3 bg-navy-600 text-white rounded-lg hover:bg-navy-700 font-medium shadow-sm disabled:opacity-50"
                            >
                                Publish Posting
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-navy-950">Active Postings</h2>
                        {jobs.length === 0 && <p className="text-slate-400">No active job postings.</p>}
                        {jobs.map(job => (
                            <div key={job.id} className="bg-white p-4 rounded-xl border border-gold-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-slate-800">{job.title}</h3>
                                    <button 
                                        onClick={() => setViewingApplicantsFor(job.id)}
                                        className="text-sm text-navy-600 hover:underline flex items-center mt-1"
                                    >
                                        <Users className="w-3 h-3 mr-1" /> {getApplicantCount(job.id)} Applicants
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${job.department === 'INTERNAL' ? 'bg-indigo-100 text-indigo-700' : 'bg-gold-100 text-gold-800'}`}>
                                        {job.department === 'INTERNAL' ? 'INTERNAL' : 'EXTERNAL'}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        job.isPublic ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {job.isPublic ? 'PUBLISHED' : 'DRAFT'}
                                    </span>
                                    <button 
                                        onClick={() => toggleStatus(job)}
                                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-navy-600 transition-colors"
                                        title={job.isPublic ? "Unpublish" : "Publish"}
                                    >
                                        {job.isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                    </button>
                                    <button 
                                        onClick={() => setViewingApplicantsFor(job.id)}
                                        className="p-2 bg-navy-50 text-navy-700 rounded-lg hover:bg-navy-100 transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={(e) => confirmDelete(e, job)}
                                        className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                        title="Delete Posting"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        <div className="bg-navy-950 rounded-xl p-6 text-white mt-8 border border-navy-900 shadow-md">
                            <h3 className="font-bold text-lg mb-2 text-gold-200">Public Board Link</h3>
                            <p className="text-navy-200 text-sm mb-4">Share this link to accept applications directly into the system.</p>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-navy-900 p-3 rounded text-sm font-mono text-gold-300 truncate border border-navy-800">
                                    {window.location.origin}/public/jobs
                                </code>
                                <a 
                                    href="/public/jobs" 
                                    target="_blank"
                                    className="bg-gold-500 text-white p-3 rounded hover:bg-gold-600 transition-colors flex items-center justify-center"
                                >
                                    <Send className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Applicants Drawer/Modal */}
                {viewingApplicantsFor && (
                    <div className="fixed inset-0 bg-navy-950/50 flex justify-end z-40 backdrop-blur-sm">
                        <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="font-bold text-navy-900 text-lg">Applicants Pipeline</h2>
                                <button onClick={() => setViewingApplicantsFor(null)} className="p-2 hover:bg-slate-200 rounded-full">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                {currentApplicants.length === 0 ? (
                                    <p className="text-center text-slate-400 py-10">No applicants yet.</p>
                                ) : (
                                    currentApplicants.map(app => (
                                        <div key={app.id} className={`border rounded-xl p-5 bg-white shadow-sm transition-all ${app.status === 'HIRED' ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-bold text-lg text-navy-900">{app.candidateName}</h3>
                                                    <div className="flex flex-col gap-0.5 mt-1">
                                                        <span className="text-xs text-slate-500 flex items-center"><Send className="w-3 h-3 mr-1"/> {app.candidateEmail}</span>
                                                        <span className="text-xs text-slate-500 flex items-center"><Phone className="w-3 h-3 mr-1"/> {app.candidatePhone}</span>
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
                                                    app.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                                                    app.status === 'INTERVIEWING' ? 'bg-amber-100 text-amber-700' :
                                                    app.status === 'HIRED' ? 'bg-emerald-100 text-emerald-700' :
                                                    app.status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-slate-100'
                                                }`}>
                                                    {app.status}
                                                </span>
                                            </div>
                                            
                                            {/* Resume and Message Display */}
                                            {(app.message || app.resume) && (
                                                <div className="bg-blue-50/50 p-3 rounded-lg mb-3 border border-blue-100">
                                                    {app.message && (
                                                        <div className="text-sm text-navy-800 italic mb-2">"{app.message}"</div>
                                                    )}
                                                    {app.resume && (
                                                        <a href={app.resume} download={`resume_${app.candidateName}.pdf`} className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                                            <Download className="w-3 h-3 mr-1" /> Download Resume
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 mb-4 border border-slate-100">
                                                <span className="font-bold text-slate-400 text-xs uppercase block mb-1">Experience</span>
                                                {app.experience}
                                            </div>

                                            {/* Action Buttons based on pipeline status */}
                                            <div className="flex gap-2">
                                                {app.status === 'NEW' || app.status === 'REVIEWING' ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(app, 'INTERVIEWING')}
                                                            className="flex-1 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center"
                                                        >
                                                            <Calendar className="w-3 h-3 mr-1.5" /> Interview
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(app, 'REJECTED')}
                                                            className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-red-600 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : app.status === 'INTERVIEWING' ? (
                                                    <>
                                                        <button 
                                                            onClick={() => initiateOnboarding(app)}
                                                            className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center"
                                                        >
                                                            <UserPlus className="w-3 h-3 mr-1.5" /> Hire & Onboard
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(app, 'REJECTED')}
                                                            className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-red-600 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : app.status === 'HIRED' ? (
                                                    <div className="w-full py-2 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center justify-center border border-green-200">
                                                        <Check className="w-3 h-3 mr-2" /> Staff Account Created
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Onboarding Modal */}
                {isOnboardModalOpen && selectedAppForHire && (
                    <div className="fixed inset-0 bg-navy-950/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border-t-4 border-emerald-500 animate-in fade-in zoom-in-95">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-navy-950">Hire Candidate</h2>
                                    <p className="text-sm text-slate-500">Convert applicant to active staff.</p>
                                </div>
                                <button onClick={() => setIsOnboardModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-4 flex items-center gap-3">
                                <div className="bg-emerald-200 p-2 rounded-full">
                                    <UserPlus className="w-5 h-5 text-emerald-800" />
                                </div>
                                <div>
                                    <p className="font-bold text-emerald-900 text-sm">{selectedAppForHire.candidateName}</p>
                                    <p className="text-xs text-emerald-700">{selectedAppForHire.candidateEmail}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                                        <select 
                                            value={hireFormData.role}
                                            onChange={e => setHireFormData({...hireFormData, role: e.target.value as Role})}
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value={Role.EMPLOYEE}>Employee</option>
                                            <option value={Role.MANAGER}>Manager</option>
                                            <option value={Role.VENDOR}>Vendor</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pay Rate ($/hr)</label>
                                        <input 
                                            type="number"
                                            value={hireFormData.hourlyRate}
                                            onChange={e => setHireFormData({...hireFormData, hourlyRate: parseFloat(e.target.value)})}
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employment Type</label>
                                    <select 
                                        value={hireFormData.staffType}
                                        onChange={e => setHireFormData({...hireFormData, staffType: e.target.value as StaffType})}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value={StaffType.W2}>W2 Full-Time/Part-Time</option>
                                        <option value={StaffType.MARKETPLACE_VENDOR}>Marketplace Vendor</option>
                                    </select>
                                </div>
                                
                                <div className="pt-2 text-xs text-slate-400">
                                    * This will create a user account for them to log in immediately.
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button 
                                    onClick={() => setIsOnboardModalOpen(false)}
                                    className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={submitHiring}
                                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200"
                                >
                                    Confirm Hire
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {jobToDelete && (
                    <div className="fixed inset-0 bg-navy-950/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border-t-4 border-red-500 animate-in zoom-in-95">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-navy-900">Delete Job Posting?</h3>
                                <p className="text-slate-500 text-sm mt-2">
                                    Are you sure you want to delete <strong className="text-navy-900">"{jobToDelete.title}"</strong>?
                                </p>
                                <p className="text-slate-400 text-xs mt-1">This action cannot be undone.</p>
                            </div>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setJobToDelete(null)}
                                    className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={executeDelete}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- RENDER EMPLOYEE/VENDOR VIEW ---
    const openJobs = jobs.filter(j => j.status === 'OPEN');
    const myApps = applications.filter(a => a.candidateEmail === currentUser?.email);

    return (
        <div className="space-y-6 animate-in fade-in">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-navy-950">Come join us @ iNeeda</h1>
                    <p className="text-slate-500">Advance your career with open positions.</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-gold-200">
                    <button 
                        onClick={() => setEmployeeView('JOBS')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${employeeView === 'JOBS' ? 'bg-navy-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Open Jobs
                    </button>
                    <button 
                        onClick={() => setEmployeeView('MY_APPS')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${employeeView === 'MY_APPS' ? 'bg-navy-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        My Applications
                    </button>
                </div>
             </div>

             {employeeView === 'JOBS' ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                     {openJobs.length === 0 && <div className="col-span-full text-center text-slate-400 py-10">No open jobs at this time. Check back later!</div>}
                     {openJobs.map(job => {
                         const applied = myApps.some(a => a.jobId === job.id);
                         return (
                            <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-gold-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-xl font-bold text-navy-900">{job.title}</h3>
                                        {!job.isPublic && (
                                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">INTERNAL ONLY</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 mb-3">
                                        <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1"/> Multiple Sites</span>
                                        <span className="flex items-center text-emerald-600 font-medium"><DollarSign className="w-3.5 h-3.5 mr-1"/> {job.payRange}</span>
                                        <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1"/> Posted {formatDistanceToNow(job.createdAt)} ago</span>
                                    </div>
                                    <hr className="border-slate-100 mb-3" />
                                    <p className="text-sm text-slate-600 mb-6 line-clamp-4 leading-relaxed">{job.description}</p>
                                </div>
                                
                                {applied ? (
                                    <button disabled className="w-full py-2 bg-green-50 text-green-600 font-bold rounded-lg border border-green-200 flex items-center justify-center cursor-not-allowed">
                                        <Check className="w-4 h-4 mr-2" /> Applied
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleEasyApply(job)}
                                        className="w-full py-2 bg-navy-600 text-white font-bold rounded-lg hover:bg-navy-700 transition-colors shadow-sm"
                                    >
                                        Easy Apply
                                    </button>
                                )}
                            </div>
                         );
                     })}
                 </div>
             ) : (
                 <div className="space-y-4 max-w-3xl">
                     {myApps.length === 0 && (
                         <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                             You haven't applied to any jobs yet.
                         </div>
                     )}
                     {myApps.map(app => {
                         const job = jobs.find(j => j.id === app.jobId);
                         return (
                             <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                 <div>
                                     <h3 className="font-bold text-navy-900">{job?.title || 'Unknown Job'}</h3>
                                     <p className="text-xs text-slate-500">Applied {formatDistanceToNow(app.appliedAt)} ago</p>
                                 </div>
                                 <div>
                                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                         app.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                                         app.status === 'INTERVIEWING' ? 'bg-amber-100 text-amber-700' :
                                         app.status === 'HIRED' ? 'bg-green-100 text-green-700' :
                                         app.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-slate-100'
                                     }`}>
                                         {app.status}
                                     </span>
                                 </div>
                             </div>
                         )
                     })}
                 </div>
             )}

            {/* Application Modal */}
            {isApplyModalOpen && selectedJobForApply && (
                <div className="fixed inset-0 bg-navy-950/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-navy-900">Apply for Job</h2>
                                <p className="text-slate-500 text-sm font-medium">{selectedJobForApply.title}</p>
                            </div>
                            <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-navy-900">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Message Field */}
                            <div>
                                <label className="block text-sm font-bold text-navy-900 mb-2">Message to Hiring Manager</label>
                                <textarea 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-200 outline-none resize-none h-32 transition-all"
                                    placeholder="Explain why you're a good fit..."
                                    value={applyMessage}
                                    onChange={(e) => setApplyMessage(e.target.value)}
                                />
                            </div>

                            {/* Resume Upload */}
                            <div>
                                <label className="block text-sm font-bold text-navy-900 mb-2">Attach Resume (Optional)</label>
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-navy-400 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {resumeName ? (
                                            <>
                                                <FileText className="w-8 h-8 text-navy-600 mb-2" />
                                                <p className="text-xs text-navy-700 font-bold truncate max-w-[200px]">{resumeName}</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                                                <p className="text-xs text-slate-500"><span className="font-bold">Click to upload</span> PDF or Word</p>
                                            </>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept=".pdf,.doc,.docx,.txt"
                                        onChange={handleResumeUpload}
                                    />
                                </label>
                            </div>

                            <button 
                                onClick={submitApplicationForm}
                                className="w-full py-3 bg-navy-600 text-white font-bold rounded-xl hover:bg-navy-700 shadow-lg shadow-navy-200 transition-all flex items-center justify-center mt-4"
                            >
                                <Send className="w-4 h-4 mr-2" /> Submit Application
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
