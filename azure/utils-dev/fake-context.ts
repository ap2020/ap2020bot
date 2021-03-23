import type { Context } from '@azure/functions';

export const context: Context = {
  log: console.log,
} as any;
