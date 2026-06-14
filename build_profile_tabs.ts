import * as fs from 'fs';

const content = fs.readFileSync('src/pages/AccountProfile.tsx', 'utf8');

const startTag = '<form onSubmit={handleSave} className="space-y-8">';
const endTag = '<div className="flex justify-end pt-4">';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
    console.error("Tags not found");
    process.exit(1);
}

const part1 = fs.readFileSync('part1.tsx', 'utf8');
const part2 = fs.readFileSync('part2.tsx', 'utf8');
const part3 = fs.readFileSync('part3.tsx', 'utf8');
const part4 = fs.readFileSync('part4.tsx', 'utf8');
const part5 = fs.readFileSync('part5.tsx', 'utf8');
const part6 = fs.readFileSync('part6.tsx', 'utf8');
const part7 = fs.readFileSync('part7.tsx', 'utf8');
const part8 = fs.readFileSync('part8.tsx', 'utf8');

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
                        ${part1}
                        ${part2}
                        ${part3}
                    </div>
                )}

                {activeTab === 'financials' && (
                    <div className="space-y-6 animate-in fade-in">
                        {isProvider ? (
                            <>
                                ${part4}
                                ${part6}
                                ${part8}
                            </>
                        ) : (
                            isClient && (
                                <>
                                    ${part5}
                                </>
                            )
                        )}
                    </div>
                )}

                {activeTab === 'provider' && isProvider && (
                    <div className="space-y-6 animate-in fade-in">
                        ${part7}
                    </div>
                )}
`;

const newContent = content.substring(0, startIndex) + 
                   '<form onSubmit={handleSave} className="space-y-8">' + 
                   newFormContent + '\\n                ' +
                   content.substring(endIndex);

fs.writeFileSync('src/pages/AccountProfile.tsx', newContent);
console.log("Successfully rebuilt AccountProfile.tsx with tabs");
