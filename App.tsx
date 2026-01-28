
import React, { useState, useCallback, useEffect } from 'react';
import type { Schedule, Bartender, FixedAssignment, TargetShifts, TimeOffRequest, ClosedShift, DayOfWeek, DailyOverride } from './types';
import { BARTENDERS as initialBartenders, SHIFTS_TEMPLATE, FIXED_ASSIGNMENTS as initialFixedAssignments, EARNINGS_MAP } from './data';
import { generateSchedule, generateFixedOnlySchedule } from './services/schedulingAlgorithm';
import { exportScheduleToHtml } from './utils/scheduleExporter';
import ScheduleView from './components/ScheduleView';
import SummaryView from './components/SummaryView';
import BartenderManager from './components/BartenderManager';
import FixedShiftManager from './components/FixedShiftManager';
import WeeklyAvailabilityManager from './components/WeeklyAvailabilityManager';
import TimeOffRequestManager from './components/TimeOffRequestManager';
import TargetShiftsManager from './components/TargetShiftsManager';
import EventShiftManager from './components/EventShiftManager';
import DailyOverrideManager from './components/DailyOverrideManager';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { CalendarIcon } from './components/icons/CalendarIcon';
import { EyeIcon } from './components/icons/EyeIcon';
import FloorDistributionView from './components/FloorDistributionView';

