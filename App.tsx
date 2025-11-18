import React, { useState, useCallback, useEffect } from 'react';
import type { Schedule, Bartender, FixedAssignment, TargetShifts, TimeOffRequest, ClosedShift } from './types';
import { BARTENDERS as initialBartenders, SHIFTS_TEMPLATE, FIXED_ASSIGNMENTS as initialFixedAssignments, EARNINGS_MAP } from './data';
import { generateSchedule } from './services/schedulingAlgorithm';
import { exportScheduleToHtml } from './utils/scheduleExporter';
import ScheduleView from './components/ScheduleView';
import SummaryView from './components/SummaryView';
import BartenderManager from './components/BartenderManager';
import FixedShiftManager from './components/FixedShiftManager';
import WeeklyAvailabilityManager from './components/WeeklyAvailabilityManager';
import TimeOffRequestManager from './components/TimeOffRequestManager';
import TargetShiftsManager from './components/TargetShiftsManager';
import EventShiftManager from './components/EventShiftManager';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { CalendarIcon } from './components/icons/CalendarIcon';
import FloorDistributionView from './components/FloorDistributionView';

const App: React.FC = () => {
  // --- State Initialization with Persistence ---
  const [bartenders, setBartenders] = useState<Bartender[]>(() => {
    try {
      const saved = window.localStorage.getItem('bartenders');
      return saved ? JSON.parse(saved) : initialBartenders;
    } catch (error) {
      console.error('Error reading bartenders from localStorage', error);
      return initialBartenders;
    }
  });

  const [fixedAssignments, setFixedAssignments] = useState<FixedAssignment[]>(() => {
    try {
      const saved = window.localStorage.getItem('fixedAssignments');
      return saved ? JSON.parse(saved) : initialFixedAssignments;
    } catch (error) {
      console.error('Error reading fixed assignments from localStorage', error);
      return initialFixedAssignments;
    }
  });

  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>(() => {
    try {
      const saved = window.localStorage.getItem('timeOffRequests');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error reading timeOffRequests from localStorage', error);
      return [];
    }
  });

  const [targetShifts, setTargetShifts] = useState<TargetShifts>(() => {
    try {
      const saved = window.localStorage.getItem('targetShifts');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error reading targetShifts from localStorage', error);
      return {};
    }
  });
  
  const [closedShifts, setClosedShifts] = useState<ClosedShift[]>(() => {
    try {
      const saved = window.localStorage.getItem('closedShifts');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error reading closedShifts from localStorage', error);
      return [];
    }
  });

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- State Persistence ---
  useEffect(() => {
    try {
      window.localStorage.setItem('bartenders', JSON.stringify(bartenders));
    } catch (error) {
      console.error('Error saving bartenders to localStorage', error);
    }
  }, [bartenders]);

  useEffect(() => {
    try {
      window.localStorage.setItem('fixedAssignments', JSON.stringify(fixedAssignments));
    } catch (error) {
      console.error('Error saving fixed assignments to localStorage', error);
    }
  }, [fixedAssignments]);
  
  useEffect(() => {
    try {
      window.localStorage.setItem('timeOffRequests', JSON.stringify(timeOffRequests));
    } catch (error) {
      console.error('Error saving timeOffRequests to localStorage', error);
    }
  }, [timeOffRequests]);

  useEffect(() => {
    try {
      window.localStorage.setItem('targetShifts', JSON.stringify(targetShifts));
    } catch (error) {
      console.error('Error saving targetShifts to localStorage', error);
    }
  }, [targetShifts]);
  
  useEffect(() => {
    try {
      window.localStorage.setItem('closedShifts', JSON.stringify(closedShifts));
    } catch (error) {
      console.error('Error saving closedShifts to localStorage', error);
    }
  }, [closedShifts]);

  // --- Logic Effects ---
  useEffect(() => {
    // Sync target shifts with the main bartender list.
    // This adds new bartenders with a default target and removes bartenders who are no longer in the roster.
    setTargetShifts(prevTargets => {
      const newTargets: TargetShifts = {};
      const averageShifts = Math.floor(SHIFTS_TEMPLATE.length * 4 * 1.5 / bartenders.length) || 10;
      
      bartenders.forEach(b => {
        // If a target already exists (e.g., from localStorage), use it. Otherwise, set a default.
        newTargets[b.name] = prevTargets[b.name] !== undefined ? prevTargets[b.name] : averageShifts;
      });
      return newTargets;
    });
  }, [bartenders]);

  const handleGenerateSchedule = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setSchedule(null);

    // Use a timeout to allow the UI to update to the loading state before the potentially blocking calculation starts.
    setTimeout(() => {
      try {
        const generatedSchedule = generateSchedule(bartenders, SHIFTS_TEMPLATE, fixedAssignments, targetShifts, timeOffRequests, closedShifts);
        setSchedule(generatedSchedule);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the schedule. This could be due to impossible constraints (e.g., not enough staff for required shifts).');
      } finally {
        setIsLoading(false);
      }
    }, 50);
  }, [bartenders, fixedAssignments, targetShifts, timeOffRequests, closedShifts]);
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            AI Bartender Schedule Generator
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            Intelligent 4-week scheduling based on your club's specific rules.
          </p>
        </header>

        <main className="grid grid-cols-1 xl:grid-cols-4 xl:items-start gap-8">
          {/* Controls Section */}
          <aside className="xl:col-span-1 space-y-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg xl:sticky xl:top-8">
            <BartenderManager bartenders={bartenders} setBartenders={setBartenders} />
            
            <WeeklyAvailabilityManager bartenders={bartenders} setBartenders={setBartenders} />
            
            <TimeOffRequestManager 
              timeOffRequests={timeOffRequests} 
              setTimeOffRequests={setTimeOffRequests} 
              bartenders={bartenders} 
            />

            <TargetShiftsManager targetShifts={targetShifts} setTargetShifts={setTargetShifts} />
            
            <FixedShiftManager
              fixedAssignments={fixedAssignments}
              setFixedAssignments={setFixedAssignments}
              bartenders={bartenders}
              shifts={SHIFTS_TEMPLATE}
            />

            <EventShiftManager
              closedShifts={closedShifts}
              setClosedShifts={setClosedShifts}
              shifts={SHIFTS_TEMPLATE}
            />

            <div className="pt-4 border-t border-slate-700">
              <button
                onClick={handleGenerateSchedule}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-5 w-5" />
                    Generate 4-Week Schedule
                  </>
                )}
              </button>
            </div>
          </aside>

          {/* Schedule Display Section */}
          <section className="xl:col-span-3 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
              <h2 className="text-2xl font-bold text-white">Schedule for {currentMonth}</h2>
              {schedule && schedule.length > 0 && (
                <button
                  onClick={() => exportScheduleToHtml(schedule, currentMonth, bartenders, EARNINGS_MAP)}
                  className="flex items-center justify-center sm:justify-start gap-2 bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500"
                >
                  <DownloadIcon className="h-5 w-5" />
                  Export HTML Report
                </button>
              )}
            </div>
            
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
                <p><strong>Error:</strong> {error}</p>
              </div>
            )}
            
            <div className="mt-4 space-y-8">
              {schedule ? (
                <>
                  <SummaryView schedule={schedule} bartenders={bartenders} earningsMap={EARNINGS_MAP} />
                  <FloorDistributionView schedule={schedule} bartenders={bartenders} />
                  <ScheduleView schedule={schedule} />
                </>
              ) : (
                 !isLoading && !error && (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
                      <CalendarIcon className="h-16 w-16 mb-4 text-slate-600"/>
                      <p className="text-lg font-semibold">Your generated schedule will appear here.</p>
                      <p>Click "Generate 4-Week Schedule" to begin.</p>
                  </div>
                 )
              )}
               {isLoading && (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
                      <p className="text-lg font-semibold">Crafting the perfect schedule based on your rules...</p>
                      <p>This may take a moment.</p>
                  </div>
               )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;