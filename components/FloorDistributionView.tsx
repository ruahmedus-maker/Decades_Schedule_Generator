import React, { useMemo } from 'react';
import type { Schedule, Bartender } from '../types';

interface FloorDistributionViewProps {
  schedule: Schedule;
  bartenders: Bartender[];
}

const FLOOR_ORDER = ['Rooftop', 'Hip Hop', "2010's", "2000's"];

const FloorDistributionView: React.FC<FloorDistributionViewProps> = ({ schedule, bartenders }) => {
  const distributionData = useMemo(() => {
    const data: Record<string, Record<string, number>> = bartenders.reduce((acc, b) => {
      acc[b.name] = {};
      FLOOR_ORDER.forEach(floor => {
        acc[b.name][floor] = 0;
      });
      return acc;
    }, {} as Record<string, Record<string, number>>);

    schedule.forEach(entry => {
      const { floor, bartenders: assigned } = entry;
      assigned.forEach(name => {
        if (data[name] && data[name][floor] !== undefined) {
          data[name][floor]++;
        }
      });
    });

    return Object.entries(data).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
  }, [schedule, bartenders]);

  return (
    <div>
      <h3 className="text-xl font-bold text-indigo-400 mb-3">Floor Distribution Summary</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm text-left text-slate-400">
          <thead className="text-xs text-slate-300 uppercase bg-slate-700/50">
            <tr>
              <th scope="col" className="px-6 py-3 rounded-l-lg">Bartender</th>
              {FLOOR_ORDER.map(floor => (
                <th key={floor} scope="col" className="px-6 py-3 text-center">{floor}</th>
              ))}
               <th scope="col" className="px-6 py-3 text-center rounded-r-lg"></th>
            </tr>
          </thead>
          <tbody>
            {distributionData.map(([name, floors], index) => {
              const isLastRow = index === distributionData.length - 1;
              const rowClass = isLastRow ? '' : 'border-b border-slate-700';
              return (
                <tr key={name} className={`bg-slate-800 ${rowClass}`}>
                  <td className="px-6 py-4 font-medium text-slate-200">{name}</td>
                  {FLOOR_ORDER.map(floor => (
                    <td key={floor} className="px-6 py-4 text-center">
                      {floors[floor] || 0}
                    </td>
                  ))}
                   <td className="px-6 py-4 text-center"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FloorDistributionView;