const App: React.FC = () => {
  // --- State Initialization with Persistence ---
  const [bartenders, setBartenders] = useState<Bartender[]>(() => {
    const saved = window.localStorage.getItem('bartenders');
    return saved ? JSON.parse(saved) : initialBartenders;
  });

  const [fixedAssignments, setFixedAssignments] = useState<FixedAssignment[]>(() => {
    const saved = window.localStorage.getItem('fixedAssignments');
    return saved ? JSON.parse(saved) : initialFixedAssignments;
  });

  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>(() => {
    const saved = window.localStorage.getItem('timeOffRequests');
    return saved ? JSON.parse(saved) : [];
  });

  const [targetShifts, setTargetShifts] = useState<TargetShifts>(() => {
    const saved = window.localStorage.getItem('targetShifts');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [closedShifts, setClosedShifts] = useState<ClosedShift[]>(() => {
    const saved = window.localStorage.getItem('closedShifts');
    return saved ? JSON.parse(saved) : [];
  });

  const [generationMode, setGenerationMode] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [weeksToGenerate, setWeeksToGenerate] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + (1 + 7 - d.getDay()) % 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  
  const [dailyOverrides, setDailyOverrides] = useState<DailyOverride[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  
  useEffect(() => {
    if (generationMode === 'monthly') setWeeksToGenerate(5);
    else if (generationMode === 'weekly') setWeeksToGenerate(1);
  }, [generationMode]);

  useEffect(() => window.localStorage.setItem('bartenders', JSON.stringify(bartenders)), [bartenders]);
  useEffect(() => window.localStorage.setItem('fixedAssignments', JSON.stringify(fixedAssignments)), [fixedAssignments]);
  useEffect(() => window.localStorage.setItem('timeOffRequests', JSON.stringify(timeOffRequests)), [timeOffRequests]);
  useEffect(() => window.localStorage.setItem('targetShifts', JSON.stringify(targetShifts)), [targetShifts]);
  useEffect(() => window.localStorage.setItem('closedShifts', JSON.stringify(closedShifts)), [closedShifts]);

  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday;
  }

  const getSpecificDay = useCallback(() => {
    if (generationMode !== 'daily') return undefined;
    const d = new Date(startDate + 'T00:00:00');
    const dayMap: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayMap[d.getDay()];
  }, [startDate, generationMode]);

  const handlePreviewFixed = useCallback(() => {
    setIsLoading(true);
    setStatusMsg('Preparing fixed assignment preview...');
    setTimeout(() => {
      try {
        const generated = generateFixedOnlySchedule(
            SHIFTS_TEMPLATE,
            fixedAssignments,
            closedShifts,
            weeksToGenerate,
            getSpecificDay(),
            generationMode === 'daily' ? dailyOverrides : []
        );
        setSchedule(generated);
      } catch (err) {
        setError('Error generating preview.');
      } finally {
        setIsLoading(false);
        setStatusMsg(null);
      }
    }, 50);
  }, [fixedAssignments, closedShifts, generationMode, weeksToGenerate, dailyOverrides, getSpecificDay]);

  const handleGenerateSchedule = useCallback(() => {
    setIsLoading(true);
    setStatusMsg('AI is calculating optimal distribution...');
    setError(null);
    setTimeout(() => {
      try {
        const effectiveBaseDate = getEffectiveMondayDate() || startDate;
        const generatedSchedule = generateSchedule(
            bartenders, 
            SHIFTS_TEMPLATE, 
            fixedAssignments, 
            targetShifts, 
            timeOffRequests, 
            closedShifts,
            weeksToGenerate,
            getSpecificDay(),
            generationMode === 'daily' ? dailyOverrides : [],
            effectiveBaseDate
        );
        setSchedule(generatedSchedule);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred.');
      } finally {
        setIsLoading(false);
        setStatusMsg(null);
      }
    }, 50);
  }, [bartenders, fixedAssignments, targetShifts, timeOffRequests, closedShifts, generationMode, weeksToGenerate, dailyOverrides, getSpecificDay, startDate]);
  
  const handleMoveAssignment = useCallback((
    from: { week: number, day: DayOfWeek, floor: string, bar: string },
    to: { week: number, day: DayOfWeek, floor: string, bar: string },
    bartenderName: string
  ) => {
    if (!schedule) return;

    // 1. Update Fixed Assignments
    setFixedAssignments(prev => {
      const filtered = prev.filter(fa => 
        !(fa.name === bartenderName && 
          parseInt(fa.week.split('_')[1]) === from.week && 
          fa.day === from.day && 
          fa.floor.trim() === from.floor.trim() && 
          fa.bar.trim() === from.bar.trim())
      );
      
      const newRule: FixedAssignment = {
        name: bartenderName,
        week: `Week_${to.week}` as any,
        day: to.day,
        floor: to.floor,
        bar: to.bar
      };
      
      return [...filtered, newRule];
    });

    // 2. Immediate UI Update
    setSchedule(prev => {
      if (!prev) return null;
      return prev.map(entry => {
        // Remove from original cell
        if (entry.week === from.week && entry.day === from.day && entry.floor.trim() === from.floor.trim() && entry.bar.trim() === from.bar.trim()) {
          return { ...entry, bartenders: entry.bartenders.filter(b => b.name !== bartenderName) };
        }
        // Add to destination cell
        if (entry.week === to.week && entry.day === to.day && entry.floor.trim() === to.floor.trim() && entry.bar.trim() === to.bar.trim()) {
          if (entry.bartenders.some(b => b.name === bartenderName)) return entry;
          return { ...entry, bartenders: [...entry.bartenders, { name: bartenderName, role: 'Fixed' }] };
        }
        return entry;
      });
    });
  }, [schedule]);

  const scheduleTitle = useCallback(() => {
    if (!startDate) return 'Schedule';
    const dateObj = new Date(startDate + 'T00:00:00');
    if (generationMode === 'daily') return dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    const startMonday = getMonday(dateObj);
    if (generationMode === 'weekly') return `Week of ${startMonday.toLocaleDateString()}`;
    const endDate = new Date(startMonday);
    endDate.setDate(endDate.getDate() + (weeksToGenerate * 7) - 1); 
    return `${startMonday.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }, [startDate, generationMode, weeksToGenerate])();

  const getEffectiveMondayDate = () => {
    if (!startDate) return undefined;
    const d = new Date(startDate + 'T00:00:00');
    const monday = getMonday(d);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  };

  const effectiveStartDate = getEffectiveMondayDate();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            AI Bartender Schedule Generator
          </h1>
          <p className="mt-2 text-lg text-slate-400">Smart logic for automated club scheduling.</p>
        </header>

        <main className="grid grid-cols-1 xl:grid-cols-4 xl:items-start gap-8">
          <aside className="xl:col-span-1 space-y-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg xl:sticky xl:top-8 overflow-y-auto max-h-[calc(100vh-4rem)] custom-scrollbar">
            <div className="space-y-4 border-b border-slate-700 pb-6">
                <h3 className="text-base font-semibold text-slate-200">Schedule Mode</h3>
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-600">
                    {['monthly', 'weekly', 'daily'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setGenerationMode(mode as any)}
                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${generationMode === mode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                </div>
                
                {generationMode !== 'daily' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Number of Weeks</label>
                    <select 
                      value={weeksToGenerate}
                      onChange={(e) => setWeeksToGenerate(parseInt(e.target.value))}
                      className="w-full bg-slate-900/70 border border-slate-600 rounded-md py-2 px-3 text-sm text-slate-200"
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Week{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                )}

                <div>
                    <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"/>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-900/70 border border-slate-600 rounded-md py-2 pl-9 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500" />
                    </div>
                </div>
            </div>

            {generationMode === 'daily' && getSpecificDay() && (
                 <DailyOverrideManager dailyOverrides={dailyOverrides} setDailyOverrides={setDailyOverrides} bartenders={bartenders} shifts={SHIFTS_TEMPLATE} specificDay={getSpecificDay()!} />
            )}

            <BartenderManager bartenders={bartenders} setBartenders={setBartenders} />
            <WeeklyAvailabilityManager bartenders={bartenders} setBartenders={setBartenders} />
            <FixedShiftManager fixedAssignments={fixedAssignments} setFixedAssignments={setFixedAssignments} bartenders={bartenders} shifts={SHIFTS_TEMPLATE} />
            <TimeOffRequestManager timeOffRequests={timeOffRequests} setTimeOffRequests={setTimeOffRequests} bartenders={bartenders} />
            <TargetShiftsManager targetShifts={targetShifts} setTargetShifts={setTargetShifts} />
            <EventShiftManager closedShifts={closedShifts} setClosedShifts={setClosedShifts} shifts={SHIFTS_TEMPLATE} />

            <div className="pt-4 border-t border-slate-700 space-y-3">
              <button
                onClick={handlePreviewFixed}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-slate-700 text-slate-100 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <EyeIcon className="h-5 w-5" />
                Preview Fixed Only
              </button>
              <button
                onClick={handleGenerateSchedule}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-slate-600 transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
              >
                {isLoading ? <span className="animate-pulse">{statusMsg || 'Working...'}</span> : <><CalendarIcon className="h-5 w-5" /> Generate Full Schedule</>}
              </button>
            </div>
          </aside>

          <section className="xl:col-span-3 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg min-h-[80vh]">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold text-white uppercase tracking-wide">{scheduleTitle}</h2>
              {schedule && schedule.length > 0 && (
                <button onClick={() => exportScheduleToHtml(schedule, scheduleTitle, bartenders, EARNINGS_MAP, effectiveStartDate)} className="flex items-center gap-2 bg-slate-700 text-slate-200 py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">
                  <DownloadIcon className="h-5 w-5" /> Export HTML
                </button>
              )}
            </div>
            
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">{error}</div>}
            
            <div className="space-y-8">
              {schedule && schedule.length > 0 ? (
                <>
                  <SummaryView schedule={schedule} bartenders={bartenders} earningsMap={EARNINGS_MAP} />
                  <FloorDistributionView schedule={schedule} bartenders={bartenders} />
                  <ScheduleView 
                    schedule={schedule} 
                    startDate={effectiveStartDate} 
                    onMoveAssignment={handleMoveAssignment}
                  />
                </>
              ) : (
                 !isLoading && (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                      <CalendarIcon className="h-12 w-12 mb-4 opacity-20"/>
                      <p className="text-lg font-medium">Ready to build your schedule.</p>
                      <p className="text-sm mt-1 max-w-sm">Use "Preview Fixed Only" to see your manual setup, or "Generate Full Schedule" to let the AI fill the blanks.</p>
                  </div>
                 )
              )}
              {isLoading && (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-slate-500">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-lg font-medium">{statusMsg || 'Generating schedule...'}</p>
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
