import AWS from "aws-sdk";

export const db = new AWS.DynamoDB.DocumentClient(
    process.env.IS_OFFLINE || process.env.IS_LOCAL ?
        {
            region: 'localhost',
            endpoint: 'http://localhost:8000',
        } :
        {},
);
