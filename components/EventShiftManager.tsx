import React, { useState, useMemo } from 'react';
import type { ClosedShift, Shift, DayOfWeek } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

interface EventShiftManagerProps {
  closedShifts: ClosedShift[];
  setClosedShifts: React.Dispatch<React.SetStateAction<ClosedShift[]>>;
  shifts: Shift[];
}

const weekOptions: ClosedShift['week'][] = ['Week_1', 'Week_2', 'Week_3', 'Week_4'];
const dayOptions: DayOfWeek[] = ['Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];

const EventShiftManager: React.FC<EventShiftManagerProps> = ({ closedShifts, setClosedShifts, shifts }) => {
  const initialFormState = {
    week: 'Week_1' as ClosedShift['week'],
    day: 'Thu' as DayOfWeek,
    floor: shifts[0]?.floor || '',
    bar: shifts[0]?.bar || '',
  };
  const [newClosure, setNewClosure] = useState(initialFormState);

  const shiftLocations = useMemo(() => {
    const locations = new Map<string, Set<string>>();
    shifts.forEach(shift => {
      if (!locations.has(shift.floor)) {
        locations.set(shift.floor, new Set());
      }
      locations.get(shift.floor)!.add(shift.bar);
    });
    return Array.from(locations.entries()).map(([floor, bars]) => ({
      floor,
      bars: Array.from(bars)
    }));
  }, [shifts]);

  const handleAddClosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClosure.floor && newClosure.bar) {
      const closureToAdd: ClosedShift = {
        id: Date.now().toString(),
        ...newClosure,
      };
      setClosedShifts(prev => [...prev, closureToAdd].sort((a,b) => `${a.week}-${a.day}`.localeCompare(`${b.week}-${b.day}`)));
    }
  };

  const handleRemoveClosure = (idToRemove: string) => {
    setClosedShifts(prev => prev.filter(c => c.id !== idToRemove));
  };
  
  const handleFloorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFloor = e.target.value;
    const correspondingBars = shiftLocations.find(l => l.floor === newFloor)?.bars || [];
    setNewClosure({
        ...newClosure,
        floor: newFloor,
        bar: correspondingBars[0] || ''
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-200">Holiday & Event Closures</h3>
       <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
        {closedShifts.length === 0 && <p className="text-xs text-slate-500 text-center py-2">No specific shift closures added.</p>}
        {closedShifts.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md border border-slate-700 text-xs">
            <div className="flex-1">
                <span className="font-semibold text-orange-300">{c.floor} / {c.bar}</span>
            </div>
            <div className="text-slate-400 text-right mx-2 flex-shrink-0">
                {c.week.replace('_', ' ')}, {c.day.replace('_', ' ')}
            </div>
            <button
              onClick={() => handleRemoveClosure(c.id)}
              className="text-slate-500 hover:text-red-400 p-1 rounded-full transition-colors"
              aria-label={`Remove closure for ${c.floor} on ${c.week}, ${c.day}`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddClosure} className="space-y-2 pt-4 border-t border-slate-700">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <select value={newClosure.week} onChange={e => setNewClosure({...newClosure, week: e.target.value as ClosedShift['week']})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                {weekOptions.map(w => <option key={w} value={w}>{w.replace('_', ' ')}</option>)}
            </select>
            <select value={newClosure.day} onChange={e => setNewClosure({...newClosure, day: e.target.value as DayOfWeek})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                {dayOptions.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
            </select>
            <select value={newClosure.floor} onChange={handleFloorChange} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                {shiftLocations.map(l => <option key={l.floor} value={l.floor}>{l.floor}</option>)}
            </select>
            <select value={newClosure.bar} onChange={e => setNewClosure({...newClosure, bar: e.target.value})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                {(shiftLocations.find(l => l.floor === newClosure.floor)?.bars || []).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
        </div>
        <button type="submit" className="w-full mt-2 bg-orange-600/80 text-white p-2 rounded-md hover:bg-orange-500 disabled:bg-slate-600 transition-colors duration-200 flex items-center justify-center gap-1.5 text-sm font-semibold">
          <PlusIcon className="h-4 w-4" />
          Add Shift Closure
        </button>
      </form>
    </div>
  );
};

export default EventShiftManager;