const sizeUnits = ['b', 'kb', 'mb'];
type SizeUnit = typeof sizeUnits[number];

export class Size {
  magnitude: bigint;
  unit: SizeUnit;

  constructor(
    magnitude: number | bigint,
    unit: SizeUnit,
  ) {
    this.magnitude = BigInt(magnitude);
    this.unit = unit;
  }

  get bytes(): bigint {
    const index = sizeUnits.indexOf(this.unit);
    return this.magnitude * (BigInt(1000) ** BigInt(index));
  }
}

export const validateSize = (buf: Buffer, size: Size): boolean =>
  buf.length <= size.bytes;
