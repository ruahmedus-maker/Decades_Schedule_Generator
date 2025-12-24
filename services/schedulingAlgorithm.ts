
import type { Schedule, Bartender, Shift, FixedAssignment, TargetShifts, TimeOffRequest, DayOfWeek, ClosedShift, ScheduledBartender, DailyOverride } from '../types';

const DAY_ORDER: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];

/**
 * Checks if a bartender is available for a specific shift, considering all constraints.
 */
function isBartenderAvailable(
  bartender: Bartender,
  week: number,
  day: DayOfWeek,
  timeOffMap: Set<string>,
  shiftsThisDay: Set<string> // Set of bartenders already scheduled on this day
): boolean {
  if (bartender.unavailableDays.includes(day)) return false;
  if (timeOffMap.has(`${bartender.name}-${week}-${day}`)) return false;
  if (shiftsThisDay.has(bartender.name)) return false;
  return true;
}

/**
 * Creates a fast-lookup Set for all time off requests.
 */
function createTimeOffMap(timeOffRequests: TimeOffRequest[]): Set<string> {
  const timeOffMap = new Set<string>();
  timeOffRequests.forEach(req => {
    const { name, startDate, endDate } = req;
    let currentWeek = startDate.week;
    let currentDayIndex = DAY_ORDER.indexOf(startDate.day);
    const endDayIndex = DAY_ORDER.indexOf(endDate.day);

    let safety = 0;
    while (safety < 100) {
      safety++;
      const currentDay = DAY_ORDER[currentDayIndex];
      timeOffMap.add(`${name}-${currentWeek}-${currentDay}`);
      if (currentWeek === endDate.week && currentDayIndex === endDayIndex) break;
      currentDayIndex++;
      if (currentDayIndex >= DAY_ORDER.length) {
        currentDayIndex = 0;
        currentWeek++;
      }
    }
  });
  return timeOffMap;
}

/**
 * Generates a schedule structure with ONLY manual assignments filled.
 */
