// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const proveUnreachable: (proof: never) => never = (_proof) => {
  throw new Error('Reached code marked unreachable.');
};

export const safecast = <After>(value: After): After => value;
