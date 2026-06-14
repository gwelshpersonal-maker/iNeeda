import React from 'react';
import { ExternalLink, BookOpen, Building2, ShieldCheck, Scale, FileText } from 'lucide-react';

export const InfoCenter = () => {
    const resources = [
        {
            category: "Starting & Registering a Business",
            icon: <Building2 className="w-5 h-5 text-indigo-500" />,
            links: [
                {
                    title: "PA Department of State - Business Registration",
                    description: "Register your LLC, corporation, or fictitious name (DBA) in Pennsylvania.",
                    url: "https://www.dos.pa.gov/BusinessCharities/Business/Pages/default.aspx"
                },
                {
                    title: "PA Open for Business",
                    description: "The official state resource for starting and running a business in Pennsylvania.",
                    url: "https://dced.pa.gov/business-assistance/small-business-assistance/"
                },
                {
                    title: "IRS - Employer Identification Number (EIN)",
                    description: "Apply for a free EIN online to use for your business bank accounts and taxes.",
                    url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"
                }
            ]
        },
        {
            category: "Taxes & Revenue",
            icon: <FileText className="w-5 h-5 text-emerald-500" />,
            links: [
                {
                    title: "PA Department of Revenue - myPATH",
                    description: "Register for state tax accounts, file returns, and pay PA business taxes.",
                    url: "https://mypath.pa.gov/"
                },
                {
                    title: "PA Sales & Use Tax Guide",
                    description: "Determine if your services or products require you to collect sales tax.",
                    url: "https://www.revenue.pa.gov/TaxTypes/SUT/Pages/default.aspx"
                },
                {
                    title: "Estimated Taxes for Independent Contractors",
                    description: "Federal tax guidelines for gig workers and self-employed individuals.",
                    url: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes"
                }
            ]
        },
        {
            category: "Labor, Licensing, & Insurance",
            icon: <Scale className="w-5 h-5 text-amber-500" />,
            links: [
                {
                    title: "PA Department of Labor & Industry",
                    description: "Information on workers' compensation, unemployment compensation, and labor laws.",
                    url: "https://www.dli.pa.gov/Pages/default.aspx"
                },
                {
                    title: "Home Improvement Contractor Registration (HIC)",
                    description: "If you perform home improvements over $5,000/year, you must register formally.",
                    url: "https://www.attorneygeneral.gov/protect-yourself/home-improvement/contractor-registration/"
                },
                {
                    title: "PA Professional Licensing",
                    description: "Verify or apply for specific professional licenses (plumbing, electrical, etc., vary by municipality).",
                    url: "https://www.dos.pa.gov/ProfessionalLicensing/Pages/default.aspx"
                }
            ]
        },
        {
            category: "Support & Mentorship",
            icon: <BookOpen className="w-5 h-5 text-blue-500" />,
            links: [
                {
                    title: "PA Small Business Development Centers (SBDC)",
                    description: "Free, confidential consulting and training for small business owners in PA.",
                    url: "https://pasbdc.org/"
                },
                {
                    title: "SCORE Mentors Pennsylvania",
                    description: "Connect with experienced business mentors for free advice and workshops.",
                    url: "https://www.score.org/find-mentor"
                }
            ]
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-black mb-2 flex items-center">
                        <BookOpen className="w-8 h-8 mr-3 text-blue-200" />
                        PA Small Business Info Center
                    </h2>
                    <p className="text-blue-100 max-w-2xl text-lg font-medium">
                        Essential resources and official government links to help you manage, register, and grow your independent business in Pennsylvania.
                    </p>
                </div>
                <div className="absolute -right-10 -top-10 opacity-10">
                    <BookOpen className="w-64 h-64" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {resources.map((section, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-3 bg-slate-50 rounded-xl">
                                {section.icon}
                            </div>
                            <h3 className="text-xl font-bold text-navy-900">{section.category}</h3>
                        </div>
                        
                        <div className="space-y-4 flex-1">
                            {section.links.map((link, linkIdx) => (
                                <a 
                                    key={linkIdx} 
                                    href={link.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="group block p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-sm transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="pr-4">
                                            <h4 className="font-bold text-navy-900 group-hover:text-indigo-700 transition-colors mb-1 text-sm">
                                                {link.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {link.description}
                                            </p>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 shrink-0 mt-0.5" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex gap-4 text-sm mt-6">
                <ShieldCheck className="w-6 h-6 text-slate-400 shrink-0" />
                <p className="text-slate-600">
                    <strong>Disclaimer:</strong> The links provided above are for informational purposes only. We do not provide legal or tax advice. For specific questions regarding your business, please consult with a qualified attorney, accountant, or the relevant state agency.
                </p>
            </div>
        </div>
    );
};
