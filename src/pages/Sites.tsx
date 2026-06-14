import React, { useState } from 'react';
import { Site } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, MapPin, Navigation } from 'lucide-react';

export const Sites = () => {
  const { sites, addSite, updateSite, deleteSite } = useData();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Site>>({});

  const handleOpenModal = (site?: Site) => {
    if (site) {
      setEditingSite(site);
      setFormData(site);
    } else {
      setEditingSite(null);
      setFormData({ 
        name: '', 
        address: '', 
        latitude: 37.7749, 
        longitude: -122.4194, 
        radiusMeters: 100 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.address) {
        // Just return, avoid alert which might be blocked
        return;
    }

    if (editingSite) {
      updateSite({ ...editingSite, ...formData } as Site);
    } else {
      const newSite: Site = {
        ...(formData as Site),
        id: `site_${Date.now()}`,
        orgId: 'org_1',
        ownerId: currentUser?.id,
      } as Site;
      addSite(newSite);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string) => {
      setSiteToDelete(id);
  };

  const confirmDelete = () => {
      if (siteToDelete) {
          deleteSite(siteToDelete);
          setSiteToDelete(null);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-navy-950">Job Sites</h1>
            <p className="text-sm text-slate-500">Manage work locations and geofencing</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Job Site
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sites.map((site) => (
            <div key={site.id} className="bg-white rounded-xl shadow-sm border border-gold-200 p-5 flex flex-col justify-between">
                <div>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                             <div className="p-2 bg-navy-50 text-navy-600 rounded-lg">
                                <MapPin className="w-5 h-5" />
                             </div>
                             <div>
                                <h3 className="font-bold text-slate-800">{site.name}</h3>
                                <p className="text-xs text-slate-400">ID: {site.id}</p>
                             </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                             <Navigation className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                             <span>{site.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 ml-6 bg-gold-50 p-2 rounded">
                             <span className="font-mono">Lat: {site.latitude.toFixed(4)}</span>
                             <span className="text-slate-300">|</span>
                             <span className="font-mono">Lng: {site.longitude.toFixed(4)}</span>
                             <span className="text-slate-300">|</span>
                             <span>Radius: {site.radiusMeters}m</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                    <button 
                        onClick={() => handleOpenModal(site)}
                        className="p-2 text-slate-500 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors flex items-center text-sm font-medium"
                    >
                        <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                    </button>
                    <button 
                        onClick={() => handleDeleteClick(site.id)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center text-sm font-medium"
                    >
                        <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                    </button>
                </div>
            </div>
        ))}
        
        {sites.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-gold-300">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No job sites configured yet.</p>
                <button onClick={() => handleOpenModal()} className="text-navy-600 font-medium mt-2 hover:underline">Add your first site</button>
            </div>
        )}
      </div>

      {siteToDelete && (
        <div className="fixed inset-0 bg-navy-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-navy-950">Delete Site</h2>
            <p className="text-slate-500 mb-6 text-sm">Are you sure you want to delete this job site? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setSiteToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                autoFocus
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Delete Site
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-navy-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-navy-950">{editingSite ? 'Edit Job Site' : 'Add New Job Site'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Site Name</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Downtown Project"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-500 outline-none"
                    value={formData.address || ''}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="123 Main St..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-navy-500"
                      value={formData.latitude}
                      onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                      step="0.0001"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-navy-500"
                      value={formData.longitude}
                      onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                      step="0.0001"
                    />
                 </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Geofence Radius (meters)</label>
                <input 
                    type="number" 
                    className="w-full px-3 py-2 bg-slate-50 text-navy-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-navy-500"
                    value={formData.radiusMeters}
                    onChange={e => setFormData({...formData, radiusMeters: parseInt(e.target.value)})}
                />
                <p className="text-xs text-slate-400 mt-1">Allowed distance from center point for clock-ins.</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700"
              >
                Save Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};