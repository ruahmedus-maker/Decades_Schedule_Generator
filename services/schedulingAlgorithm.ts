
import type { Schedule, Bartender, Shift, FixedAssignment, TargetShifts, TimeOffRequest, DayOfWeek, ClosedShift, ScheduledBartender } from '../types';

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
    closedShifts: ClosedShift[]
): Schedule {
  
  // 1. INITIALIZATION
  const schedule: Schedule = [];
  const shiftCounts: Record<string, number> = bartenders.reduce((acc, b) => ({ ...acc, [b.name]: 0 }), {});
  const timeOffMap = createTimeOffMap(timeOffRequests);
  const closedShiftsSet = new Set(closedShifts.map(cs => `${cs.week}-${cs.day}-${cs.floor}-${cs.bar}`));
  const saturday2000sWorkers = new Set<string>();


  // 2. CREATE EMPTY SCHEDULE STRUCTURE based on template, excluding closed shifts
  for (let week = 1; week <= 4; week++) {
    const weekString = `Week_${week}` as const;
    shiftsTemplate.forEach(shift => {
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

  // 3. VALIDATE AND PLACE FIXED ASSIGNMENTS (HIGHEST PRIORITY)
  const dailyFixedAssignments = new Set<string>(); // key: `${name}-${week}-${day}`
  
  for (const assignment of fixedAssignments) {
    const weekNum = parseInt(assignment.week.split('_')[1]);
    const assignmentKey = `${assignment.name}-${weekNum}-${assignment.day}`;
    
    // Check for double booking within the provided fixed assignments.
    if (dailyFixedAssignments.has(assignmentKey)) {
        throw new Error(`Conflicting fixed assignment: ${assignment.name} is assigned to more than one shift on Week ${weekNum}, ${assignment.day}. Please correct the fixed shifts.`);
    }
    dailyFixedAssignments.add(assignmentKey);

    let shift = schedule.find(s => 
        s.week === weekNum && 
        s.day === assignment.day &&
        s.floor === assignment.floor &&
        s.bar === assignment.bar
    );
    // If it's a special event not in the template, add it to the schedule structure.
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
        // Track for Saturday 2000's rotation rule
        if (assignment.day === 'Sat' && assignment.floor === "2000's") {
          saturday2000sWorkers.add(assignment.name);
        }
    }
  }
  
  // 4. FILL REMAINING SHIFTS
  for (let week = 1; week <= 4; week++) {
    const daysForWeek = [...new Set(shiftsTemplate.map(s => s.day))].sort((a,b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

    for (const day of daysForWeek) {
      // Find out who is already working today due to fixed assignments. This is the key to preventing double booking.
      const scheduledThisDay = new Set<string>();
      schedule
        .filter(s => s.week === week && s.day === day)
        .forEach(s => s.bartenders.forEach(b => scheduledThisDay.add(b.name)));
      
      const shiftsForDay = schedule.filter(s => s.week === week && s.day === day);

      for (const shift of shiftsForDay) {
        const shiftInfo = shiftsTemplate.find(t => t.day === shift.day && t.floor === shift.floor && t.bar === shift.bar);
        if (!shiftInfo) continue; // This is a special event shift, already handled by fixed assignments.

        const neededCount = shiftInfo.bartendersNeeded - shift.bartenders.length;
        if (neededCount <= 0) continue;

        // Find all available candidates for this specific shift.
        let availableCandidates = bartenders.filter(b => 
            isBartenderAvailable(b, week, day, timeOffMap, scheduledThisDay)
        );
        
        // Apply the Saturday 2000's floor rotation rule
        if (day === 'Sat' && shift.floor === "2000's") {
          availableCandidates = availableCandidates.filter(c => !saturday2000sWorkers.has(c.name));
        }

        // Sort candidates by who needs shifts the most to meet their target.
        availableCandidates.sort((a, b) => {
            const needA = (targetShifts[a.name] || 0) - (shiftCounts[a.name] || 0);
            const needB = (targetShifts[b.name] || 0) - (shiftCounts[b.name] || 0);
            if (needA !== needB) return needB - needA; // Higher need comes first
            return Math.random() - 0.5; // Randomize for fairness if need is equal
        });

        const toAssign: Bartender[] = [];

        if (shiftInfo.gender === 'MF') {
          // Handle gender constraint
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
          // Fill remaining slots
          const remainingCandidates = [...maleCandidates, ...femaleCandidates].sort((a,b) => availableCandidates.indexOf(a) - availableCandidates.indexOf(b));
          while(toAssign.length < neededCount && remainingCandidates.length > 0) {
            toAssign.push(remainingCandidates.shift()!);
          }

        } else {
          // No gender constraint, just take the highest priority candidates.
          toAssign.push(...availableCandidates.slice(0, neededCount));
        }
        
        // Assign the chosen bartenders and update their counts for subsequent calculations.
        for (const bartender of toAssign) {
          if (bartender) {
            shift.bartenders.push({ name: bartender.name, role: null });
            shiftCounts[bartender.name]++;
            scheduledThisDay.add(bartender.name);

            // Add assigned bartender to the rotation set for this month
            if (day === 'Sat' && shift.floor === "2000's") {
              saturday2000sWorkers.add(bartender.name);
            }
          }
        }
      }
    }
  }

  // 5. POST-PROCESSING: Assign 'Point' Role
  // Rule: "one position per bar that requires more than one bartender should in the point position"
  // We assign 'Point' to the first bartender listed in any shift with > 1 bartender.
  schedule.forEach(shift => {
    if (shift.bartenders.length > 1) {
      // Since fixed assignments are added first, they naturally take the Point position if present.
      shift.bartenders[0].role = 'Point';
    }
  });

  // Sort final schedule for consistent display
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
