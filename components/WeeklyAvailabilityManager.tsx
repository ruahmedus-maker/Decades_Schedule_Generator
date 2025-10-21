import React from 'react';
import type { Bartender, DayOfWeek } from '../types';

interface WeeklyAvailabilityManagerProps {
  bartenders: Bartender[];
  setBartenders: React.Dispatch<React.SetStateAction<Bartender[]>>;
}

const allDays: DayOfWeek[] = ['Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];

const WeeklyAvailabilityManager: React.FC<WeeklyAvailabilityManagerProps> = ({ bartenders, setBartenders }) => {
  const handleToggleDay = (bartenderName: string, day: DayOfWeek) => {
    setBartenders(prev =>
      prev.map(b => {
        if (b.name === bartenderName) {
          const newUnavailableDays = b.unavailableDays.includes(day)
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
      <h3 className="text-base font-semibold text-slate-200">Weekly Availability</h3>
      <p className="text-xs text-slate-400 -mt-3">Set recurring days off for each bartender for all weeks.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase">
            <tr>
              <th className="py-2 px-1">Bartender</th>
              {allDays.map(day => (
                <th key={day} className="py-2 px-1 text-center w-12">{day.substring(0,3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bartenders.map(b => (
              <tr key={b.name} className="border-b border-slate-700">
                <td className="py-2 px-1 font-medium text-slate-300">{b.name}</td>
                {allDays.map(day => (
                  <td key={day} className="py-2 px-1 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded bg-slate-600 border-slate-500 text-amber-400 focus:ring-amber-500 focus:ring-2 cursor-pointer"
                      checked={b.unavailableDays.includes(day)}
                      onChange={() => handleToggleDay(b.name, day)}
                      title={`Toggle ${day} for ${b.name}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklyAvailabilityManager;