export const proveUnreachable: (proof: never) => never = (_proof) => {
  throw new Error('Reached code marked unreachable.');
};
