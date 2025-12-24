
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
  // 1. Check recurring weekly unavailability
  if (bartender.unavailableDays.includes(day)) {
    return false;
  }
  // 2. Check specific time off requests (vacations)
  if (timeOffMap.has(`${bartender.name}-${week}-${day}`)) {
    return false;
  }
  // 3. Check if already working another shift on the same day
  if (shiftsThisDay.has(bartender.name)) {
    return false;
  }
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

    let safety = 0; // Prevent infinite loops
    while (safety < 100) {
      safety++;
      const currentDay = DAY_ORDER[currentDayIndex];
      timeOffMap.add(`${name}-${currentWeek}-${currentDay}`);

      // Check for exit condition
      if (currentWeek === endDate.week && currentDayIndex === endDayIndex) {
        break;
      }

      // Increment day/week
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
  
  // 1. INITIALIZATION
  const schedule: Schedule = [];
  const shiftCounts: Record<string, number> = bartenders.reduce((acc, b) => ({ ...acc, [b.name]: 0 }), {});
  const timeOffMap = createTimeOffMap(timeOffRequests);
  const closedShiftsSet = new Set(closedShifts.map(cs => `${cs.week}-${cs.day}-${cs.floor}-${cs.bar}`));
  const saturday2000sWorkers = new Set<string>();


  // 2. CREATE EMPTY SCHEDULE STRUCTURE based on template, excluding closed shifts
  for (let week = 1; week <= weeksToGenerate; week++) {
    const weekString = `Week_${week}` as const;
    shiftsTemplate.forEach(shift => {
      // If specificDay is set, skip shifts that don't match.
      // Special case: If specificDay is 'Sun', allow 'Sun_Night' as well.
      if (specificDay) {
        if (shift.day !== specificDay && !(specificDay === 'Sun' && shift.day === 'Sun_Night')) {
            return;
        }
      }

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

  // 3. HANDLE FIXED ASSIGNMENTS AND OVERRIDES
  const activeFixedAssignments: FixedAssignment[] = [];
  const overrideKeys = new Set<string>(); // Keys: "Floor-Bar-Day" to check for overrides

  if (specificDay && dailyOverrides.length > 0) {
      dailyOverrides.forEach(d => {
          // Use the specific day from the override (handles Sun vs Sun_Night)
          overrideKeys.add(`${d.floor}-${d.bar}-${d.day}`);
          
          activeFixedAssignments.push({
              week: 'Week_1',
              day: d.day,
              floor: d.floor,
              bar: d.bar,
              name: d.name
          });
      });
  }

  // Add global fixed assignments, skipping if overridden
  fixedAssignments.forEach(fa => {
      if (specificDay) {
        if (fa.day !== specificDay && !(specificDay === 'Sun' && fa.day === 'Sun_Night')) return;
        if (overrideKeys.has(`${fa.floor}-${fa.bar}-${fa.day}`)) return;
      }
      activeFixedAssignments.push(fa);
  });

  const dailyFixedAssignmentsMap = new Set<string>(); // key: `${name}-${week}-${day}`
  
  for (const assignment of activeFixedAssignments) {
    const weekNum = parseInt(assignment.week.split('_')[1]);
    if (weekNum > weeksToGenerate) continue;

    const assignmentKey = `${assignment.name}-${weekNum}-${assignment.day}`;
    dailyFixedAssignmentsMap.add(assignmentKey);

    let shift = schedule.find(s => 
        s.week === weekNum && 
        s.day === assignment.day &&
        s.floor === assignment.floor &&
        s.bar === assignment.bar
    );
    
    if (!shift) {
        shift = {
            week: weekNum,
            day: assignment.day,
            floor: assignment.floor,
            bar: assignment.bar,
            bartenders: []
        };
        schedule.push(shift);
    }
    
    if (!shift.bartenders.some(b => b.name === assignment.name)) {
        shift.bartenders.push({ name: assignment.name, role: null });
        if(shiftCounts[assignment.name] !== undefined) {
          shiftCounts[assignment.name]++;
        }
        if (assignment.day === 'Sat' && assignment.floor === "2000's") {
          saturday2000sWorkers.add(assignment.name);
        }
    }
  }
  
  // 4. FILL REMAINING SHIFTS
  for (let week = 1; week <= weeksToGenerate; week++) {
    const daysInSchedule = [...new Set(schedule.filter(s => s.week === week).map(s => s.day))];
    const daysForWeek = daysInSchedule.sort((a,b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

    for (const day of daysForWeek) {
      const scheduledThisDay = new Set<string>();
      schedule
        .filter(s => s.week === week && s.day === day)
        .forEach(s => s.bartenders.forEach(b => scheduledThisDay.add(b.name)));
      
      const shiftsForDay = schedule.filter(s => s.week === week && s.day === day);

      for (const shift of shiftsForDay) {
        const shiftInfo = shiftsTemplate.find(t => t.day === shift.day && t.floor === shift.floor && t.bar === shift.bar);
        
        let bartendersNeeded = 0;
        let genderConstraint: 'MF' | null = null;

        if (shiftInfo) {
            bartendersNeeded = shiftInfo.bartendersNeeded;
            genderConstraint = shiftInfo.gender;
        } else {
            bartendersNeeded = shift.bartenders.length; 
        }

        const neededCount = bartendersNeeded - shift.bartenders.length;
        if (neededCount <= 0) continue;

        let availableCandidates = bartenders.filter(b => 
            isBartenderAvailable(b, week, day, timeOffMap, scheduledThisDay)
        );
        
        if (day === 'Sat' && shift.floor === "2000's") {
          availableCandidates = availableCandidates.filter(c => !saturday2000sWorkers.has(c.name));
        }

        availableCandidates.sort((a, b) => {
            const needA = (targetShifts[a.name] || 0) - (shiftCounts[a.name] || 0);
            const needB = (targetShifts[b.name] || 0) - (shiftCounts[b.name] || 0);
            if (needA !== needB) return needB - needA;
            return Math.random() - 0.5;
        });

        const toAssign: Bartender[] = [];

        if (genderConstraint === 'MF') {
          const currentGenders = new Set(shift.bartenders.map(b => {
            const bartender = bartenders.find(findB => findB.name === b.name);
            return bartender?.gender;
          }));
          const needsMale = !currentGenders.has('Male');
          const needsFemale = !currentGenders.has('Female');
          
          const maleCandidates = availableCandidates.filter(c => c.gender === 'Male');
          const femaleCandidates = availableCandidates.filter(c => c.gender === 'Female');
          
          if (needsMale && maleCandidates.length > 0) {
            toAssign.push(maleCandidates.shift()!);
          }
          if (needsFemale && femaleCandidates.length > 0) {
            toAssign.push(femaleCandidates.shift()!);
          }
          const remainingCandidates = [...maleCandidates, ...femaleCandidates].sort((a,b) => availableCandidates.indexOf(a) - availableCandidates.indexOf(b));
          while(toAssign.length < neededCount && remainingCandidates.length > 0) {
            toAssign.push(remainingCandidates.shift()!);
          }

        } else {
          toAssign.push(...availableCandidates.slice(0, neededCount));
        }
        
        for (const bartender of toAssign) {
          if (bartender) {
            shift.bartenders.push({ name: bartender.name, role: null });
            shiftCounts[bartender.name]++;
            scheduledThisDay.add(bartender.name);

            if (day === 'Sat' && shift.floor === "2000's") {
              saturday2000sWorkers.add(bartender.name);
            }
          }
        }
      }
    }
  }

  // 5. POST-PROCESSING: Assign 'Point' Role
  schedule.forEach(shift => {
    if (shift.bartenders.length > 1) {
      if (!shift.bartenders[0].role) {
          shift.bartenders[0].role = 'Point';
      }
    }
  });

  schedule.sort((a,b) => {
    if (a.week !== b.week) return a.week - b.week;
    const dayIndexA = DAY_ORDER.indexOf(a.day);
    const dayIndexB = DAY_ORDER.indexOf(b.day);
    if(dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;
    if(a.floor !== b.floor) return a.floor.localeCompare(b.floor);
    return a.bar.localeCompare(b.bar);
  });

  return schedule;
}
