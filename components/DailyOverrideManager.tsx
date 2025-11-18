
import React, { useState, useMemo } from 'react';
import type { DailyOverride, Bartender, Shift } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

interface DailyOverrideManagerProps {
  dailyOverrides: DailyOverride[];
  setDailyOverrides: React.Dispatch<React.SetStateAction<DailyOverride[]>>;
  bartenders: Bartender[];
  shifts: Shift[];
}

const DailyOverrideManager: React.FC<DailyOverrideManagerProps> = ({ dailyOverrides, setDailyOverrides, bartenders, shifts }) => {
  const [newOverride, setNewOverride] = useState({
    floor: shifts[0]?.floor || '',
    bar: shifts[0]?.bar || '',
    name: bartenders[0]?.name || ''
  });

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

  const handleAddOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOverride.name && newOverride.floor && newOverride.bar) {
      // Check if already exists to prevent duplicates for same spot?
      // We allow multiple people at same spot, so just push.
      setDailyOverrides(prev => [...prev, newOverride]);
    }
  };

  const handleRemoveOverride = (indexToRemove: number) => {
    setDailyOverrides(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleFloorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFloor = e.target.value;
    const correspondingBars = shiftLocations.find(l => l.floor === newFloor)?.bars || [];
    setNewOverride({
        ...newOverride,
        floor: newFloor,
        bar: correspondingBars[0] || ''
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-amber-300">Daily Specific Assignments</h3>
      <p className="text-xs text-slate-400 -mt-3">
        Manually assign bartenders for this specific day only. These override fixed shifts.
      </p>
      
       <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
        {dailyOverrides.length === 0 && <p className="text-xs text-slate-500 italic">No daily manual assignments.</p>}
        {dailyOverrides.map((a, index) => (
          <div key={index} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md border border-amber-900/30 text-xs">
            <div className="flex-1">
                <span className="font-semibold text-slate-200">{a.name}</span>
                <span className="text-slate-400"> at </span>
                <span className="text-slate-300">{a.floor} / {a.bar}</span>
            </div>
            <button
              onClick={() => handleRemoveOverride(index)}
              className="text-slate-500 hover:text-red-400 p-1 rounded-full transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddOverride} className="space-y-2 pt-4 border-t border-slate-700">
         <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
                <select value={newOverride.floor} onChange={handleFloorChange} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                    {shiftLocations.map(l => <option key={l.floor} value={l.floor}>{l.floor}</option>)}
                </select>
                <select value={newOverride.bar} onChange={e => setNewOverride({...newOverride, bar: e.target.value})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                    {(shiftLocations.find(l => l.floor === newOverride.floor)?.bars || []).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>
            <select value={newOverride.name} onChange={e => setNewOverride({...newOverride, name: e.target.value})} className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-indigo-500">
                {bartenders.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
        </div>
        <button type="submit" className="w-full bg-amber-600/80 text-white p-2 rounded-md hover:bg-amber-500 disabled:bg-slate-600 transition-colors duration-200 flex items-center justify-center gap-1.5 text-sm font-semibold">
          <PlusIcon className="h-4 w-4" />
          Add Daily Override
        </button>
      </form>
    </div>
  );
};

export default DailyOverrideManager;
