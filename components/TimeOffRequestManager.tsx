
import React, { useState } from 'react';
import type { TimeOffRequest, Bartender } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CalendarIcon } from './icons/CalendarIcon';

interface TimeOffRequestManagerProps {
  timeOffRequests: TimeOffRequest[];
  setTimeOffRequests: React.Dispatch<React.SetStateAction<TimeOffRequest[]>>;
  bartenders: Bartender[];
}

const TimeOffRequestManager: React.FC<TimeOffRequestManagerProps> = ({ timeOffRequests, setTimeOffRequests, bartenders }) => {
  const [newRequest, setNewRequest] = useState({
    name: bartenders[0]?.name || '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRequest.name && newRequest.startDate && newRequest.endDate) {
      if (new Date(newRequest.startDate) > new Date(newRequest.endDate)) {
        alert("Start date cannot be after end date.");
        return;
      }

      const requestToAdd: TimeOffRequest = {
        id: Date.now().toString(),
        name: newRequest.name,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
      };
      setTimeOffRequests(prev => [...prev, requestToAdd].sort((a,b) => a.startDate.localeCompare(b.startDate)));
    }
  };

  const handleRemoveRequest = (idToRemove: string) => {
    setTimeOffRequests(prev => prev.filter(req => req.id !== idToRemove));
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-200">Time Off Requests</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {timeOffRequests.length === 0 && <p className="text-xs text-slate-500 text-center py-2 italic">No specific time off requests added.</p>}
        {timeOffRequests.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md border border-slate-700 text-xs">
            <div className="flex-1">
              <span className="font-semibold text-amber-300">{r.name}</span>
            </div>
            <div className="text-slate-400 text-right mx-2 flex-shrink-0">
                {formatDateLabel(r.startDate)} — {formatDateLabel(r.endDate)}
            </div>
            <button
              onClick={() => handleRemoveRequest(r.id)}
              className="text-slate-500 hover:text-red-400 p-1 rounded-full transition-colors"
              title="Remove Request"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddRequest} className="space-y-3 pt-4 border-t border-slate-700">
        <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Employee</label>
            <select 
                value={newRequest.name} 
                onChange={e => setNewRequest({...newRequest, name: e.target.value})} 
                className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500"
            >
                {bartenders.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">From</label>
                <div className="relative">
                    <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    <input 
                        type="date" 
                        value={newRequest.startDate} 
                        onChange={e => setNewRequest({...newRequest, startDate: e.target.value})} 
                        className="w-full bg-slate-900/70 border border-slate-600 rounded-md py-1.5 pl-7 pr-1 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500"
                    />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">To</label>
                <div className="relative">
                    <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    <input 
                        type="date" 
                        value={newRequest.endDate} 
                        onChange={e => setNewRequest({...newRequest, endDate: e.target.value})} 
                        className="w-full bg-slate-900/70 border border-slate-600 rounded-md py-1.5 pl-7 pr-1 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500"
                    />
                </div>
            </div>
        </div>

        <button 
            type="submit" 
            className="w-full bg-amber-600/80 text-white p-2 rounded-md hover:bg-amber-500 disabled:bg-slate-600 transition-colors duration-200 flex items-center justify-center gap-1.5 text-sm font-semibold shadow-lg shadow-amber-900/20"
        >
          <PlusIcon className="h-4 w-4" />
          Add Request
        </button>
      </form>
    </div>
  );
};

export default TimeOffRequestManager;
