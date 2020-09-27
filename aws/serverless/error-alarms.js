const stages = require('./stages.js');

// TODO: extract from serverless.yml
const functions = [
    'watch-portal',
];

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
