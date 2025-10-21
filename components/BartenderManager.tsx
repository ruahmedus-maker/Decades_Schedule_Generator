import React, { useState } from 'react';
import type { Bartender } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';

interface BartenderManagerProps {
  bartenders: Bartender[];
  setBartenders: React.Dispatch<React.SetStateAction<Bartender[]>>;
}

const BartenderManager: React.FC<BartenderManagerProps> = ({ bartenders, setBartenders }) => {
  const [newBartender, setNewBartender] = useState({ name: '', tier: 2, gender: 'Female' as 'Male' | 'Female' });

  const handleAddBartender = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBartender.name.trim() && !bartenders.some(b => b.name === newBartender.name.trim())) {
      const bartenderToAdd: Bartender = {
        ...newBartender,
        name: newBartender.name.trim(),
        unavailableDays: []
      };
      setBartenders([...bartenders, bartenderToAdd].sort((a, b) => a.name.localeCompare(b.name)));
      setNewBartender({ name: '', tier: 2, gender: 'Female' });
    }
  };

  const handleRemoveBartender = (nameToRemove: string) => {
    setBartenders(bartenders.filter(b => b.name !== nameToRemove));
  };

  return (
    <div className="space-y-4">
       <h3 className="text-base font-semibold text-slate-200">Manage Bartender Roster</h3>
      {/* Bartender List */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {bartenders.map(b => (
          <div key={b.name} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
                <div>
                    <span className="font-semibold text-slate-200">{b.name}</span>
                    <span className="text-xs text-slate-400 ml-2">(T{b.tier} {b.gender})</span>
                </div>
                <button
                onClick={() => handleRemoveBartender(b.name)}
                className="text-slate-400 hover:text-red-400 p-1 rounded-full transition-colors"
                aria-label={`Remove ${b.name}`}
                >
                <TrashIcon className="h-4 w-4" />
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Bartender Form */}
      <form onSubmit={handleAddBartender} className="space-y-2 pt-4 border-t border-slate-700">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
                type="text"
                value={newBartender.name}
                onChange={(e) => setNewBartender(prev => ({ ...prev, name: e.target.value }))}
                placeholder="New bartender name"
                className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                required
            />
             <select
                value={newBartender.tier}
                onChange={(e) => setNewBartender(prev => ({ ...prev, tier: parseInt(e.target.value) }))}
                className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
                <option value={1}>Tier 1</option>
                <option value={2}>Tier 2</option>
                <option value={3}>Tier 3</option>
            </select>
             <select
                value={newBartender.gender}
                onChange={(e) => setNewBartender(prev => ({ ...prev, gender: e.target.value as 'Male'|'Female' }))}
                className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
            </select>
            <button
                type="submit"
                className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-500 disabled:bg-slate-600 transition-colors duration-200 flex-shrink-0 flex items-center justify-center gap-1.5 text-sm font-semibold"
                disabled={!newBartender.name.trim()}
                >
                <UserPlusIcon className="h-4 w-4" />
                Add
            </button>
        </div>
      </form>
    </div>
  );
};

export default BartenderManager;