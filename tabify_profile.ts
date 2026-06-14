import * as fs from 'fs';

const content = fs.readFileSync('src/pages/AccountProfile.tsx', 'utf8');

const stratTag = '<form onSubmit={handleSave} className="space-y-12">';
const endTag = '<div className="flex justify-end pt-4">';

const startIndex = content.indexOf(stratTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
    console.error("Tags not found");
    process.exit(1);
}

const originalFormInner = content.substring(startIndex + stratTag.length, endIndex);

const generalInfoStart = '{/* --- SECTION 1: PERSONAL DETAILS --- */}';
const financialsStart = '{/* --- SECTION 2: FINANCIAL --- */}';
const providerStart = '{/* --- SECTION 3: PROVIDER SETTINGS --- */}';

const generalInfo = originalFormInner.substring(originalFormInner.indexOf(generalInfoStart), originalFormInner.indexOf(financialsStart)).replace(generalInfoStart, '');
const financials = originalFormInner.substring(originalFormInner.indexOf(financialsStart), originalFormInner.indexOf(providerStart)).replace(financialsStart, '');
const provider = originalFormInner.substring(originalFormInner.indexOf(providerStart)).replace(providerStart, '');

const extractContent = (str: string) => {
    let content = str;
    // remove the wrapper div and h2
    // general info wrapper: 
    // <div className="space-y-6">
    // <h2 ...> ... </h2>
    
    // financial wrapper:
    // {isProvider ? ( ... ) : ( ... )}
    
    // Actually we can just keep them as they are and wrap them in activeTab conditionals, maybe remove the h2 since the tab provides context, but it doesn't hurt to keep them for now, or just hide the h2. Let's just wrap the entire sections.
    return content;
};

const newFormContent = `
                {/* Tabs */}
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                    <button 
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={\`px-4 py-2 rounded-lg text-sm font-bold transition-all \${activeTab === 'general' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}\`}
                    >
                        General Information
                    </button>
                    {(isProvider || isClient) && (
                        <button 
                            type="button"
                            onClick={() => setActiveTab('financials')}
                            className={\`px-4 py-2 rounded-lg text-sm font-bold transition-all \${activeTab === 'financials' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}\`}
                        >
                            Financials
                        </button>
                    )}
                    {isProvider && (
                        <button 
                            type="button"
                            onClick={() => setActiveTab('provider')}
                            className={\`px-4 py-2 rounded-lg text-sm font-bold transition-all \${activeTab === 'provider' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}\`}
                        >
                            Provider Settings
                        </button>
                    )}
                </div>

                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in">
                        \${generalInfo}
                    </div>
                )}

                {activeTab === 'financials' && (
                    <div className="space-y-6 animate-in fade-in">
                        \${financials}
                    </div>
                )}

                {activeTab === 'provider' && isProvider && (
                    <div className="space-y-6 animate-in fade-in">
                        \${provider}
                    </div>
                )}
`;

const newContent = content.substring(0, startIndex) + 
                   '<form onSubmit={handleSave} className="space-y-8">' + 
                   newFormContent + '\\n                ' +
                   content.substring(endIndex);

fs.writeFileSync('src/pages/AccountProfile.tsx', newContent);
console.log("Successfully rebuilt AccountProfile.tsx with tabs");
