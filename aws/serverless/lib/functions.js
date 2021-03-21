const calcFullname = func => `ap2020bot-\${self:custom.stage}-${func}`;
module.exports.calcFullname = calcFullname;

const calcArnFromFullName = func => `arn:aws:lambda:\${self:provider.region}:\${self:custom.accountId}:function:${func}`;
module.exports.calcArnFromFullName = calcArnFromFullName;

const calcArnFromShortName = func => calcArnFromFullName(calcFullname(func));
module.exports.calcArnFromShortName = calcArnFromShortName;

const functions = async ({ resolveConfigurationProperty }) => {
  return await resolveConfigurationProperty(['functions']);
} 

const shortnames = async (sls) => Object.keys(await functions(sls));
module.exports.shortnames = shortnames;

const fullnames = async (sls) => (await shortnames(sls)).map(func => calcFullname(func));
module.exports.fullnames = fullnames;

const arns = async (sls) => (await fullnames(sls)).map(func => calcArnFromFullName(func));
module.exports.arns = arns;

const logGroupArns = async (sls) => (await fullnames(sls)).map(func => `arn:aws:logs:\${self:provider.region}:\${self:custom.accountId}:log-group:/aws/lambda/${func}:*`);
module.exports.logGroupArns = logGroupArns;
