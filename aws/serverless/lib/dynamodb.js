const tables = async ({ resolveConfigurationProperty }) => await resolveConfigurationProperty(['custom', 'dynamodbConfig', 'tableName']);
module.exports.tables = tables;

const fullnames = async (sls) => Object.values(await tables(sls));
module.exports.fullnames = fullnames;

const arns = async (sls) => (await fullnames(sls)).map(table => `arn:aws:dynamodb:\${self:provider.region}:\${self:custom.accountId}:table/${table}`);
module.exports.arns = arns;
