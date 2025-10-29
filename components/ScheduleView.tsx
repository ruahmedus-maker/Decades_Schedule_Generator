

import React from 'react';
import type { Schedule, DayOfWeek } from '../types';

interface ScheduleViewProps {
  schedule: Schedule;
}

const DAY_ORDER: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];
const FLOOR_ORDER = ['Rooftop', 'Hip Hop', "2010's", "2000's"];

const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule }) => {
  const weeks = [1, 2, 3, 4];

  return (
    <div className="space-y-8">
      {weeks.map(week => {
        const weekSchedule = schedule.filter(s => s.week === week);
        if (weekSchedule.length === 0) {
          return null;
        }

        const scheduleGrid: Record<string, Record<string, string[]>> = {};
        
        // Fix: Use spread syntax for creating an array from a Set to ensure correct type inference.
        const daysInWeek: DayOfWeek[] = [...new Set(weekSchedule.map(entry => entry.day))]
                                 .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

        weekSchedule.forEach(entry => {
          const key = `${entry.floor} / ${entry.bar}`;
          if (!scheduleGrid[key]) {
            scheduleGrid[key] = {};
          }
          scheduleGrid[key][entry.day] = entry.bartenders;
        });

        const uniqueKeys = Object.keys(scheduleGrid).sort((a, b) => {
            const [floorA, barA] = a.split(' / ');
            const [floorB, barB] = b.split(' / ');
            const indexA = FLOOR_ORDER.indexOf(floorA);
            const indexB = FLOOR_ORDER.indexOf(floorB);
        
            if (indexA !== indexB) {
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            }
            return barA.localeCompare(barB);
        });

        return (
          <div key={week}>
            <h3 className="text-xl font-bold text-indigo-400 mb-3">Week {week}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm text-left text-slate-400">
                <thead className="text-xs text-slate-300 uppercase bg-slate-700/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-l-lg">Shift (Floor / Bar)</th>
                    {daysInWeek.map(day => (
                      <th key={day} scope="col" className="px-6 py-3">{day.replace('_', ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniqueKeys.map((key, index) => {
                    const isLastRow = index === uniqueKeys.length - 1;
                    const rowClass = isLastRow ? '' : 'border-b border-slate-700';
                    const [floor, bar] = key.split(' / ');

                    return (
                      <tr key={key} className={`bg-slate-800 ${rowClass}`}>
                        <td className="px-6 py-4 font-medium text-slate-200">
                          {floor}<br/><span className="text-xs text-slate-500">{bar}</span>
                        </td>
                        {daysInWeek.map(day => (
                          <td key={day} className="px-6 py-4">
                            {(scheduleGrid[key][day] || []).join(', ')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleView;
