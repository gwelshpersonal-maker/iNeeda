import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Settings, Plus, Save, Trash2, Edit2, ShieldAlert, X } from 'lucide-react';
import { ServiceCategoryDef } from '../types';

export const AdminCatalogCMS: React.FC = () => {
    const { platformConfig, updatePlatformConfig, serviceCategories, addServiceCategory, updateServiceCategory, deleteServiceCategory } = useData();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<ServiceCategoryDef>>({});

    const handleEdit = (category: ServiceCategoryDef) => {
        setEditingId(category.id);
        setEditForm(category);
    };

    const handleSave = () => {
        if (!editForm.name || !editForm.id) return;
        
        if (editingId === 'NEW') {
            const newCat: ServiceCategoryDef = {
                id: editForm.id.toUpperCase().replace(/\s+/g, '_'),
                name: editForm.name,
                description: editForm.description || '',
                iconName: editForm.iconName || 'Star',
                colorClass: editForm.colorClass || 'text-blue-500',
                riskLevel: editForm.riskLevel || 'LOW',
                minimumFee: editForm.minimumFee || 3.0,
                isActive: editForm.isActive ?? true,
                isPublic: editForm.isPublic ?? true,
            };
            addServiceCategory(newCat);
        } else if (editingId) {
            updateServiceCategory(editingId, editForm);
        }
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = (id: string) => {
        deleteServiceCategory(id);
    };

    const startNew = () => {
        setEditingId('NEW');
        setEditForm({ id: '', name: '', description: '', riskLevel: 'LOW', minimumFee: 3.0, isActive: true, isPublic: true, iconName: 'Star', colorClass: 'text-slate-500' });
    };

    return (
        <div className="bg-white rounded-2xl shadow-soft p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-navy-900 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-gold-500" /> Catalog CMS
                    <span className="ml-3 text-xs bg-gold-100 text-gold-700 px-2 py-1 rounded-full uppercase tracking-wider font-bold">Admin Prototype</span>
                </h2>
                <button onClick={startNew} className="bg-navy-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-navy-800 transition-colors flex items-center">
                    <Plus className="w-4 h-4 mr-2" /> Add Category
                </button>
            </div>

            {editingId && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-navy-900">{editingId === 'NEW' ? 'New Category' : 'Edit Category'}</h3>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID (System Name)</label>
                            <input type="text" value={editForm.id || ''} onChange={e => setEditForm({...editForm, id: e.target.value.toUpperCase().replace(/\s+/g, '_')})} disabled={editingId !== 'NEW'} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 text-sm" placeholder="e.g. SNOW_REMOVAL"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                            <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm" placeholder="e.g. Snow Removal"/>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                        <textarea value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm h-20" placeholder="Service description..."></textarea>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Risk Level</label>
                            <select value={editForm.riskLevel || 'LOW'} onChange={e => setEditForm({...editForm, riskLevel: e.target.value as any})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm">
                                <option value="LOW">LOW</option>
                                <option value="MEDIUM">MEDIUM</option>
                                <option value="HIGH">HIGH</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Icon Name</label>
                            <input type="text" value={editForm.iconName || ''} onChange={e => setEditForm({...editForm, iconName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm" placeholder="e.g. Snowflake"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color Class</label>
                            <input type="text" value={editForm.colorClass || ''} onChange={e => setEditForm({...editForm, colorClass: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm" placeholder="e.g. text-blue-500"/>
                        </div>
                        <div className="flex flex-col justify-center gap-2">
                            <label className="flex items-center text-sm font-medium text-navy-900 cursor-pointer">
                                <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm({...editForm, isActive: e.target.checked})} className="mr-2 rounded text-gold-500 focus:ring-gold-500"/>
                                Active (Providers)
                            </label>
                            <label className="flex items-center text-sm font-medium text-navy-900 cursor-pointer">
                                <input type="checkbox" checked={editForm.isPublic} onChange={e => setEditForm({...editForm, isPublic: e.target.checked})} className="mr-2 rounded text-gold-500 focus:ring-gold-500"/>
                                Public (Client View)
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setEditingId(null)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-bold hover:bg-gold-400 transition-colors shadow flex items-center"><Save className="w-4 h-4 mr-2"/> Save Category</button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Risk / Price</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {serviceCategories.map(cat => (
                            <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-4 px-4 text-sm font-mono text-slate-500">{cat.id}</td>
                                <td className="py-4 px-4 text-sm font-bold text-navy-900 flex items-center">
                                    <span className={`w-3 h-3 rounded-full mr-2 bg-current ${cat.colorClass}`}></span>
                                    {cat.name}
                                </td>
                                <td className="py-4 px-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cat.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' : cat.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{cat.riskLevel}</span>
                                    <span className="text-xs text-slate-500 ml-2">Min ${cat.minimumFee}</span>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex flex-col gap-1">
                                        {cat.isActive && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700" title="Providers can select this as a skill and see jobs in this category">✓ Pro (Active)</span>}
                                        {cat.isPublic && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700" title="Clients can see this category on the public services page and request jobs for it">✓ Client (Public)</span>}
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <button onClick={() => handleEdit(cat)} className="text-slate-400 hover:text-gold-600 mx-2 transition-colors"><Edit2 className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(cat.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
