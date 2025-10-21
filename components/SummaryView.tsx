import React, { useMemo } from 'react';
import type { Schedule, Bartender, EarningsMap, SummaryData } from '../types';

interface SummaryViewProps {
  schedule: Schedule;
  bartenders: Bartender[];
  earningsMap: EarningsMap;
}

const SummaryView: React.FC<SummaryViewProps> = ({ schedule, bartenders, earningsMap }) => {
  const summaryData: SummaryData[] = useMemo(() => {
    const summary: Record<string, { shiftCount: number; totalEarnings: number }> = 
        bartenders.reduce((acc, b) => ({ ...acc, [b.name]: { shiftCount: 0, totalEarnings: 0 } }), {});

    schedule.forEach(entry => {
        const { floor, bar, day, bartenders: assigned } = entry;
        const earnings = earningsMap[floor]?.[bar]?.[day] || 0;
        
        assigned.forEach(name => {
            if (summary[name]) {
                summary[name].shiftCount++;
                summary[name].totalEarnings += earnings;
            }
        });
    });

    return bartenders.map(bartender => {
        const data = summary[bartender.name];
        return {
            name: bartender.name,
            shiftCount: data.shiftCount,
            totalEarnings: data.totalEarnings,
            averageEarnings: data.shiftCount > 0 ? data.totalEarnings / data.shiftCount : 0,
        };
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [schedule, bartenders, earningsMap]);

  return (
    <div>
        <h3 className="text-xl font-bold text-indigo-400 mb-3">Monthly Summary</h3>
        <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm text-left text-slate-400">
                <thead className="text-xs text-slate-300 uppercase bg-slate-700/50">
                    <tr>
                        <th scope="col" className="px-6 py-3 rounded-l-lg">Bartender</th>
                        <th scope="col" className="px-6 py-3 text-center">Total Shifts</th>
                        <th scope="col" className="px-6 py-3 text-center">Total Earnings</th>
                        <th scope="col" className="px-6 py-3 text-center rounded-r-lg">Avg. / Shift</th>
                    </tr>
                </thead>
                <tbody>
                    {summaryData.map((data, index) => {
                         const isLastRow = index === summaryData.length - 1;
                         const rowClass = isLastRow ? '' : 'border-b border-slate-700';
                        return (
                            <tr key={data.name} className={`bg-slate-800 ${rowClass}`}>
                                <td className="px-6 py-4 font-medium text-slate-200">{data.name}</td>
                                <td className="px-6 py-4 text-center">{data.shiftCount}</td>
                                <td className="px-6 py-4 text-center">${data.totalEarnings.toFixed(2)}</td>
                                <td className="px-6 py-4 text-center">${data.averageEarnings.toFixed(2)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default SummaryView;