import React, { useState } from 'react';
import type { TimeOffRequest, Bartender, DayOfWeek } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

interface TimeOffRequestManagerProps {
  timeOffRequests: TimeOffRequest[];
  setTimeOffRequests: React.Dispatch<React.SetStateAction<TimeOffRequest[]>>;
  bartenders: Bartender[];
}

const weekOptions: number[] = [1, 2, 3, 4];
const dayOptions: DayOfWeek[] = ['Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];

const TimeOffRequestManager: React.FC<TimeOffRequestManagerProps> = ({ timeOffRequests, setTimeOffRequests, bartenders }) => {
  const initialFormState = {
    name: bartenders[0]?.name || '',
    startWeek: 1,
    startDay: 'Thu' as DayOfWeek,
    endWeek: 1,
    endDay: 'Thu' as DayOfWeek,
  };
  const [newRequest, setNewRequest] = useState(initialFormState);

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRequest.name) {
      const requestToAdd: TimeOffRequest = {
        id: Date.now().toString(),
        name: newRequest.name,
        startDate: { week: newRequest.startWeek, day: newRequest.startDay },
        endDate: { week: newRequest.endWeek, day: newRequest.endDay },
      };
      setTimeOffRequests(prev => [...prev, requestToAdd]);
    }
  };

  const handleRemoveRequest = (idToRemove: string) => {
    setTimeOffRequests(prev => prev.filter(req => req.id !== idToRemove));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-200">Time Off Requests</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
        {timeOffRequests.length === 0 && <p className="text-xs text-slate-500 text-center py-2">No specific time off requests added.</p>}
        {timeOffRequests.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md border border-slate-700 text-xs">
            <div className="flex-1">
              <span className="font-semibold text-amber-300">{r.name}</span>
            </div>
            <div className="text-slate-400 text-right mx-2 flex-shrink-0">
                W{r.startDate.week} {r.startDate.day.substring(0,3)} - W{r.endDate.week} {r.endDate.day.substring(0,3)}
            </div>
            <button
              onClick={() => handleRemoveRequest(r.id)}
              className="text-slate-500 hover:text-red-400 p-1 rounded-full transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddRequest} className="space-y-2 pt-4 border-t border-slate-700">
        <select value={newRequest.name} onChange={e => setNewRequest({...newRequest, name: e.target.value})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500">
            {bartenders.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
                <label className="text-xs text-slate-400">Start Date</label>
                 <div className="flex gap-2">
                    <select value={newRequest.startWeek} onChange={e => setNewRequest({...newRequest, startWeek: parseInt(e.target.value)})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                        {weekOptions.map(w => <option key={w} value={w}>W{w}</option>)}
                    </select>
                    <select value={newRequest.startDay} onChange={e => setNewRequest({...newRequest, startDay: e.target.value as DayOfWeek})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                        {dayOptions.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="text-xs text-slate-400">End Date</label>
                 <div className="flex gap-2">
                    <select value={newRequest.endWeek} onChange={e => setNewRequest({...newRequest, endWeek: parseInt(e.target.value)})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                        {weekOptions.map(w => <option key={w} value={w}>W{w}</option>)}
                    </select>
                    <select value={newRequest.endDay} onChange={e => setNewRequest({...newRequest, endDay: e.target.value as DayOfWeek})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                        {dayOptions.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                    </select>
                </div>
            </div>
        </div>
        <button type="submit" className="w-full bg-amber-600/80 text-white p-2 rounded-md hover:bg-amber-500 disabled:bg-slate-600 transition-colors duration-200 flex items-center justify-center gap-1.5 text-sm font-semibold">
          <PlusIcon className="h-4 w-4" />
          Add Time Off Request
        </button>
      </form>
    </div>
  );
};

export default TimeOffRequestManager;