const basicColors = {
  red: 'eo1f1f',
  yellow: 'fddb1c',
  green: '16c72d',
  paleBlue: '13aff1',
};

const colors = {
  ...basicColors,
  danger: basicColors.red,
  warning: basicColors.yellow,
  success: basicColors.green,
  information: basicColors.paleBlue,
  delete: basicColors.red,
  add: basicColors.green,
};

type ColorName = keyof typeof colors;

export const getColor = (name: ColorName, options: { hashed: boolean }): string =>
  `${options.hashed ? '#' : ''}${colors[name]}`;
