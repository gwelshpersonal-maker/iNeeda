import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { JobPosting, JobApplication } from '../types';
import { Briefcase, MapPin, DollarSign, Send, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_LOGO_URL } from '../constants';

export const PublicJobBoard = () => {
  const { jobs, submitApplication } = useData();
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Application Form
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      experience: ''
  });

  const publicJobs = jobs.filter(j => j.isPublic && j.status === 'OPEN' && j.department === 'INTERNAL');

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedJob) return;

      const newApp: JobApplication = {
          id: `app_${Date.now()}`,
          jobId: selectedJob.id,
          candidateName: formData.name,
          candidateEmail: formData.email,
          candidatePhone: formData.phone,
          experience: formData.experience,
          status: 'NEW',
          appliedAt: new Date()
      };

      submitApplication(newApp);
      setIsSuccess(true);
      setFormData({ name: '', email: '', phone: '', experience: '' });
  };

  const closeOverlay = () => {
      setSelectedJob(null);
      setIsSuccess(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-navy-900">
        {/* Public Header */}
        <header className="bg-navy-900 text-white py-6 px-4 shadow-lg border-b border-navy-800">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img 
                        src={APP_LOGO_URL} 
                        alt="iNeeda Logo" 
                        className="h-16 w-auto object-contain rounded-xl"
                    />
                </div>
                <Link to="/" className="text-sm font-bold bg-navy-800 hover:bg-navy-700 text-white py-2 px-4 rounded-lg transition-colors border border-navy-600">
                    Staff Login
                </Link>
            </div>
        </header>

        <main className="max-w-4xl mx-auto py-12 px-4">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-display font-black text-navy-900 mb-4">Corporate Careers</h2>
                <p className="text-slate-600 max-w-lg mx-auto text-lg mb-8">
                    Join the <span className="font-bold text-navy-800">iNeeda</span> corporate team. Looking to become a Local Pro instead?
                </p>
                <Link to="/signup" className="inline-flex items-center px-8 py-4 bg-gold-400 text-navy-900 font-black text-lg rounded-xl hover:bg-gold-500 transition-all shadow-lg transform hover:scale-105">
                    <Briefcase className="w-5 h-5 mr-2" />
                    Register as a Local Pro
                </Link>
            </div>

            <div className="grid gap-4">
                {publicJobs.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
                        <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-600">No public openings right now.</h3>
                        <p className="text-slate-500">Check back soon!</p>
                    </div>
                ) : (
                    publicJobs.map(job => (
                        <div key={job.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-gold-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                            <div>
                                <h3 className="text-2xl font-bold text-navy-900 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                    <span className="flex items-center font-medium"><MapPin className="w-4 h-4 mr-1 text-red-500"/> Multiple Sites</span>
                                    <span className="flex items-center text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded"><DollarSign className="w-4 h-4 mr-1"/> {job.payRange}</span>
                                </div>
                                <p className="text-slate-600 mt-3 line-clamp-2 leading-relaxed">{job.description}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedJob(job)}
                                className="px-8 py-3 bg-navy-600 text-white font-bold text-lg rounded-xl hover:bg-gold-400 hover:text-navy-900 transition-all shadow-md shrink-0 whitespace-nowrap transform group-hover:scale-105"
                            >
                                Apply Now
                            </button>
                        </div>
                    ))
                )}
            </div>
        </main>

        {/* Application Modal */}
        {selectedJob && (
            <div className="fixed inset-0 bg-navy-950/90 backdrop-blur-sm z-50 flex justify-end">
                <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                    <div className="p-8">
                        <button onClick={closeOverlay} className="flex items-center text-slate-500 hover:text-navy-900 mb-8 font-bold">
                            <ArrowLeft className="w-5 h-5 mr-2" /> Back to jobs
                        </button>

                        {isSuccess ? (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h3 className="text-3xl font-display font-black text-navy-900 mb-2">You're on the list!</h3>
                                <p className="text-slate-600 mb-8 text-lg">
                                    Thanks for applying to <strong>{selectedJob.title}</strong>. If you're the right pro for the job, we'll be in touch!
                                </p>
                                <button onClick={closeOverlay} className="w-full px-6 py-4 bg-navy-900 text-white font-bold text-lg rounded-xl hover:bg-navy-800 shadow-lg">
                                    Browse More Jobs
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-8 border-b border-slate-100 pb-8">
                                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">Applying For</span>
                                    <h2 className="text-4xl font-display font-black text-navy-900 mt-3 leading-tight">{selectedJob.title}</h2>
                                    <p className="text-xl font-bold text-emerald-600 mt-2">{selectedJob.payRange}</p>
                                    <div className="mt-6 bg-slate-50 p-5 rounded-xl text-slate-700 leading-relaxed border border-slate-200">
                                        {selectedJob.description}
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <h3 className="font-bold text-xl text-navy-900">Your Info</h3>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                                        <input 
                                            required
                                            type="text"
                                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
                                            placeholder="e.g. Joe Handyman"
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                                            <input 
                                                required
                                                type="email"
                                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
                                                placeholder="joe@email.com"
                                                value={formData.email}
                                                onChange={e => setFormData({...formData, email: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Phone</label>
                                            <input 
                                                required
                                                type="tel"
                                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
                                                placeholder="(555) 123-4567"
                                                value={formData.phone}
                                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Why should we pick you?</label>
                                        <textarea 
                                            required
                                            rows={5}
                                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none transition-all font-medium"
                                            placeholder="I've got 5 years experience in..."
                                            value={formData.experience}
                                            onChange={e => setFormData({...formData, experience: e.target.value})}
                                        />
                                    </div>

                                    <button 
                                        type="submit"
                                        className="w-full py-4 bg-gold-400 text-navy-900 font-black text-xl rounded-xl hover:bg-gold-300 transition-all shadow-xl flex items-center justify-center transform hover:scale-[1.02]"
                                    >
                                        <Send className="w-6 h-6 mr-2" /> SEND IT!
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};