import React, { useState, useCallback, useEffect } from 'react';
import type { Schedule, Bartender, FixedAssignment, TargetShifts, TimeOffRequest } from './types';
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
import { DownloadIcon } from './components/icons/DownloadIcon';
import { CalendarIcon } from './components/icons/CalendarIcon';

const App: React.FC = () => {
  const [bartenders, setBartenders] = useState<Bartender[]>(initialBartenders);
  const [fixedAssignments, setFixedAssignments] = useState<FixedAssignment[]>(() => {
    try {
      const savedAssignments = window.localStorage.getItem('fixedAssignments');
      if (savedAssignments) {
        return JSON.parse(savedAssignments);
      }
    } catch (error) {
      console.error('Error reading fixed assignments from localStorage', error);
    }
    return initialFixedAssignments;
  });
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [targetShifts, setTargetShifts] = useState<TargetShifts>({});
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Initialize or update target shifts when bartenders list changes
    setTargetShifts(prevTargets => {
      const newTargets: TargetShifts = {};
      const averageShifts = Math.floor(SHIFTS_TEMPLATE.length * 4 * 1.5 / bartenders.length) || 10;
      bartenders.forEach(b => {
        newTargets[b.name] = prevTargets[b.name] || averageShifts;
      });
      return newTargets;
    });
  }, [bartenders]);

  useEffect(() => {
    try {
      window.localStorage.setItem('fixedAssignments', JSON.stringify(fixedAssignments));
    } catch (error) {
      console.error('Error saving fixed assignments to localStorage', error);
    }
  }, [fixedAssignments]);

  const handleGenerateSchedule = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setSchedule(null);

    // Use a timeout to allow the UI to update to the loading state before the potentially blocking calculation starts.
    setTimeout(() => {
      try {
        const generatedSchedule = generateSchedule(bartenders, SHIFTS_TEMPLATE, fixedAssignments, targetShifts, timeOffRequests);
        setSchedule(generatedSchedule);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the schedule. This could be due to impossible constraints (e.g., not enough staff for required shifts).');
      } finally {
        setIsLoading(false);
      }
    }, 50);
  }, [bartenders, fixedAssignments, targetShifts, timeOffRequests]);
  
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

        <main className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Controls Section */}
          <aside className="xl:col-span-1 space-y-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg h-fit xl:sticky xl:top-8">
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
                  onClick={() => exportScheduleToHtml(schedule, bartenders, targetShifts, currentMonth, EARNINGS_MAP)}
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
