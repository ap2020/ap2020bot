import AWS from "aws-sdk";

export const db = new AWS.DynamoDB.DocumentClient(
    process.env.STAGE === 'prod' ?
        {} :
        {
            region: 'localhost',
            endpoint: 'http://localhost:8000',
        },
);
