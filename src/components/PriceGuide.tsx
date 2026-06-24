import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Search, TrendingUp, Info, DollarSign, Tag, ArrowRight, Database, CheckCircle2, Loader2, Upload, Download, FileText, X, Sparkles, Scale, ChevronDown } from 'lucide-react';
import { ShiftStatus, Role, Shift, ServiceCategory } from '../types';
import { ALL_SERVICE_CATEGORIES, AVAILABLE_SERVICE_CATEGORIES } from '../constants';
import { refineJobDescription, getMarketPriceEstimate, MarketPriceEstimate } from '../services/aiService';

interface PriceStats {
  category: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  examples: string[];
}

export const PriceGuide = () => {
  const { users, shifts, seedMarketData, seedPricingData, importHistoricalData, serviceCategories } = useData();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPricingSeeding, setIsPricingSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Estimator State
  const [estimateCategory, setEstimateCategory] = useState<ServiceCategory | ''>('');
  const [estimateDesc, setEstimateDesc] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [marketEstimate, setMarketEstimate] = useState<MarketPriceEstimate | null>(null);

  const isAdmin = currentUser?.role === Role.ADMIN;

  const handleRefineDescription = async () => {
    if (!estimateDesc.trim()) return;

    setIsRefining(true);
    try {
        const refined = await refineJobDescription(estimateDesc);
        setEstimateDesc(refined);
    } catch (error: any) {
        console.error("Failed to refine description", error);
        alert(`AI Refinement failed: ${error.message || 'Check your AI configuration.'}`);
    } finally {
        setIsRefining(false);
    }
  };

  const handleGetMarketEstimate = async () => {
    if (!estimateCategory || !estimateDesc.trim()) return;

    setIsEstimating(true);
    setMarketEstimate(null);
    try {
        const estimate = await getMarketPriceEstimate(estimateCategory, estimateDesc);
        setMarketEstimate(estimate);
    } catch (error: any) {
        console.error("Failed to get market estimate", error);
        alert(`Market Estimate failed: ${error.message || 'Check your AI configuration.'}`);
    } finally {
        setIsEstimating(false);
    }
  };

  const handleDownloadTemplate = () => {
      const headers = ['Category', 'Description', 'Price', 'Date (YYYY-MM-DD)', 'City', 'State'];
      const rows = [
          ['PLUMBING', 'Fix leaky faucet', '150', '2023-10-15', 'New York', 'NY'],
          ['LANDSCAPING', 'Mow lawn 0.5 acre', '80', '2023-10-16', 'Austin', 'TX']
      ];
      
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");
          
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "historical_data_template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
          try {
              const text = e.target?.result as string;
              const lines = text.split('\n');
              const newShifts: Shift[] = [];
              
              // Skip header row
              for (let i = 1; i < lines.length; i++) {
                  const line = lines[i].trim();
                  if (!line) continue;
                  
                  const cols = line.split(',');
                  if (cols.length < 3) continue; // Basic validation
                  
                  const category = cols[0].trim().toUpperCase() as ServiceCategory;
                  const description = cols[1].trim();
                  const price = parseFloat(cols[2].trim());
                  const dateStr = cols[3]?.trim();
                  
                  // Validate category
                  if (!serviceCategories.find(c => c.id === category)) continue;
                  
                  if (category && description && !isNaN(price)) {
                      newShifts.push({
                          id: `import_${Date.now()}_${i}`,
                          userId: `imported_provider`,
                          clientId: `imported_client`,
                          siteId: `site_imported`,
                          start: dateStr ? new Date(dateStr) : new Date(),
                          end: dateStr ? new Date(dateStr) : new Date(),
                          description,
                          category,
                          status: ShiftStatus.COMPLETED,
                          selectionMethod: 'QUICK_BID',
                          isRecurring: false,
                          price,
                          isPaid: true,
                          escrowStatus: 'RELEASED',
                          completedAt: dateStr ? new Date(dateStr) : new Date()
                      });
                  }
              }
              
              if (newShifts.length > 0) {
                  await importHistoricalData(newShifts);
                  alert(`Successfully imported ${newShifts.length} records.`);
                  setIsImportModalOpen(false);
              } else {
                  alert("No valid records found in CSV. Please check the format.");
              }
          } catch (error) {
              console.error("Import error:", error);
              alert("Failed to process file.");
          } finally {
              setIsImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      
      reader.readAsText(file);
  };

  const handleSeedData = () => {
      setIsSeeding(true);
      // Simulate slight delay for effect
      setTimeout(() => {
          seedMarketData();
          setIsSeeding(false);
          setSeedSuccess(true);
          setTimeout(() => setSeedSuccess(false), 3000);
      }, 1500);
  };

  const handleSeedPricing = () => {
      setIsPricingSeeding(true);
      setTimeout(() => {
          seedPricingData();
          setIsPricingSeeding(false);
      }, 1500);
  };

  // Calculate statistics from existing shifts
  const priceStats = useMemo(() => {
    const statsMap: Record<string, { prices: number[], examples: string[] }> = {};

    // Filter relevant shifts (Accepted/Completed/Verified) to get real market data
    // Also include Open Requests to show what people are *offering*, but weight them less ideally. 
    // For simplicity, let's use all shifts that have a price > 0.
    const relevantShifts = shifts.filter(s => 
      s.price && s.price > 0 && 
      (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED || s.status === ShiftStatus.OPEN_REQUEST)
    );

    relevantShifts.forEach(shift => {
      // If search term exists, filter strictly by description matching
      if (searchTerm && !shift.description.toLowerCase().includes(searchTerm.toLowerCase()) && !shift.category.toLowerCase().includes(searchTerm.toLowerCase())) {
          return;
      }

      const cat = shift.category;
      if (!statsMap[cat]) {
        statsMap[cat] = { prices: [], examples: [] };
      }
      statsMap[cat].prices.push(shift.price || 0);
      
      // Keep up to 3 recent unique examples
      if (statsMap[cat].examples.length < 3 && !statsMap[cat].examples.includes(shift.description)) {
          statsMap[cat].examples.push(shift.description);
      }
    });

    const results: PriceStats[] = Object.entries(statsMap).map(([category, data]) => {
      const sum = data.prices.reduce((a, b) => a + b, 0);
      const avg = sum / data.prices.length;
      const min = Math.min(...data.prices);
      const max = Math.max(...data.prices);

      return {
        category,
        count: data.prices.length,
        avgPrice: avg,
        minPrice: min,
        maxPrice: max,
        examples: data.examples
      };
    });

    return results.sort((a, b) => b.count - a.count); // Sort by most popular
  }, [shifts, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* Admin Market Calibration Tool */}
      {isAdmin && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                  <h2 className="text-lg font-bold text-navy-900 flex items-center">
                      <Database className="w-5 h-5 mr-2 text-blue-600" /> Market Calibration
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                      Inject historical data to stabilize pricing averages for Day 1 accuracy.
                  </p>
              </div>
              <div className="flex gap-4">
                  <button 
                      onClick={() => setIsImportModalOpen(true)}
                      className="px-6 py-3 rounded-xl font-bold flex items-center shadow-md transition-all bg-navy-900 text-white hover:bg-navy-800"
                  >
                      <Upload className="w-4 h-4 mr-2" /> Populate Historical Data
                  </button>
                  <button 
                      onClick={handleSeedPricing}
                      disabled={isPricingSeeding}
                      className="px-6 py-3 rounded-xl font-bold flex items-center shadow-md transition-all bg-gold-400 text-navy-900 hover:bg-gold-500"
                  >
                      {isPricingSeeding ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                      ) : (
                          "Load Pricing Information"
                      )}
                  </button>
              </div>
          </div>
      )}

      {/* AI Price Estimator Section - Redesigned */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-navy-900">
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gold-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10 p-8 md:p-10">
              <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/10 shadow-inner">
                      <Sparkles className="w-6 h-6 text-gold-400 mr-2" />
                      <span className="font-bold text-white tracking-wide">AI-Powered Price Estimator</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
                      Find the Perfect Price Point
                  </h1>
                  <p className="text-indigo-200 max-w-2xl mx-auto text-lg leading-relaxed">
                      Stop guessing. Our AI analyzes thousands of local job posts in Harrisburg to give you an accurate, fair market rate instantly.
                  </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Input Card */}
                  <div className="lg:col-span-7 bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-100">
                      <div className="space-y-6">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service Category</label>
                              <div className="relative">
                                  <select 
                                      value={estimateCategory} 
                                      onChange={(e) => setEstimateCategory(e.target.value as ServiceCategory)}
                                      className="w-full p-4 pl-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-navy-900 font-bold appearance-none cursor-pointer"
                                  >
                                      <option value="">Select a category...</option>
                                      {serviceCategories.filter(cat => isAdmin || (cat.isPublic && cat.isActive)).map(cat => (
                                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                                      ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
                                      <ChevronDown className="w-5 h-5" />
                                  </div>
                              </div>
                          </div>

                          <div>
                              <div className="flex justify-between items-center mb-2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Job Details</label>
                                  <button 
                                      onClick={handleRefineDescription}
                                      disabled={isRefining || !estimateDesc.trim()}
                                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-50 px-2 py-1 rounded-lg"
                                  >
                                      {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                      {isRefining ? 'Refining...' : 'Auto-Refine'}
                                  </button>
                              </div>
                              <textarea 
                                  value={estimateDesc} 
                                  onChange={e => setEstimateDesc(e.target.value)} 
                                  placeholder="Describe the job in detail (e.g., 'Install a new kitchen faucet and replace the supply lines')..." 
                                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none h-32 resize-none transition-all text-sm text-navy-900 placeholder:text-slate-400"
                              />
                          </div>

                          <button 
                              onClick={handleGetMarketEstimate}
                              disabled={isEstimating || !estimateCategory || !estimateDesc.trim()}
                              className="w-full py-4 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
                          >
                              {isEstimating ? (
                                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                              ) : (
                                  <div className="p-1 bg-white/20 rounded-full mr-3 group-hover:scale-110 transition-transform">
                                      <DollarSign className="w-4 h-4" />
                                  </div>
                              )}
                              {isEstimating ? 'Analyzing Market Data...' : 'Calculate Fair Price'}
                          </button>
                      </div>
                  </div>

                  {/* Result Card */}
                  <div className="lg:col-span-5 space-y-4">
                      <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1 shadow-2xl transition-all duration-500 ${marketEstimate ? 'opacity-100 translate-y-0' : 'opacity-90'}`}>
                          <div className="bg-white rounded-xl p-6 md:p-8 h-full min-h-[340px] flex flex-col justify-center relative overflow-hidden">
                              {marketEstimate ? (
                                  <div className="animate-in fade-in zoom-in-95 duration-500">
                                      <div className="absolute top-0 right-0 p-4 opacity-10">
                                          <Scale className="w-32 h-32 text-navy-900" />
                                      </div>
                                      
                                      <div className="text-center relative z-10">
                                          <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                              Market Analysis Complete
                                          </div>
                                          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Estimated Range</p>
                                          <div className="text-5xl md:text-6xl font-black text-navy-900 tracking-tight mb-2">
                                              ${marketEstimate.min}<span className="text-slate-300 text-4xl mx-2 font-light">/</span>${marketEstimate.max}
                                          </div>
                                          <p className="text-xs text-slate-400 mb-8 flex items-center justify-center gap-1">
                                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                              Based on active Harrisburg, PA rates
                                          </p>

                                          <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 text-left">
                                              <div className="flex items-start gap-3">
                                                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                                                      <Info className="w-5 h-5" />
                                                  </div>
                                                  <div>
                                                      <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-1">CEO's Advice</p>
                                                      <p className="text-sm text-slate-700 italic leading-relaxed">"{marketEstimate.tip}"</p>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="text-center text-slate-400 relative z-10">
                                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                          <Scale className="w-10 h-10 text-slate-300" />
                                      </div>
                                      <h3 className="text-lg font-bold text-navy-900 mb-2">Ready to Calculate</h3>
                                      <p className="text-sm max-w-xs mx-auto leading-relaxed">
                                          Enter your job details on the left to generate a real-time price estimate based on local market data.
                                      </p>
                                  </div>
                              )}
                          </div>
                      </div>
                      
                      {/* Search Bar moved here for better flow */}
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                          <Search className="w-5 h-5 text-indigo-200" />
                          <input 
                            type="text" 
                            placeholder="Or search historical data below..." 
                            className="bg-transparent border-none outline-none text-white placeholder:text-indigo-200/50 w-full font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {priceStats.length === 0 ? (
           <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
             <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-20" />
             <p className="text-lg font-medium">No pricing data found for "{searchTerm}"</p>
             <p className="text-sm">Try a different keyword or browse categories.</p>
           </div>
        ) : (
          priceStats.map((stat) => (
            <div key={stat.category} className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                     <div className="p-3 bg-navy-50 text-navy-600 rounded-xl group-hover:bg-navy-100 transition-colors">
                        <Tag className="w-5 h-5" />
                     </div>
                     <div>
                       <h3 className="font-bold text-navy-900 text-lg">{stat.category}</h3>
                       <p className="text-xs text-slate-500 font-medium">{stat.count} jobs analyzed</p>
                     </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Avg Price</p>
                    <p className="text-3xl font-black text-navy-900">${Math.round(stat.avgPrice)}</p>
                  </div>
                </div>

                {/* Price Range Visual */}
                <div className="mb-6">
                   <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                      <span>Min: ${stat.minPrice}</span>
                      <span>Max: ${stat.maxPrice}</span>
                   </div>
                   <div className="h-4 bg-slate-100 rounded-full relative overflow-hidden">
                      {/* Range Bar */}
                      <div 
                        className="absolute top-0 bottom-0 bg-gold-200 rounded-full opacity-50"
                        style={{
                            left: '0%',
                            right: '0%' // Spans full width as simpler visual, or calculate range width relative to global max if desired
                        }}
                      ></div>
                      {/* Average Marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-2 bg-navy-900 rounded-full shadow-lg transform -translate-x-1/2 z-10"
                        style={{
                            // Calculate percentage position of avg between min and max (normalized)
                            // If min === max, put in middle
                            left: stat.maxPrice === stat.minPrice 
                                ? '50%' 
                                : `${((stat.avgPrice - stat.minPrice) / (stat.maxPrice - stat.minPrice)) * 100}%`
                        }}
                      ></div>
                   </div>
                   <p className="text-[10px] text-center text-slate-400 mt-1">Marker indicates average</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                      <Info className="w-3 h-3 mr-1" /> Recent Examples
                   </p>
                   <ul className="space-y-2">
                      {stat.examples.map((ex, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start">
                           <ArrowRight className="w-3 h-3 mr-2 mt-0.5 text-gold-500 shrink-0" />
                           <span className="line-clamp-1 italic">"{ex}"</span>
                        </li>
                      ))}
                   </ul>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-start gap-4">
             <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                 <Info className="w-6 h-6" />
             </div>
             <div>
                 <h3 className="font-bold text-navy-900">How is this calculated?</h3>
                 <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                     We analyze historical job data from your area, excluding outliers and cancelled requests. 
                     Prices vary based on complexity, location, and provider experience. This is intended as a guide, not a guarantee.
                 </p>
             </div>
         </div>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                  <div className="bg-navy-900 p-6 flex justify-between items-center text-white">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                          <Database className="w-5 h-5" /> Import Historical Data
                      </h3>
                      <button onClick={() => setIsImportModalOpen(false)}><X className="w-6 h-6" /></button>
                  </div>
                  <div className="p-8 space-y-8">
                      <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
                              <h4 className="font-bold text-navy-900">Download Template</h4>
                          </div>
                          <p className="text-sm text-slate-500 ml-11">
                              Get the CSV template with the correct headers to ensure your data is formatted correctly.
                          </p>
                          <button 
                              onClick={handleDownloadTemplate}
                              className="ml-11 flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm"
                          >
                              <Download className="w-4 h-4" /> Download .CSV Template
                          </button>
                      </div>

                      <div className="border-t border-slate-100 pt-6 space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center text-gold-600 font-bold">2</div>
                              <h4 className="font-bold text-navy-900">Upload Data</h4>
                          </div>
                          <p className="text-sm text-slate-500 ml-11">
                              Upload your populated CSV file. The system will parse and import valid records.
                          </p>
                          
                          <div className="ml-11">
                              <input 
                                  type="file" 
                                  accept=".csv"
                                  ref={fileInputRef}
                                  onChange={handleFileUpload}
                                  className="hidden"
                              />
                              <button 
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={isImporting}
                                  className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-gold-400 hover:bg-gold-50/50 transition-all group"
                              >
                                  {isImporting ? (
                                      <>
                                          <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
                                          <span className="text-sm font-bold text-slate-500">Processing...</span>
                                      </>
                                  ) : (
                                      <>
                                          <div className="p-3 bg-slate-50 rounded-full group-hover:bg-white transition-colors">
                                              <Upload className="w-6 h-6 text-slate-400 group-hover:text-gold-500" />
                                          </div>
                                          <span className="text-sm font-bold text-slate-500 group-hover:text-gold-600">Click to Upload .CSV</span>
                                          <span className="text-xs text-slate-400">Max file size: 5MB</span>
                                      </>
                                  )}
                              </button>
                          </div>
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 text-center text-xs text-slate-400">
                      Note: Imported data is used for pricing calibration only and won't affect active jobs.
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};