const { STS } = require('aws-sdk');
const sts = new STS();

module.exports.accountId = async () => (await sts.getCallerIdentity().promise()).Account;
