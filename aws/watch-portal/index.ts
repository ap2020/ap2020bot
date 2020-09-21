/* eslint-disable @typescript-eslint/naming-convention */
import { ScheduledHandler } from 'aws-lambda';
import axios from 'axios';
import Parser from 'rss-parser';
import AWS from 'aws-sdk';
import 'source-map-support/register';

const fetchRSS = async (): Promise<string> => {
    const { data } = await axios.get(
        'https://info.t.u-tokyo.ac.jp/rss/index.xml',
        {
            proxy: {
                host: process.env.UTOKYO_PROXY_HOST,
                port: Number(process.env.UTOKYO_PROXY_PORT),
                auth: {
                    username: process.env.UTOKYO_PROXY_USERNAME,
                    password: process.env.UTOKYO_PROXY_PASSWORD,
                },
            },
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'User-Agent': process.env.USER_AGENT,
            },
        },
    );
    return data;
};

const extractItems = async (data: string): Promise<Parser.Item[]> => {
    const parser = new Parser();
    const rss = await parser.parseString(data);
    return rss.items;
};

const filterNewItems = (oldURLs: string[], newItems: Parser.Item[]): Parser.Item[] => {
    const oldURLSet = new Set(oldURLs);
    return newItems.filter(({ link }) => !oldURLSet.has(link));
};

const db = new AWS.DynamoDB.DocumentClient(
    process.env.IS_OFFLINE || process.env.IS_LOCAL ?
        {
            region: 'localhost',
            endpoint: 'http://localhost:8000',
        } :
        {},
);

const fetchOldURLs = async (): Promise<string[]> => {
    const res = await db.get({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        TableName: process.env.WATCH_PORTAL_DYNAMODB_TABLE,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Key: {
            key: 'oldURLs',
        },
    }).promise();

    return res?.Item?.urls ?? [];
};

const setNewURLs = async (urls: string[]): Promise<void> => {
    await db.update({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        TableName: process.env.WATCH_PORTAL_DYNAMODB_TABLE,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Key: {
            key: 'oldURLs',
        },
        UpdateExpression: 'set urls = :urls',
        ExpressionAttributeValues: {
            ':urls': urls,
        },
    }).promise();
};

// eslint-disable-next-line @typescript-eslint/require-await
const notifyItem = async (item: Parser.Item) => {
    console.log(item);
};

export const handler: ScheduledHandler = async () => {
    const oldURLs = await fetchOldURLs();
    const data = await fetchRSS();
    const items = await extractItems(data);
    const newItems = filterNewItems(oldURLs, items);
    await Promise.all(newItems.map(item => notifyItem(item)));
    await setNewURLs(items.map(({ link }) => link));
};