export function generateFixedOnlySchedule(
    shiftsTemplate: Shift[],
    fixedAssignments: FixedAssignment[],
    closedShifts: ClosedShift[],
    weeksToGenerate: number = 4,
    specificDay?: DayOfWeek,
    dailyOverrides: DailyOverride[] = []
): Schedule {
  const schedule: Schedule = [];
  const closedShiftsSet = new Set(closedShifts.map(cs => `${cs.week}-${cs.day}-${cs.floor}-${cs.bar}`));

  // 1. Setup blank structure
  for (let week = 1; week <= weeksToGenerate; week++) {
    const weekString = `Week_${week}` as const;
    shiftsTemplate.forEach(shift => {
      if (specificDay && shift.day !== specificDay && !(specificDay === 'Sun' && shift.day === 'Sun_Night')) return;
      
      const shiftIdentifier = `${weekString}-${shift.day}-${shift.floor}-${shift.bar}`;
      if (!closedShiftsSet.has(shiftIdentifier)) {
          schedule.push({
            week,
            day: shift.day,
            floor: shift.floor,
            bar: shift.bar,
            bartenders: [],
          });
      }
    });
  }

  // 2. Apply Overrides (Daily)
  if (specificDay) {
    dailyOverrides.forEach(d => {
      const shift = schedule.find(s => s.week === 1 && s.day === d.day && s.floor === d.floor && s.bar === d.bar);
      if (shift && !shift.bartenders.some(b => b.name === d.name)) {
        shift.bartenders.push({ name: d.name, role: 'Fixed' });
      }
    });
  }

  // 3. Apply Fixed Assignments
  fixedAssignments.forEach(fa => {
    const weekNum = parseInt(fa.week.split('_')[1]);
    if (weekNum > weeksToGenerate) return;
    if (specificDay && fa.day !== specificDay && !(specificDay === 'Sun' && fa.day === 'Sun_Night')) return;

    const shift = schedule.find(s => s.week === weekNum && s.day === fa.day && s.floor === fa.floor && s.bar === fa.bar);
    if (shift && !shift.bartenders.some(b => b.name === fa.name)) {
      shift.bartenders.push({ name: fa.name, role: 'Fixed' });
    }
  });

  return schedule.sort((a,b) => {
    if (a.week !== b.week) return a.week - b.week;
    const dayIndexA = DAY_ORDER.indexOf(a.day);
    const dayIndexB = DAY_ORDER.indexOf(b.day);
    if(dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;
    return a.floor.localeCompare(b.floor);
  });
}

/**
 * The main function to generate a schedule using a deterministic algorithm.
 */
export function generateSchedule(
    bartenders: Bartender[], 
    shiftsTemplate: Shift[],
    fixedAssignments: FixedAssignment[],
    targetShifts: TargetShifts,
    timeOffRequests: TimeOffRequest[],
    closedShifts: ClosedShift[],
    weeksToGenerate: number = 4,
    specificDay?: DayOfWeek,
    dailyOverrides: DailyOverride[] = []
): Schedule {
  const schedule: Schedule = [];
  const shiftCounts: Record<string, number> = bartenders.reduce((acc, b) => ({ ...acc, [b.name]: 0 }), {});
  const timeOffMap = createTimeOffMap(timeOffRequests);
  const closedShiftsSet = new Set(closedShifts.map(cs => `${cs.week}-${cs.day}-${cs.floor}-${cs.bar}`));
  const saturday2000sWorkers = new Set<string>();

  // Initialize Structure
  for (let week = 1; week <= weeksToGenerate; week++) {
    const weekString = `Week_${week}` as const;
    shiftsTemplate.forEach(shift => {
      if (specificDay && shift.day !== specificDay && !(specificDay === 'Sun' && shift.day === 'Sun_Night')) return;
      const shiftIdentifier = `${weekString}-${shift.day}-${shift.floor}-${shift.bar}`;
      if (!closedShiftsSet.has(shiftIdentifier)) {
          schedule.push({
            week,
            day: shift.day,
            floor: shift.floor,
            bar: shift.bar,
            bartenders: [],
          });
      }
    });
  }

  // Apply Fixed/Overrides first
  const activeFixedAssignments: (FixedAssignment | DailyOverride)[] = [];
  const overrideKeys = new Set<string>();

  if (specificDay && dailyOverrides.length > 0) {
      dailyOverrides.forEach(d => {
          overrideKeys.add(`${d.floor}-${d.bar}-${d.day}`);
          activeFixedAssignments.push(d);
      });
  }

  fixedAssignments.forEach(fa => {
      if (specificDay) {
        if (fa.day !== specificDay && !(specificDay === 'Sun' && fa.day === 'Sun_Night')) return;
        if (overrideKeys.has(`${fa.floor}-${fa.bar}-${fa.day}`)) return;
      }
      activeFixedAssignments.push(fa);
  });

  for (const assignment of activeFixedAssignments) {
    const weekNum = 'week' in assignment ? parseInt(assignment.week.split('_')[1]) : 1;
    if (weekNum > weeksToGenerate) continue;

    const shift = schedule.find(s => s.week === weekNum && s.day === assignment.day && s.floor === assignment.floor && s.bar === assignment.bar);
    if (shift && !shift.bartenders.some(b => b.name === assignment.name)) {
        shift.bartenders.push({ name: assignment.name, role: 'Fixed' });
        if(shiftCounts[assignment.name] !== undefined) shiftCounts[assignment.name]++;
        if (assignment.day === 'Sat' && assignment.floor === "2000's") saturday2000sWorkers.add(assignment.name);
    }
  }
  
  // Fill remaining slots
  for (let week = 1; week <= weeksToGenerate; week++) {
    const shiftsForWeek = schedule.filter(s => s.week === week).sort((a,b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
    const dayProcessed = new Set<DayOfWeek>();

    shiftsForWeek.forEach(shift => {
      const day = shift.day;
      const scheduledThisDay = new Set<string>();
      schedule.filter(s => s.week === week && s.day === day).forEach(s => s.bartenders.forEach(b => scheduledThisDay.add(b.name)));
      
      const shiftInfo = shiftsTemplate.find(t => t.day === shift.day && t.floor === shift.floor && t.bar === shift.bar);
      const bartendersNeeded = shiftInfo ? shiftInfo.bartendersNeeded : shift.bartenders.length;
      const neededCount = bartendersNeeded - shift.bartenders.length;
      if (neededCount <= 0) return;

      let availableCandidates = bartenders.filter(b => isBartenderAvailable(b, week, day, timeOffMap, scheduledThisDay));
      if (day === 'Sat' && shift.floor === "2000's") availableCandidates = availableCandidates.filter(c => !saturday2000sWorkers.has(c.name));

      availableCandidates.sort((a, b) => {
          const needA = (targetShifts[a.name] || 0) - (shiftCounts[a.name] || 0);
          const needB = (targetShifts[b.name] || 0) - (shiftCounts[b.name] || 0);
          if (needA !== needB) return needB - needA;
          return Math.random() - 0.5;
      });

      const genderConstraint = shiftInfo?.gender;
      const toAssign: Bartender[] = [];

      if (genderConstraint === 'MF') {
          const maleCandidates = availableCandidates.filter(c => c.gender === 'Male');
          const femaleCandidates = availableCandidates.filter(c => c.gender === 'Female');
          if (maleCandidates.length > 0) toAssign.push(maleCandidates[0]);
          if (femaleCandidates.length > 0) toAssign.push(femaleCandidates[0]);
          while(toAssign.length < neededCount) {
             const next = availableCandidates.find(c => !toAssign.includes(c));
             if (next) toAssign.push(next); else break;
          }
      } else {
          toAssign.push(...availableCandidates.slice(0, neededCount));
      }
      
      toAssign.forEach(bartender => {
          shift.bartenders.push({ name: bartender.name, role: null });
          shiftCounts[bartender.name]++;
          scheduledThisDay.add(bartender.name);
          if (day === 'Sat' && shift.floor === "2000's") saturday2000sWorkers.add(bartender.name);
      });
    });
  }

  // Final role assignment
  schedule.forEach(shift => {
    const nonFixed = shift.bartenders.filter(b => b.role !== 'Fixed');
    if (shift.bartenders.length > 1) {
      const currentPoint = shift.bartenders.find(b => b.role === 'Point');
      const currentFixed = shift.bartenders.find(b => b.role === 'Fixed');
      if (!currentPoint && !currentFixed) {
          shift.bartenders[0].role = 'Point';
      }
    }
  });

  return schedule.sort((a,b) => {
    if (a.week !== b.week) return a.week - b.week;
    const dayIndexA = DAY_ORDER.indexOf(a.day);
    const dayIndexB = DAY_ORDER.indexOf(b.day);
    if(dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;
    return a.floor.localeCompare(b.floor);
  });
}
