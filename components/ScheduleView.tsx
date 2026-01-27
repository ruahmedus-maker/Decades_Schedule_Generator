
import React, { useMemo, useState } from 'react';
import type { Schedule, DayOfWeek, ScheduledBartender } from '../types';

interface ScheduleViewProps {
  schedule: Schedule;
  startDate?: string;
  onMoveAssignment?: (
    from: { week: number, day: DayOfWeek, floor: string, bar: string },
    to: { week: number, day: DayOfWeek, floor: string, bar: string },
    bartenderName: string
  ) => void;
}

const DAY_ORDER: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];
const FLOOR_ORDER = ['Rooftop', 'Hip Hop', "2010's", "2000's"];

const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, startDate, onMoveAssignment }) => {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // Group data and calculate weekly counts for badges
  const groupedData = useMemo(() => {
    if (!schedule.length) return [];
    const maxWeek = Math.max(...schedule.map(s => s.week));
    const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);
    
    return weeks.map(week => {
      const weekSchedule = schedule.filter(s => s.week === week);
      if (weekSchedule.length === 0) return null;

      const grid: Record<string, Record<string, ScheduledBartender[]>> = {};
      const days = [...new Set<DayOfWeek>(weekSchedule.map(entry => entry.day))].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

      // Calculate shift counts for this week
      const weeklyCounts: Record<string, number> = {};
      weekSchedule.forEach(entry => {
        entry.bartenders.forEach(b => {
            weeklyCounts[b.name] = (weeklyCounts[b.name] || 0) + 1;
        });
        
        const key = `${entry.floor} / ${entry.bar}`;
        if (!grid[key]) grid[key] = {};
        grid[key][entry.day] = entry.bartenders;
      });

      const uniqueKeys = Object.keys(grid).sort((a, b) => {
          const [floorA, barA] = a.split(' / ');
          const [floorB, barB] = b.split(' / ');
          const indexA = FLOOR_ORDER.indexOf(floorA);
          const indexB = FLOOR_ORDER.indexOf(floorB);
          if (indexA !== indexB) return (indexA === -1 ? 1 : indexB === -1 ? -1 : indexA - indexB);
          return barA.localeCompare(barB);
      });

      return { week, grid, days, uniqueKeys, weeklyCounts };
    }).filter(w => w !== null);
  }, [schedule]);

  const getFormattedDate = (start: string, day: DayOfWeek, weekIndex: number) => {
    const date = new Date(start + 'T00:00:00');
    const dayIndex = DAY_ORDER.indexOf(day);
    const offset = dayIndex === 7 ? 6 : dayIndex; 
    date.setDate(date.getDate() + offset + ((weekIndex - 1) * 7));
    return `${day.replace('_', ' ')} ${date.getMonth() + 1}/${date.getDate()}`;
  }

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, bartenderName: string, week: number, day: string, floor: string, bar: string) => {
    const dragData = { name: bartenderName, from: { week, day, floor, bar } };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    setDragOverCell(cellKey);
  };

  const handleDrop = (e: React.DragEvent, week: number, day: DayOfWeek, floor: string, bar: string) => {
    e.preventDefault();
    setDragOverCell(null);
    try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (onMoveAssignment && data.from && data.name) {
            onMoveAssignment(data.from, { week, day, floor, bar }, data.name);
        }
    } catch (err) {
        console.error("Failed to parse drag data", err);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {groupedData.map(({ week, grid, days, uniqueKeys, weeklyCounts }) => (
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
                  {days.map(day => (
                    <th key={day} className="px-6 py-4 text-center">
                      {startDate ? getFormattedDate(startDate, day as DayOfWeek, week) : day.replace('_', ' ')}
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
                      {days.map(day => {
                        const bartenders = grid[key][day] || [];
                        const cellKey = `${week}-${key}-${day}`;
                        const isOver = dragOverCell === cellKey;
                        
                        return (
                          <td 
                            key={day} 
                            className={`px-6 py-4 text-center align-top transition-all duration-200 ${isOver ? 'bg-indigo-600/20 scale-[1.02] shadow-inner' : ''}`}
                            onDragOver={(e) => handleDragOver(e, cellKey)}
                            onDragLeave={() => setDragOverCell(null)}
                            onDrop={(e) => handleDrop(e, week, day as DayOfWeek, floor, bar)}
                          >
                            {bartenders.length > 0 ? (
                              <div className="space-y-2">
                                {bartenders.map((b, idx) => (
                                  <div 
                                    key={idx} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, b.name, week, day, floor, bar)}
                                    className="flex flex-col items-center cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
                                  >
                                    <div className="flex items-center gap-1.5">
                                        <span className={`font-semibold text-sm ${b.role === 'Fixed' ? 'text-amber-400' : 'text-slate-200'}`}>
                                            {b.name}
                                        </span>
                                        {/* Weekly Shift Count Badge */}
                                        <span className="text-[10px] bg-slate-900 text-slate-400 font-bold px-1.5 py-0 rounded-full border border-slate-700" title={`Total shifts this week for ${b.name}`}>
                                            {weeklyCounts[b.name] || 0}
                                        </span>
                                    </div>
                                    {b.role && (
                                      <span className={`text-[9px] mt-0.5 uppercase font-bold px-1.5 py-0.5 rounded ${b.role === 'Fixed' ? 'bg-amber-900/40 text-amber-500 border border-amber-800/50' : 'bg-indigo-900/40 text-indigo-400 border border-indigo-800/50'}`}>
                                        {b.role}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-2">
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest bg-slate-800/40 px-3 py-1.5 rounded-md border border-slate-700/30 block">Open</span>
                              </div>
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
      ))}
    </div>
  );
};

export default ScheduleView;
