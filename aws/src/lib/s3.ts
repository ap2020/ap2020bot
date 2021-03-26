import AWS from 'aws-sdk';
import { isReal, stage } from './stages';

export const s3 = isReal(stage) ?
  new AWS.S3() :
  new AWS.S3({
    s3ForcePathStyle: true,
    accessKeyId: 'S3RVER',
    secretAccessKey: 'S3RVER',
    endpoint: 'http://localhost:3003',
  });

export const bucketShortnames = ['default'] as const;
export type BucketShortname = typeof bucketShortnames[number];

export const getBucketName = (shortname: BucketShortname): string =>
  `ap2020bot-${stage}-${shortname}`;
