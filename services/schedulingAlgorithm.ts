
import type { Schedule, Bartender, Shift, FixedAssignment, TargetShifts, TimeOffRequest, DayOfWeek, ClosedShift, ScheduledBartender, DailyOverride } from '../types';

const DAY_ORDER: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];

/**
 * Calculates a date string for a specific week and day relative to a start date.
 */
function getShiftDate(baseDateStr: string, week: number, day: DayOfWeek): string {
  const date = new Date(baseDateStr + 'T00:00:00');
  const dayIndex = DAY_ORDER.indexOf(day);
  const offset = dayIndex === 7 ? 6 : dayIndex; // Sun and Sun_Night use same day offset
  date.setDate(date.getDate() + offset + ((week - 1) * 7));
  return date.toISOString().split('T')[0];
}

/**
 * Checks if a bartender is available for a specific shift, considering all constraints.
 */
function isBartenderAvailable(
  bartender: Bartender,
  shiftDate: string,
  day: DayOfWeek,
  timeOffMap: Set<string>,
  shiftsThisDay: Set<string> // Set of bartenders already scheduled on this day
): boolean {
  if (bartender.unavailableDays.includes(day)) return false;
  if (timeOffMap.has(`${bartender.name}-${shiftDate}`)) return false;
  if (shiftsThisDay.has(bartender.name)) return false;
  return true;
}

/**
 * Creates a fast-lookup Set for all time off requests based on calendar dates.
 */
function createTimeOffMap(timeOffRequests: TimeOffRequest[]): Set<string> {
  const timeOffMap = new Set<string>();
  timeOffRequests.forEach(req => {
    const start = new Date(req.startDate + 'T00:00:00');
    const end = new Date(req.endDate + 'T00:00:00');
    
    let current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      timeOffMap.add(`${req.name}-${dateStr}`);
      current.setDate(current.getDate() + 1);
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
    weeksToGenerate: number = 5,
    specificDay?: DayOfWeek,
    dailyOverrides: DailyOverride[] = []
): Schedule {
  const schedule: Schedule = [];
  const closedShiftsSet = new Set(closedShifts.map(cs => `${cs.week}-${cs.day}-${cs.floor.trim()}-${cs.bar.trim()}`));

  // 1. Setup blank structure from template
  for (let week = 1; week <= weeksToGenerate; week++) {
    const weekString = `Week_${week}` as const;
    shiftsTemplate.forEach(shift => {
      if (specificDay && shift.day !== specificDay && !(specificDay === 'Sun' && shift.day === 'Sun_Night')) return;
      
      const shiftIdentifier = `${weekString}-${shift.day}-${shift.floor.trim()}-${shift.bar.trim()}`;
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
      const shift = schedule.find(s => s.week === 1 && s.day === d.day && s.floor.trim() === d.floor.trim() && s.bar.trim() === d.bar.trim());
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

    let shift = schedule.find(s => s.week === weekNum && s.day === fa.day && s.floor.trim() === fa.floor.trim() && s.bar.trim() === fa.bar.trim());
    
    // BUG FIX: If the manual assignment is for a shift NOT in the template, create it anyway
    if (!shift) {
        shift = {
            week: weekNum,
            day: fa.day,
            floor: fa.floor,
            bar: fa.bar,
            bartenders: []
        };
        schedule.push(shift);
    }

    if (!shift.bartenders.some(b => b.name === fa.name)) {
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
    weeksToGenerate: number = 5,
    specificDay?: DayOfWeek,
    dailyOverrides: DailyOverride[] = [],
    calendarStartDate: string = '' // YYYY-MM-DD
): Schedule {
  // Use the robust structure builder
  const schedule = generateFixedOnlySchedule(shiftsTemplate, fixedAssignments, closedShifts, weeksToGenerate, specificDay, dailyOverrides);
  
  const shiftCounts: Record<string, number> = bartenders.reduce((acc, b) => ({ ...acc, [b.name]: 0 }), {});
  // Pre-fill shift counts from fixed assignments
  schedule.forEach(s => s.bartenders.forEach(b => { if(shiftCounts[b.name] !== undefined) shiftCounts[b.name]++; }));

  const timeOffMap = createTimeOffMap(timeOffRequests);
  const saturday2000sWorkers = new Set<string>();
  
  // Identify Sat 2000s workers from fixed assignments
  schedule.filter(s => s.day === 'Sat' && s.floor === "2000's").forEach(s => s.bartenders.forEach(b => saturday2000sWorkers.add(b.name)));

  // Fill remaining slots
  for (let week = 1; week <= weeksToGenerate; week++) {
    const shiftsForWeek = schedule.filter(s => s.week === week).sort((a,b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

    shiftsForWeek.forEach(shift => {
      const day = shift.day;
      const shiftDate = getShiftDate(calendarStartDate, week, day);
      
      const scheduledThisDay = new Set<string>();
      schedule.filter(s => s.week === week && s.day === day).forEach(s => s.bartenders.forEach(b => scheduledThisDay.add(b.name)));
      
      const shiftInfo = shiftsTemplate.find(t => t.day === shift.day && t.floor.trim() === shift.floor.trim() && t.bar.trim() === shift.bar.trim());
      const bartendersNeeded = shiftInfo ? shiftInfo.bartendersNeeded : 1;
      const neededCount = bartendersNeeded - shift.bartenders.length;
      if (neededCount <= 0) return;

      let availableCandidates = bartenders.filter(b => isBartenderAvailable(b, shiftDate, day, timeOffMap, scheduledThisDay));
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
    if (shift.bartenders.length > 1) {
      const hasDefinedRole = shift.bartenders.some(b => b.role === 'Point' || b.role === 'Fixed');
      if (!hasDefinedRole) {
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
