import React from 'react';
import type { TargetShifts } from '../types';

interface TargetShiftsManagerProps {
  targetShifts: TargetShifts;
  setTargetShifts: React.Dispatch<React.SetStateAction<TargetShifts>>;
}

const TargetShiftsManager: React.FC<TargetShiftsManagerProps> = ({ targetShifts, setTargetShifts }) => {
  
  const handleTargetChange = (name: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setTargetShifts(prev => ({
        ...prev,
        [name]: numValue,
      }));
    } else if (value === '') {
        setTargetShifts(prev => ({
            ...prev,
            [name]: 0,
          }));
    }
  };

  const sortedBartenderNames = Object.keys(targetShifts).sort();

  return (
    <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Monthly Shift Targets</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {sortedBartenderNames.map(name => (
                 <div key={name} className="grid grid-cols-3 items-center gap-2">
                    <label htmlFor={`target-${name}`} className="text-sm text-slate-300 truncate col-span-2">
                        {name}
                    </label>
                    <input
                        id={`target-${name}`}
                        type="number"
                        min="0"
                        value={targetShifts[name]}
                        onChange={(e) => handleTargetChange(name, e.target.value)}
                        className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-1.5 text-sm text-center text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            ))}
        </div>
    </div>
  );
};

export default TargetShiftsManager;
