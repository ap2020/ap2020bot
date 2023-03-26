const { STS } = require('@aws-sdk/client-sts');
const sts = new STS();

module.exports.accountId = async () => (await sts.getCallerIdentity({})).Account;
