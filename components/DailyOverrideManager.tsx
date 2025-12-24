
import React, { useState, useMemo, useEffect } from 'react';
import type { DailyOverride, Bartender, Shift, DayOfWeek } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

interface DailyOverrideManagerProps {
  dailyOverrides: DailyOverride[];
  setDailyOverrides: React.Dispatch<React.SetStateAction<DailyOverride[]>>;
  bartenders: Bartender[];
  shifts: Shift[];
  specificDay: DayOfWeek;
}

const DailyOverrideManager: React.FC<DailyOverrideManagerProps> = ({ dailyOverrides, setDailyOverrides, bartenders, shifts, specificDay }) => {
  const [newOverride, setNewOverride] = useState({
    day: specificDay,
    floor: '',
    bar: '',
    name: bartenders[0]?.name || ''
  });

  // Filter available shifts for the current specific day (plus Sun_Night if Sun)
  const availableShifts = useMemo(() => {
    return shifts.filter(s => s.day === specificDay || (specificDay === 'Sun' && s.day === 'Sun_Night'));
  }, [shifts, specificDay]);

  const shiftLocations = useMemo(() => {
    const locations = new Map<string, Set<string>>();
    availableShifts.forEach(shift => {
      if (!locations.has(shift.floor)) {
        locations.set(shift.floor, new Set());
      }
      locations.get(shift.floor)!.add(shift.bar);
    });
    return Array.from(locations.entries()).map(([floor, bars]) => ({
      floor,
      bars: Array.from(bars)
    }));
  }, [availableShifts]);

  // Sync defaults when shifts/locations change
  useEffect(() => {
    if (shiftLocations.length > 0) {
        setNewOverride(prev => ({
            ...prev,
            day: specificDay,
            floor: shiftLocations[0].floor,
            bar: shiftLocations[0].bars[0]
        }));
    }
  }, [shiftLocations, specificDay]);

  const handleAddOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOverride.name && newOverride.floor && newOverride.bar) {
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

  const isSunday = specificDay === 'Sun';

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-amber-300">Daily Specific Assignments</h3>
      <p className="text-xs text-slate-400 -mt-3">
        Assign bartenders for this day only. 
        {isSunday && " (Note: Sundays have both Day and Night shifts)"}
      </p>
      
       <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
        {dailyOverrides.length === 0 && <p className="text-xs text-slate-500 italic">No daily manual assignments.</p>}
        {dailyOverrides.map((a, index) => (
          <div key={index} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md border border-amber-900/30 text-xs">
            <div className="flex-1">
                <span className="font-semibold text-slate-200">{a.name}</span>
                <span className="text-slate-400"> at </span>
                <span className="text-slate-300">{a.floor} / {a.bar}</span>
                <span className="text-amber-500/70 ml-1">({a.day.replace('_', ' ')})</span>
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
            {isSunday && (
                <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Shift Time</label>
                    <div className="flex bg-slate-900 rounded-md p-0.5 border border-slate-700">
                        <button 
                            type="button"
                            onClick={() => setNewOverride(prev => ({...prev, day: 'Sun'}))}
                            className={`flex-1 py-1 text-xs rounded transition-colors ${newOverride.day === 'Sun' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
                        >
                            Day
                        </button>
                        <button 
                            type="button"
                            onClick={() => setNewOverride(prev => ({...prev, day: 'Sun_Night'}))}
                            className={`flex-1 py-1 text-xs rounded transition-colors ${newOverride.day === 'Sun_Night' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
                        >
                            Night
                        </button>
                    </div>
                </div>
            )}
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
