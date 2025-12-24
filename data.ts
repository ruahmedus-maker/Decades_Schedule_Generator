
import type { Bartender, Shift, FixedAssignment, DayOfWeek, EarningsMap } from './types';

export const BARTENDERS: Bartender[] = [
  { name: 'Allison', tier: 1, gender: 'Female', unavailableDays: [] },
  { name: 'Ashley', tier: 1, gender: 'Female', unavailableDays: ['Thu', 'Sun'] },
  { name: 'Ashlin', tier: 1, gender: 'Female', unavailableDays: [] },
  { name: 'Laura', tier: 1, gender: 'Female', unavailableDays: [] },
  { name: 'Mariana', tier: 1, gender: 'Female', unavailableDays: ['Thu', 'Fri', 'Sun', 'Sun_Night'] },
  { name: 'Natalie', tier: 2, gender: 'Female', unavailableDays: [] },
  { name: 'P', tier: 2, gender: 'Male', unavailableDays: [] },
  { name: 'Winter', tier: 2, gender: 'Male', unavailableDays: ['Thu'] },
  { name: 'Ashley C', tier: 2, gender: 'Female', unavailableDays: ['Sat', 'Sun'] },
  { name: 'Paris', tier: 2, gender: 'Female', unavailableDays: ['Sun'] },
  { name: 'Iyana', tier: 2, gender: 'Female', unavailableDays: ['Sun', 'Sun_Night'] },
  { name: 'Riaz', tier: 1, gender: 'Male', unavailableDays: ['Thu'] },
  { name: 'Kristian', tier: 1, gender: 'Male', unavailableDays: ['Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'] },
  { name: 'Jasmine', tier: 2, gender: 'Female', unavailableDays: ['Thu'] },
];

export const SHIFTS_TEMPLATE: Shift[] = [
  // Thursdays
  { floor: 'Hip Hop', bar: 'Main Bar', day: 'Thu', gender: null, bartendersNeeded: 2 },
  { floor: 'Hip Hop', bar: 'Back Bar', day: 'Thu', gender: null, bartendersNeeded: 1 },
  { floor: 'Rooftop', bar: 'Main Bar', day: 'Thu', gender: null, bartendersNeeded: 2 },
  // Fridays
  { floor: "2010's", bar: 'Main Bar', day: 'Fri', gender: null, bartendersNeeded: 2 },
  { floor: "2010's", bar: 'Back Bar', day: 'Fri', gender: null, bartendersNeeded: 1 },
  { floor: 'Hip Hop', bar: 'Main Bar', day: 'Fri', gender: null, bartendersNeeded: 2 },
  { floor: 'Hip Hop', bar: 'Back Bar', day: 'Fri', gender: null, bartendersNeeded: 1 },
  { floor: 'Rooftop', bar: 'Main Bar', day: 'Fri', gender: null, bartendersNeeded: 2 },
  // Saturdays
  { floor: "2000's", bar: 'Main Bar', day: 'Sat', gender: 'MF', bartendersNeeded: 2 },
  { floor: "2010's", bar: 'Main Bar', day: 'Sat', gender: 'MF', bartendersNeeded: 2 },
  { floor: "2010's", bar: 'Side Bar', day: 'Sat', gender: null, bartendersNeeded: 1 },
  { floor: "2010's", bar: 'Back Bar', day: 'Sat', gender: null, bartendersNeeded: 1 },
  { floor: 'Hip Hop', bar: 'Main Bar', day: 'Sat', gender: null, bartendersNeeded: 2 },
  { floor: 'Hip Hop', bar: 'Back Bar', day: 'Sat', gender: null, bartendersNeeded: 1 },
  { floor: 'Rooftop', bar: 'Main Bar', day: 'Sat', gender: null, bartendersNeeded: 2 },
  // Sundays
  { floor: 'Rooftop', bar: 'Main Bar', day: 'Sun', gender: null, bartendersNeeded: 1 },
  { floor: 'Rooftop', bar: 'Main Bar', day: 'Sun_Night', gender: null, bartendersNeeded: 2 },
];


export const FIXED_ASSIGNMENTS: FixedAssignment[] = [
  // This is a sample from your extensive list for demonstration.
  // The full list can be included for a complete generation.
  { week: 'Week_1', day: 'Thu', floor: 'Rooftop', bar: 'Main Bar', name: 'Allison' },
  { week: 'Week_1', day: 'Thu', floor: 'Rooftop', bar: 'Main Bar', name: 'Paris' },
  { week: 'Week_1', day: 'Fri', floor: 'Rooftop', bar: 'Main Bar', name: 'Riaz' },
  { week: 'Week_1', day: 'Sat', floor: 'Rooftop', bar: 'Main Bar', name: 'Mariana' },
  { week: 'Week_2', day: 'Thu', floor: 'Rooftop', bar: 'Main Bar', name: 'Laura' },
  { week: 'Week_2', day: 'Fri', floor: 'Rooftop', bar: 'Main Bar', name: 'Riaz' },
  { week: 'Week_2', day: 'Sat', floor: 'Rooftop', bar: 'Main Bar', name: 'Kristian' },
  { week: 'Week_3', day: 'Sat', floor: 'Hip Hop', bar: 'Main Bar', name: 'Kristian' },
  { week: 'Week_4', day: 'Sat', floor: 'Hip Hop', bar: 'Main Bar', name: 'Riaz' },
  { week: 'Week_3', day: 'Fri', floor: 'Hip Hop', bar: 'Main Bar', name: 'Riaz' }
];

export const EARNINGS_MAP: EarningsMap = {
    "2000's": { "Main Bar": { "Sat": 150 } },
    "2010's": {
      "Main Bar": { "Fri": 275, "Sat": 300 },
      "Side Bar": { "Sat": 175 },
      "Back Bar": { "Fri": 250, "Sat": 300 }
    },
    "Hip Hop": {
      "Main Bar": { "Thu": 125, "Fri": 400, "Sat": 500 },
      "Back Bar": { "Thu": 125, "Fri": 250, "Sat": 300 }
    },
    "Rooftop": {
      "Main Bar": { "Thu": 250, "Fri": 500, "Sat": 600, "Sun": 300, "Sun_Night": 400 }
    }
};
