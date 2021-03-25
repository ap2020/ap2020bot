module.exports.buckets = async ({ resolveConfigurationProperty }) => {
  const config = await resolveConfigurationProperty(['custom', 's3Config', 'bucketName']);
  const fullnames = [
    ...Object.values(config),
    'ap2020bot-${self:custom.stage}-serverlessdeploymentbucket-*',
  ];
  const arns = fullnames.map(bucket => `arn:aws:s3:::${bucket}`);
  return {
    fullnames,
    arns,
  }
};
