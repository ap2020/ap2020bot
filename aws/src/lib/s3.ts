import AWS from 'aws-sdk';

// TODO: devはどうすんだ
export const s3 = process.env.STAGE === 'prod' ?
  new AWS.S3() :
  new AWS.S3({
    s3ForcePathStyle: true,
    accessKeyId: 'S3RVER',
    secretAccessKey: 'S3RVER',
    endpoint: 'http://localhost:3002',
  });

export const bucketShortnames = ['default'] as const;
export type BucketShortname = typeof bucketShortnames[number];

export const getBucketName = (shortname: BucketShortname): string =>
  `ap2020bot-${process.env.STAGE}-${shortname}`;
