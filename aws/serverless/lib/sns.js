const topics = async ({ resolveConfigurationProperty }) => await resolveConfigurationProperty(['custom', 'sns', 'topicName']);
module.exports.topics = topics;

const fullnames = async (sls) => Object.values(await topics(sls));
module.exports.fullnames = fullnames;

const arns = async (sls) => (await fullnames(sls)).map(topic => `arn:aws:sns:\${self:provider.region}:\${self:custom.accountId}:${topic}`);
module.exports.arns = arns;
