const {pascalCase} = require('change-case');

const { shortnames: getFuncShortnames, calcFullname } = require('../lib/functions');

const calcAlarmName = (funcShortname) => `ap2020bot-\${self:custom.stage}-error-${funcShortname}`;

const createAlarm = (func) => ([
    `${pascalCase(func)}ErrorAlarm`,
    {
        "Type": "AWS::CloudWatch::Alarm",
        "Properties": {
            "AlarmName": calcAlarmName(func),
            "Namespace": "AWS/Lambda",
            "Dimensions": [
                {
                    "Name": "FunctionName",
                    "Value": calcFullname(func),
                }
            ],
            "MetricName": "Errors",
            "ComparisonOperator": "GreaterThanOrEqualToThreshold",
            "Period": 60,
            "EvaluationPeriods": 1,
            "Statistic": "Maximum",
            "Threshold": 1,
            "AlarmActions": [
                {
                    "Ref": "ErrorTopic"
                }
            ]
        }
    },
]);

const names = async (sls) => {
    const functions = await getFuncShortnames(sls);
    return functions.map(func => calcAlarmName(func)); 
};
module.exports.names = names;

const arns = async (sls) => (await names(sls)).map(alarm => `arn:aws:cloudwatch:\${self:provider.region}:\${self:custom.accountId}:alarm:${alarm}`);
module.exports.arns = arns;

const cfn = async (sls) => {
    const functions = await getFuncShortnames(sls);
    return {
        "Resources": Object.fromEntries(functions.map(func => createAlarm(func))),
    };
};
module.exports.cfn = cfn;
