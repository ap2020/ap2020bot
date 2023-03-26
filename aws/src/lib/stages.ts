import * as envalid from 'envalid';
import { safecast } from './utils';

const stages = ['prod', 'dev', 'local', 'test'] as const;
type Stage = typeof stages[number];

const realStages = ['prod', 'dev'] as const;
type RealStage = typeof realStages[number];

export const isReal = (stage: Stage): stage is RealStage =>
  safecast<readonly string[]>(realStages).includes(stage);

const env = envalid.cleanEnv(
  process.env,
  {
    /* eslint-disable @typescript-eslint/naming-convention */
    STAGE: envalid.str({ choices: stages }),
    /* eslint-enable @typescript-eslint/naming-convention */
  },
);

export const stage: Stage = env.STAGE;
