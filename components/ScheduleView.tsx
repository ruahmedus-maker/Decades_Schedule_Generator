
import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Schedule, DayOfWeek, ScheduledBartender, Bartender } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ScheduleViewProps {
  schedule: Schedule;
  startDate?: string;
  bartenders?: Bartender[];
  onMoveAssignment?: (
    from: { week: number, day: DayOfWeek, floor: string, bar: string },
    to: { week: number, day: DayOfWeek, floor: string, bar: string },
    bartenderName: string
  ) => void;
  onAssignBartender?: (
    week: number, day: DayOfWeek, floor: string, bar: string, bartenderName: string | null
  ) => void;
}

const DAY_ORDER: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];
const FLOOR_ORDER = ['Rooftop', 'Hip Hop', "2010's", "2000's"];

const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, startDate, onMoveAssignment, onAssignBartender, bartenders = [] }) => {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEditingCell(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      // Calculate shift counts for this specific week
      const weeklyCounts: Record<string, number> = {};
      weekSchedule.forEach(entry => {
        entry.bartenders.forEach(b => {
            weeklyCounts[b.name] = (weeklyCounts[b.name] || 0) + 1;
        });
        
        const key = `${entry.floor.trim()} / ${entry.bar.trim()}`;
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

  const toggleEditing = (cellKey: string) => {
    setEditingCell(prev => prev === cellKey ? null : cellKey);
  }

  const handleQuickAssign = (week: number, day: DayOfWeek, floor: string, bar: string, name: string | null) => {
    if (onAssignBartender) {
      onAssignBartender(week, day, floor, bar, name);
    }
    // We don't close the menu automatically if adding multiple, 
    // but the user's logic might prefer closing it. Let's close for simplicity.
    setEditingCell(null);
  }

  return (
    <div className="space-y-8 select-none">
      {groupedData.map(({ week, grid, days, uniqueKeys, weeklyCounts }) => (
        <div key={week} className="animate-fadeIn">
          <div className="flex items-center gap-3 mb-4">
             <h3 className="text-xl font-bold text-white bg-indigo-600/20 px-4 py-1 rounded-full border border-indigo-500/30">Week {week}</h3>
             <div className="h-[1px] flex-1 bg-slate-700/50"></div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/30 shadow-inner">
            <table className="w-full min-w-[900px] text-sm text-left border-separate border-spacing-0">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 sticky top-0 z-20">
                <tr>
                  <th className="px-6 py-4 font-bold border-r border-b border-slate-700/50 bg-slate-900/50">Shift</th>
                  {days.map(day => (
                    <th key={day} className="px-6 py-4 text-center border-b border-slate-700/50 bg-slate-900/50">
                      {startDate ? getFormattedDate(startDate, day as DayOfWeek, week) : day.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {uniqueKeys.map((key, rowIndex) => {
                  const [floor, bar] = key.split(' / ');
                  return (
                    <tr key={key} className="hover:bg-slate-700/10 transition-colors group">
                      <td className="px-6 py-4 border-r border-slate-700/50 font-medium sticky left-0 z-10 bg-slate-800/95 group-hover:bg-slate-700/20 transition-colors">
                        <div className="font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">{floor}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{bar}</div>
                      </td>
                      {days.map(day => {
                        const cellBartenders = grid[key][day] || [];
                        const cellKey = `${week}-${key}-${day}`;
                        const isOver = dragOverCell === cellKey;
                        const isEditing = editingCell === cellKey;
                        
                        // Decide if dropdown should open upwards or downwards
                        const isLastRows = rowIndex > uniqueKeys.length - 4;
                        
                        return (
                          <td 
                            key={day} 
                            className={`px-6 py-4 text-center align-top transition-all duration-200 cursor-pointer relative ${isOver ? 'bg-indigo-600/30 scale-[1.02] shadow-[inset_0_0_10px_rgba(79,70,229,0.3)]' : ''}`}
                            onDragOver={(e) => handleDragOver(e, cellKey)}
                            onDragLeave={() => setDragOverCell(null)}
                            onDrop={(e) => handleDrop(e, week, day as DayOfWeek, floor, bar)}
                            onClick={(e) => {
                                e.preventDefault();
                                toggleEditing(cellKey);
                            }}
                          >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
                                <PlusIcon className="w-4 h-4 text-slate-400" />
                            </div>

                            {cellBartenders.length > 0 ? (
                              <div className="space-y-3 pointer-events-none">
                                {cellBartenders.map((b, idx) => (
                                  <div 
                                    key={idx} 
                                    draggable
                                    onDragStart={(e) => {
                                        e.stopPropagation(); // Allow dragging handles
                                        handleDragStart(e, b.name, week, day, floor, bar);
                                    }}
                                    className="flex flex-col items-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform duration-150 pointer-events-auto"
                                    onClick={(e) => e.stopPropagation()} 
                                  >
                                    <div className="flex items-center gap-1.5 relative group/name">
                                        <span className={`font-semibold text-sm ${b.role === 'Fixed' ? 'text-amber-400' : 'text-slate-200'}`}>
                                            {b.name}
                                        </span>
                                        <span 
                                            className="text-[10px] bg-slate-900/80 text-indigo-400 font-bold px-1.5 py-0 rounded-full border border-indigo-500/30 shadow-sm" 
                                            title={`Total shifts this week for ${b.name}`}
                                        >
                                            {weeklyCounts[b.name] || 0}
                                        </span>
                                    </div>
                                    {b.role && (
                                      <span className={`text-[9px] mt-1 uppercase font-bold px-1.5 py-0.5 rounded ${b.role === 'Fixed' ? 'bg-amber-900/40 text-amber-500 border border-amber-800/50' : 'bg-indigo-900/40 text-indigo-400 border border-indigo-800/50'}`}>
                                        {b.role}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-2 pointer-events-none">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-900/10 px-3 py-1.5 rounded-md border border-slate-700/20 block">Open</span>
                              </div>
                            )}

                            {/* Floating Dropdown for Quick Assignment */}
                            {isEditing && (
                              <div 
                                ref={dropdownRef}
                                className={`absolute z-[100] left-1/2 -translate-x-1/2 ${isLastRows ? 'bottom-full mb-2' : 'top-full mt-2'} w-52 bg-slate-800 border border-slate-600 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-hidden animate-fadeIn`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-3 border-b border-slate-700 bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex justify-between items-center">
                                  <span>Manage Shift</span>
                                  <span className="text-slate-600 text-[8px]">{day} - {bar}</span>
                                </div>
                                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                  <button 
                                    onClick={() => handleQuickAssign(week, day as DayOfWeek, floor, bar, null)}
                                    className="w-full text-left px-4 py-3 text-xs text-red-400 hover:bg-red-900/20 flex items-center gap-2 transition-colors border-b border-slate-700"
                                  >
                                    <TrashIcon className="w-4 h-4" /> Clear All Assignments
                                  </button>
                                  <div className="bg-slate-900/20 py-1">
                                    {bartenders.map(b => {
                                      const isCurrentlyAssigned = cellBartenders.some(cb => cb.name === b.name);
                                      return (
                                        <button 
                                          key={b.name}
                                          onClick={() => handleQuickAssign(week, day as DayOfWeek, floor, bar, b.name)}
                                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex justify-between items-center ${isCurrentlyAssigned ? 'bg-indigo-900/30 text-indigo-300' : 'text-slate-200 hover:bg-indigo-600'}`}
                                        >
                                          <div className="flex items-center gap-2">
                                              <span>{b.name}</span>
                                              {isCurrentlyAssigned && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>}
                                          </div>
                                          <span className="text-[10px] text-slate-500 font-mono">T{b.tier}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
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
