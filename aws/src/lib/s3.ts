import { S3 } from '@aws-sdk/client-s3';
import { isReal, stage } from './stages';

export const s3 = isReal(stage) ?
  new S3({}) :
  new S3({
    forcePathStyle: true,
    credentials: {
      accessKeyId: 'S3RVER',
      secretAccessKey: 'S3RVER',
    },
    endpoint: 'http://localhost:3003',
  });

export const bucketShortnames = ['default'] as const;
export type BucketShortname = typeof bucketShortnames[number];

export const getBucketName = (shortname: BucketShortname): string =>
  `ap2020bot-${stage}-${shortname}`;
