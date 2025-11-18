
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | 'Sun_Night';

export interface Bartender {
  name: string;
  tier: number;
  gender: 'Male' | 'Female';
  unavailableDays: DayOfWeek[];
}

export interface Shift {
  floor: string;
  bar: string;
  day: 'Thu' | 'Fri' | 'Sat' | 'Sun' | 'Sun_Night'; // Regular shifts are still on operating days
  gender: 'MF' | null;
  bartendersNeeded: number;
}

export interface FixedAssignment {
    week: `Week_${1|2|3|4}`;
    day: DayOfWeek;
    floor: string;
    bar: string;
    name: string;
}

export interface ClosedShift {
  id: string;
  week: `Week_${1|2|3|4}`;
  day: DayOfWeek;
  floor: string;
  bar: string;
}

export interface ScheduledBartender {
  name: string;
  role?: string | null;
}

export interface ScheduleEntry {
  week: number;
  day: DayOfWeek;
  floor: string;
  bar: string;
  bartenders: ScheduledBartender[];
}

export type Schedule = ScheduleEntry[];

export type TargetShifts = Record<string, number>;

export interface TimeOffDate {
  week: number;
  day: DayOfWeek;
}

export interface TimeOffRequest {
  id: string;
  name: string;
  startDate: TimeOffDate;
  endDate: TimeOffDate;
}

export type EarningsMap = {
  [floor: string]: {
    [bar: string]: {
      [day: string]: number;
    };
  };
};

export interface SummaryData {
    name: string;
    shiftCount: number;
    totalEarnings: number;
    averageEarnings: number;
}
