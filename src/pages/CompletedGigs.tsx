import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Shift, ShiftStatus } from '../types';
import { format } from 'date-fns';
import { ArrowUpDown, ImageIcon } from 'lucide-react';

type SortField = 'date' | 'description' | 'checkIn' | 'checkOut' | 'amount' | 'client';
type SortOrder = 'asc' | 'desc';

export const CompletedGigs = () => {
  const { shifts, users } = useData();
  const { currentUser } = useAuth();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter for completed/verified gigs where current user is the provider
  const completedGigs = useMemo(() => {
    if (!currentUser) return [];
    return shifts.filter(s => 
      s.userId === currentUser.id && 
      (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED)
    );
  }, [shifts, currentUser]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedGigs = useMemo(() => {
    return [...completedGigs].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'date':
          valA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.end).getTime();
          valB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.end).getTime();
          break;
        case 'description':
          valA = a.description.toLowerCase();
          valB = b.description.toLowerCase();
          break;
        case 'checkIn':
          valA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
          valB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
          break;
        case 'checkOut':
          valA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          valB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          break;
        case 'amount':
          valA = a.price || 0;
          valB = b.price || 0;
          break;
        case 'client':
          const clientA = users.find(u => u.id === a.clientId)?.name || 'Unknown';
          const clientB = users.find(u => u.id === b.clientId)?.name || 'Unknown';
          valA = clientA.toLowerCase();
          valB = clientB.toLowerCase();
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [completedGigs, sortField, sortOrder, users]);

  const SortHeader = ({ field, label }: { field: SortField, label: string }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-indigo-600' : 'text-slate-400'}`} />
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
            <h2 className="text-xl font-bold text-navy-900">Completed Gigs</h2>
            <p className="text-sm text-slate-500 mt-1">Review your finished jobs, payment amounts, and media.</p>
        </div>
        <div className="text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">
            {completedGigs.length} Total Gigs
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <SortHeader field="date" label="Date Completed" />
              <SortHeader field="description" label="Job Description" />
              <SortHeader field="client" label="Client" />
              <SortHeader field="checkIn" label="Check In" />
              <SortHeader field="checkOut" label="Check Out" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Media</th>
              <SortHeader field="amount" label="Amount Paid" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedGigs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  You don't have any completed gigs yet.
                </td>
              </tr>
            ) : (
              sortedGigs.map(gig => {
                const client = users.find(u => u.id === gig.clientId);
                const hasMedia = (gig.photos && gig.photos.length > 0) || (gig.completionPhotos && gig.completionPhotos.length > 0);
                
                return (
                  <tr key={gig.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-navy-900">
                      {gig.completedAt ? format(new Date(gig.completedAt), 'MMM d, yyyy') : format(new Date(gig.end), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="line-clamp-2 max-w-xs" title={gig.description}>
                        {gig.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 font-medium">
                      {client?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {gig.checkInTime ? format(new Date(gig.checkInTime), 'h:mm a') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {gig.completedAt ? format(new Date(gig.completedAt), 'h:mm a') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {hasMedia ? (
                        <div className="flex gap-2">
                           {gig.photos && gig.photos.length > 0 && (
                               <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded gap-1" title="Initial Photos">
                                   <ImageIcon className="w-3 h-3" /> {gig.photos.length}
                               </div>
                           )}
                           {gig.completionPhotos && gig.completionPhotos.length > 0 && (
                               <div className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded gap-1" title="Completion Photos">
                                   <ImageIcon className="w-3 h-3" /> {gig.completionPhotos.length}
                               </div>
                           )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-emerald-600">
                      ${gig.price?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
