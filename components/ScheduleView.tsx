
import React from 'react';
import type { Schedule, DayOfWeek, ScheduledBartender } from '../types';

interface ScheduleViewProps {
  schedule: Schedule;
  startDate?: string;
}

const DAY_ORDER: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];
const FLOOR_ORDER = ['Rooftop', 'Hip Hop', "2010's", "2000's"];

const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, startDate }) => {
  const weeks = [1, 2, 3, 4];

  const getFormattedDate = (start: string, day: DayOfWeek, weekIndex: number) => {
    const date = new Date(start);
    const dayIndex = DAY_ORDER.indexOf(day);
    const offset = dayIndex === 7 ? 6 : dayIndex; 
    date.setDate(date.getDate() + offset + ((weekIndex - 1) * 7));
    return `${day.replace('_', ' ')} ${date.getMonth() + 1}/${date.getDate()}`;
  }

  return (
    <div className="space-y-8">
      {weeks.map(week => {
        const weekSchedule = schedule.filter(s => s.week === week);
        if (weekSchedule.length === 0) return null;

        const scheduleGrid: Record<string, Record<string, ScheduledBartender[]>> = {};
        const daysInWeek: DayOfWeek[] = [...new Set<DayOfWeek>(weekSchedule.map(entry => entry.day))].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

        weekSchedule.forEach(entry => {
          const key = `${entry.floor} / ${entry.bar}`;
          if (!scheduleGrid[key]) scheduleGrid[key] = {};
          scheduleGrid[key][entry.day] = entry.bartenders;
        });

        const uniqueKeys = Object.keys(scheduleGrid).sort((a, b) => {
            const [floorA, barA] = a.split(' / ');
            const [floorB, barB] = b.split(' / ');
            const indexA = FLOOR_ORDER.indexOf(floorA);
            const indexB = FLOOR_ORDER.indexOf(floorB);
            if (indexA !== indexB) return (indexA === -1 ? 1 : indexB === -1 ? -1 : indexA - indexB);
            return barA.localeCompare(barB);
        });
        
        if (uniqueKeys.length === 0) return null;

        return (
          <div key={week} className="animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
               <h3 className="text-xl font-bold text-white bg-indigo-600/20 px-4 py-1 rounded-full border border-indigo-500/30">Week {week}</h3>
               <div className="h-[1px] flex-1 bg-slate-700/50"></div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/30 shadow-inner">
              <table className="w-full min-w-[900px] text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 font-bold border-r border-slate-700/50">Shift</th>
                    {daysInWeek.map(day => (
                      <th key={day} className="px-6 py-4 text-center">
                        {startDate ? getFormattedDate(startDate, day, week) : day.replace('_', ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {uniqueKeys.map((key) => {
                    const [floor, bar] = key.split(' / ');
                    return (
                      <tr key={key} className="hover:bg-slate-700/20 transition-colors group">
                        <td className="px-6 py-4 border-r border-slate-700/50">
                          <div className="font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">{floor}</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{bar}</div>
                        </td>
                        {daysInWeek.map(day => {
                          const bartenders = scheduleGrid[key][day] || [];
                          return (
                            <td key={day} className="px-6 py-4 text-center align-top">
                              {bartenders.length > 0 ? (
                                <div className="space-y-1">
                                  {bartenders.map((b, idx) => (
                                    <div key={idx} className="flex flex-col items-center">
                                      <span className={`font-semibold ${b.role === 'Fixed' ? 'text-amber-400' : 'text-slate-200'}`}>
                                        {b.name}
                                      </span>
                                      {b.role && (
                                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${b.role === 'Fixed' ? 'bg-amber-900/40 text-amber-500' : 'bg-indigo-900/40 text-indigo-400'}`}>
                                          {b.role}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest bg-slate-800/40 px-3 py-1.5 rounded-md border border-slate-700/30">Open</span>
                              )}
                            </td>
                          );
                        })}
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
