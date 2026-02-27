
import React, { useState, useMemo } from 'react';
import type { ExtraShift, Shift, DayOfWeek } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

interface ExtraShiftManagerProps {
  extraShifts: ExtraShift[];
  setExtraShifts: React.Dispatch<React.SetStateAction<ExtraShift[]>>;
  shifts: Shift[];
}

const weekOptions: ExtraShift['week'][] = ['Week_1', 'Week_2', 'Week_3', 'Week_4', 'Week_5'];
const dayOptions: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];

const ExtraShiftManager: React.FC<ExtraShiftManagerProps> = ({ extraShifts, setExtraShifts, shifts }) => {
  const initialFormState = {
    week: 'Week_1' as ExtraShift['week'],
    day: 'Mon' as DayOfWeek,
    floor: shifts[0]?.floor || 'Special Event',
    bar: shifts[0]?.bar || 'Main Bar',
    bartendersNeeded: 1
  };
  const [newShift, setNewShift] = useState(initialFormState);

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (newShift.floor && newShift.bar) {
      const shiftToAdd: ExtraShift = {
        id: Date.now().toString(),
        ...newShift,
      };
      setExtraShifts(prev => [...prev, shiftToAdd].sort((a,b) => `${a.week}-${a.day}`.localeCompare(`${b.week}-${b.day}`)));
    }
  };

  const handleRemoveShift = (idToRemove: string) => {
    setExtraShifts(prev => prev.filter(c => c.id !== idToRemove));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-200">Extra Operating Days & Shifts</h3>
      <p className="text-[10px] text-slate-500">Add shifts for days outside normal operation (e.g. Mon-Wed events).</p>
      
       <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {extraShifts.length === 0 && <p className="text-xs text-slate-500 text-center py-2 italic">No extra shifts added.</p>}
        {extraShifts.map((s) => (
          <div key={s.id} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md border border-slate-700 text-xs">
            <div className="flex-1">
                <span className="font-semibold text-emerald-400">{s.floor} / {s.bar}</span>
                <span className="text-slate-500 ml-1">({s.bartendersNeeded})</span>
            </div>
            <div className="text-slate-400 text-right mx-2 flex-shrink-0">
                {s.week.replace('_', ' ')}, {s.day.replace('_', ' ')}
            </div>
            <button
              onClick={() => handleRemoveShift(s.id)}
              className="text-slate-500 hover:text-red-400 p-1 rounded-full transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddShift} className="space-y-2 pt-4 border-t border-slate-700">
         <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="col-span-1">
                <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Week</label>
                <select value={newShift.week} onChange={e => setNewShift({...newShift, week: e.target.value as ExtraShift['week']})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                    {weekOptions.map(w => <option key={w} value={w}>{w.replace('_', ' ')}</option>)}
                </select>
            </div>
            <div className="col-span-1">
                <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Day</label>
                <select value={newShift.day} onChange={e => setNewShift({...newShift, day: e.target.value as DayOfWeek})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                    {dayOptions.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                </select>
            </div>
            <div className="col-span-1">
                <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Floor</label>
                <input type="text" value={newShift.floor} onChange={e => setNewShift({...newShift, floor: e.target.value})} placeholder="Floor Name" className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="col-span-1">
                <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Bar</label>
                <input type="text" value={newShift.bar} onChange={e => setNewShift({...newShift, bar: e.target.value})} placeholder="Bar Name" className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Bartenders Needed</label>
                <input type="number" min="1" value={newShift.bartendersNeeded} onChange={e => setNewShift({...newShift, bartendersNeeded: parseInt(e.target.value) || 1})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500" />
            </div>
        </div>
        <button type="submit" className="w-full mt-2 bg-emerald-600/80 text-white p-2 rounded-md hover:bg-emerald-500 disabled:bg-slate-600 transition-colors duration-200 flex items-center justify-center gap-1.5 text-sm font-semibold">
          <PlusIcon className="h-4 w-4" />
          Add Extra Shift
        </button>
      </form>
    </div>
  );
};

export default ExtraShiftManager;
