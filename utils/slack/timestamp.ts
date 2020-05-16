export const dateToSlackTS = (date: Date): string =>
    (date.getTime() / 1000).toFixed(3);

export const slackTSToDate = (ts: string): Date =>
    new Date(Number(ts) * 1000);
