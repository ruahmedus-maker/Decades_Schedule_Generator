import React, { useState, useMemo } from 'react';
import type { FixedAssignment, Bartender, Shift, DayOfWeek } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

interface FixedShiftManagerProps {
  fixedAssignments: FixedAssignment[];
  setFixedAssignments: React.Dispatch<React.SetStateAction<FixedAssignment[]>>;
  bartenders: Bartender[];
  shifts: Shift[];
}

const weekOptions: FixedAssignment['week'][] = ['Week_1', 'Week_2', 'Week_3', 'Week_4'];
const dayOptions: DayOfWeek[] = ['Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];

const FixedShiftManager: React.FC<FixedShiftManagerProps> = ({ fixedAssignments, setFixedAssignments, bartenders, shifts }) => {
  const initialFormState = {
    week: 'Week_1' as FixedAssignment['week'],
    day: 'Thu' as DayOfWeek,
    floor: shifts[0]?.floor || '',
    bar: shifts[0]?.bar || '',
    name: bartenders[0]?.name || ''
  };
  const [newAssignment, setNewAssignment] = useState(initialFormState);

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

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAssignment.name && newAssignment.floor && newAssignment.bar) {
      setFixedAssignments(prev => [...prev, newAssignment].sort((a,b) => `${a.week}-${a.day}`.localeCompare(`${b.week}-${b.day}`)));
    }
  };

  const handleRemoveAssignment = (indexToRemove: number) => {
    setFixedAssignments(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleFloorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFloor = e.target.value;
    const correspondingBars = shiftLocations.find(l => l.floor === newFloor)?.bars || [];
    setNewAssignment({
        ...newAssignment,
        floor: newFloor,
        bar: correspondingBars[0] || ''
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-200">Manage Fixed Shifts</h3>
       <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
        {fixedAssignments.map((a, index) => (
          <div key={index} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md border border-slate-700 text-xs">
            <div className="flex-1">
                <span className="font-semibold text-indigo-300">{a.name}</span>
                <span className="text-slate-400"> at </span>
                <span className="text-slate-300">{a.floor} / {a.bar}</span>
            </div>
            <div className="text-slate-400 text-right mx-2 flex-shrink-0">
                {a.week.replace('_', ' ')}, {a.day.replace('_', ' ')}
            </div>
            <button
              onClick={() => handleRemoveAssignment(index)}
              className="text-slate-500 hover:text-red-400 p-1 rounded-full transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddAssignment} className="space-y-2 pt-4 border-t border-slate-700">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <select value={newAssignment.week} onChange={e => setNewAssignment({...newAssignment, week: e.target.value as FixedAssignment['week']})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                {weekOptions.map(w => <option key={w} value={w}>{w.replace('_', ' ')}</option>)}
            </select>
            <select value={newAssignment.day} onChange={e => setNewAssignment({...newAssignment, day: e.target.value as DayOfWeek})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                {dayOptions.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
            </select>
            <select value={newAssignment.floor} onChange={handleFloorChange} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                {shiftLocations.map(l => <option key={l.floor} value={l.floor}>{l.floor}</option>)}
            </select>
            <select value={newAssignment.bar} onChange={e => setNewAssignment({...newAssignment, bar: e.target.value})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                {(shiftLocations.find(l => l.floor === newAssignment.floor)?.bars || []).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={newAssignment.name} onChange={e => setNewAssignment({...newAssignment, name: e.target.value})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500 sm:col-span-2">
                {bartenders.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
        </div>
        <button type="submit" className="w-full bg-indigo-600/80 text-white p-2 rounded-md hover:bg-indigo-500 disabled:bg-slate-600 transition-colors duration-200 flex items-center justify-center gap-1.5 text-sm font-semibold">
          <PlusIcon className="h-4 w-4" />
          Add Fixed Shift
        </button>
      </form>
    </div>
  );
};

export default FixedShiftManager;
