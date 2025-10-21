
import React from 'react';
import type { Schedule, DayOfWeek } from '../types';

interface ScheduleViewProps {
  schedule: Schedule;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule }) => {
  const weeks = [1, 2, 3, 4];
  const days: DayOfWeek[] = ['Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];

  return (
    <div className="space-y-8">
      {weeks.map(week => {
        const weekSchedule = schedule.filter(s => s.week === week);
        if (weekSchedule.length === 0) {
          return null;
        }

        const scheduleGrid: Record<string, Record<string, string[]>> = {};
        const floors = new Set<string>();

        weekSchedule.forEach(entry => {
          const key = `${entry.floor} / ${entry.bar}`;
          if (!scheduleGrid[key]) {
            scheduleGrid[key] = {};
          }
          scheduleGrid[key][entry.day] = entry.bartenders;
          floors.add(entry.floor);
        });

        const sortedFloors = Array.from(floors);
        const uniqueKeys = Object.keys(scheduleGrid).sort((a, b) => {
            const floorA = a.split(' / ')[0];
            const floorB = b.split(' / ')[0];
            return sortedFloors.indexOf(floorA) - sortedFloors.indexOf(floorB);
        });

        return (
          <div key={week}>
            <h3 className="text-xl font-bold text-indigo-400 mb-3">Week {week}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm text-left text-slate-400">
                <thead className="text-xs text-slate-300 uppercase bg-slate-700/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-l-lg">Shift (Floor / Bar)</th>
                    {days.map(day => (
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
                        {days.map(day => (
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
