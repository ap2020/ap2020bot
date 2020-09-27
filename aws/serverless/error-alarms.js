const path = require('path');
const {readFileSync} = require('fs');
const stages = require('./stages.js');
const yaml = require('js-yaml');

const configText = readFileSync(path.join(__dirname, '..', 'serverless.yml'), {encoding: 'utf8'});
const config = yaml.safeLoad(configText);

const functions = Object.keys(config.functions);

const createAlarm = ({func, stage}) => ([
    `${func}ErrorAlarm`,
    {
        "Type": "AWS::CloudWatch::Alarm",
        "Properties": {
            "AlarmName": `ap2020bot-${stage}-error-${func}`,
            "Namespace": "AWS/Lambda",
            "Dimensions": [
                {
                    "Name": "FunctionName",
                    "Value": `ap2020bot-${stage}-${func}`,
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

const createAlarms = (stage) => Object.fromEntries(functions.map(func => createAlarm({func, stage})));

module.exports = Object.fromEntries(
    stages.map(
        stage => [
            stage,
            {
                "Resources": createAlarms(stage),
            },
        ],
    )
);
