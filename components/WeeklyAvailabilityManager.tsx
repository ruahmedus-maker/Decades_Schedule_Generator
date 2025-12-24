
import React from 'react';
import type { Bartender, DayOfWeek } from '../types';

interface WeeklyAvailabilityManagerProps {
  bartenders: Bartender[];
  setBartenders: React.Dispatch<React.SetStateAction<Bartender[]>>;
}

const allDays: DayOfWeek[] = ['Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];

const WeeklyAvailabilityManager: React.FC<WeeklyAvailabilityManagerProps> = ({ bartenders, setBartenders }) => {
  const handleToggleAvailability = (bartenderName: string, day: DayOfWeek) => {
    setBartenders(prev =>
      prev.map(b => {
        if (b.name === bartenderName) {
          // If the day is currently in 'unavailableDays', they are unavailable.
          // Checking the box should make them AVAILABLE (remove from list).
          // Unchecking the box should make them UNAVAILABLE (add to list).
          const isCurrentlyUnavailable = b.unavailableDays.includes(day);
          const newUnavailableDays = isCurrentlyUnavailable
            ? b.unavailableDays.filter(d => d !== day)
            : [...b.unavailableDays, day];
          return { ...b, unavailableDays: newUnavailableDays };
        }
        return b;
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-slate-200">Weekly Availability</h3>
        <p className="text-xs text-slate-400">
          Check the days each bartender <span className="text-emerald-400 font-bold">is available</span> to work.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/30">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
            <tr>
              <th className="py-3 px-3">Bartender</th>
              {allDays.map(day => (
                <th key={day} className="py-3 px-1 text-center w-12">{day.substring(0,3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bartenders.map(b => (
              <tr key={b.name} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-3 font-medium text-slate-300">{b.name}</td>
                {allDays.map(day => {
                  const isAvailable = !b.unavailableDays.includes(day);
                  return (
                    <td key={day} className="py-2 px-1 text-center">
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 focus:ring-2 cursor-pointer transition-all"
                          checked={isAvailable}
                          onChange={() => handleToggleAvailability(b.name, day)}
                          title={`${b.name} is ${isAvailable ? 'Available' : 'Unavailable'} on ${day}`}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider font-bold">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span className="text-emerald-400">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-slate-600 bg-slate-700"></div>
          <span className="text-slate-500">Day Off</span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyAvailabilityManager;
