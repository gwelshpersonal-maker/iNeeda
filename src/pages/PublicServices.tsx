import React, { useState, useMemo } from 'react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';
import { ServiceCategory, Role } from '../types';
import { CategoryRequestModal } from '../components/CategoryRequestModal';
import { useData } from '../contexts/DataContext';

export const CategoryIcon: React.FC<{ name: string, className?: string }> = ({ name, className }) => {
    const IconComponent = (Icons as any)[name] || Icons.Star;
    return <IconComponent className={className} />;
};

export const PublicServices: React.FC = () => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<{title: string, subtitle: string, description: string, emoji?: string, iconName?: string, colorClass?: string} | null>(null);
  const { addCategoryRequest, publicProfiles, isLoading, serviceCategories } = useData();

  const activeCategories = React.useMemo(() => {
    return serviceCategories.filter(c => c.isPublic && c.isActive).map(c => c.id);
  }, [serviceCategories]);

  const getServiceDetails = (categoryId: string) => {
    const found = serviceCategories.find(c => c.id === categoryId);
    if (found) {
        return { name: found.name, iconName: found.iconName, colorClass: found.colorClass, desc: found.description };
    }
    return { name: categoryId.replace(/_/g, ' '), iconName: 'Star', colorClass: 'text-slate-500', desc: 'Specialized service category.' };
  };

  const handleCategoryRequest = async (categoryName: string, description: string, email: string, phoneNumber: string) => {
    await addCategoryRequest({
      id: crypto.randomUUID(),
      categoryName,
      description,
      email,
      phoneNumber,
      status: 'PENDING',
      createdAt: new Date(),
      userRole: Role.CLIENT,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-gold-200">
      <PublicNav />

      <main className="flex-1 pt-32 md:pt-40 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-navy-900 mb-6 leading-tight mx-auto flex items-center justify-center">Find a Pro</h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Whatever you need done, we've got a pro for that. From quick household chores to skilled technical assistance, safely and securely connect with vetted local professionals.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-500 text-lg animate-pulse">Loading active services...</p>
              </div>
            ) : activeCategories.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-500 text-lg">No services currently available. Request a category below!</p>
              </div>
            ) : activeCategories.map((cat, idx) => {
              const service = getServiceDetails(cat);
              const Icon = (Icons as any)[service.iconName || 'Wrench'] || Icons.Wrench;

              return (
                 <div key={idx} onClick={() => setSelectedCategoryInfo({ title: service.name, subtitle: '', description: service.desc, iconName: service.iconName, colorClass: service.colorClass })} className="bg-white rounded-[2rem] p-8 text-center border-2 border-slate-100 hover:border-navy-100 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-full group">
                    <div className="flex flex-col items-center">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-slate-50 ${service.colorClass || ''}`}>
                        <Icon strokeWidth={1.5} className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-navy-900 text-lg mb-2">{service.name}</h3>
                      <p className="text-slate-500 text-xs font-medium line-clamp-2">{service.desc}</p>
                    </div>
                    <div className="mt-6 text-blue-600 font-bold text-sm tracking-wide group-hover:text-blue-700 flex items-center justify-center">
                      Info <Icons.ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                 </div>
              );
            })}
          </div>
          
          <div className="bg-navy-900 rounded-[3rem] p-12 md:p-16 text-center text-white relative overflow-hidden border-8 border-[#f9f5f1] shadow-2xl transform hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-gold-500/10 via-transparent to-transparent"></div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-6 flex flex-col items-center gap-4">
                 <span>Don't see what you're looking for?</span>
              </h2>
              <p className="text-navy-100 text-lg md:text-xl mb-10 leading-relaxed font-medium">
                 Tell us what you need done, and we'll recruit a Local Pro for you and let you know when they're ready.
              </p>
              <button 
                onClick={() => setIsCategoryModalOpen(true)}
                className="inline-flex items-center justify-center px-10 py-5 text-xl font-bold rounded-full bg-gold-400 text-navy-900 hover:bg-gold-300 transition-all shadow-xl hover:-translate-y-1 ring-4 ring-gold-400/30"
              >
                Request New Category
              </button>
            </div>
          </div>

        </div>
      </main>

      <CategoryRequestModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSubmit={handleCategoryRequest}
        userRole={Role.CLIENT}
      />

      {/* Category Info Modal */}
      {selectedCategoryInfo && (
        <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedCategoryInfo(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-navy-900 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full"
            >
              <Icons.X className="w-5 h-5" />
            </button>
            <div className="flex justify-center mb-6 text-navy-900">
              {selectedCategoryInfo.emoji ? (
                <div className="text-6xl">{selectedCategoryInfo.emoji}</div>
              ) : selectedCategoryInfo.iconName ? (
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center bg-slate-50 border border-slate-100 ${selectedCategoryInfo.colorClass || ''}`}>
                  {React.createElement((Icons as any)[selectedCategoryInfo.iconName] || Icons.Wrench, { className: "w-12 h-12", strokeWidth: 1.5 })}
                </div>
              ) : null}
            </div>
            <h3 className="text-2xl font-black text-navy-900 mb-3 text-center">{selectedCategoryInfo.title}</h3>
            {selectedCategoryInfo.subtitle && <p className="text-slate-600 font-medium mb-6 text-center">{selectedCategoryInfo.subtitle}</p>}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-navy-900 mb-2 flex items-center"><Icons.CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" /> Types of Jobs</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                {selectedCategoryInfo.description}
              </p>
            </div>
            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => setSelectedCategoryInfo(null)}
                className="flex-1 py-3 text-navy-900 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
              <Link 
                to="/signup"
                className="flex-1 py-3 text-white font-bold bg-navy-900 hover:bg-navy-800 rounded-xl transition-colors text-center"
              >
                Find Pro
              </Link>
            </div>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
};
