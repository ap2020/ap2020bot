import { max } from "lodash";

export const dayNumbers = [0, 1, 2, 3, 4, 5, 6] as const;
export type DayNumber = typeof dayNumbers[number];
export const dayNumberToString: {[key in DayNumber]: string} = ['月', '火', '水', '木', '金', '土', '日'];

// asserting is ok because periodNumber is a non-empty const array 
const maxDayNumber: number = max(dayNumbers)!;

export const dayNames = ['月', '火', '水', '木', '金', '土', '日'];
export type DayName = typeof dayNames[number];
export const dayNameToNumber: {[key in DayName]: DayNumber} = {
    '月': 0,
    '火': 1,
    '水': 2,
    '木': 3,
    '金': 4,
    '土': 5,
    '日': 6
};


export class Day {
    constructor(
        public readonly dayNumber: DayNumber,
    ) {}

    valueOf() {
        return this.dayNumber;
    }

    toString() {
        return dayNumberToString[this.dayNumber];
    }
}

type YougenBase = {
    kind: string;
    valueOf(): number;
    toString(): string;
}

export const periodNumbers = [1, 2, 3, 4, 5, 6] as const;
export type PeriodNumber = typeof periodNumbers[number];

// asserting is ok because periodNumber is a non-empty const array 
const maxPeriodNumber: number = max(periodNumbers)!;

class NormalYougen implements YougenBase {
    // 曜限
    kind = 'normal'
    public readonly day: Day;
    public readonly period: PeriodNumber;

    constructor(args: {
        day: Day;
        period: PeriodNumber;
    }){
        this.day = args.day;
        this.period = args.period;
    }

    valueOf() {
        return this.day.dayNumber * maxPeriodNumber + this.period;
    }

    toString() {
        return `${this.day.toString()}${this.period}`;
    }
}

class IntensiveYougen implements YougenBase {
    kind = 'intensive'

    valueOf() {
        return maxPeriodNumber * (maxDayNumber + 1);
    }

    toString() {
        return '集中';
    }
}

export type Yougen = NormalYougen | IntensiveYougen;
