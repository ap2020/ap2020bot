/* eslint-disable @typescript-eslint/naming-convention */
import { ScheduledHandler } from 'aws-lambda';
import axios from 'axios';
import { source } from 'common-tags';
import Parser from 'rss-parser';
import 'source-map-support/register';
import { envvar } from '@/lib/envvar';
import { slack } from '@/lib/slack/client';
import { db } from '@/lib/dynamodb';

type Item = {
    url: string;
    title: string;
};

const fetchRSS = async (): Promise<string> => {
    const { data } = await axios.get(
        'https://info.t.u-tokyo.ac.jp/rss/index.xml',
        {
            proxy: {
                host: await envvar.get('utokyo-proxy/host'),
                port: Number(await envvar.get('utokyo-proxy/port')),
                auth: {
                    username: await envvar.get('utokyo-proxy/username'),
                    password: await envvar.get('utokyo-proxy/password'),
                },
            },
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'User-Agent': await envvar.get('user-agent'),
            },
        },
    );
    return data;
};

const extractItems = async (data: string): Promise<Item[]> => {
    const parser = new Parser();
    const rss = await parser.parseString(data);
    return rss.items.map(({ title, link }) => ({ title, url: link }));
};

export const filterNewItems = (oldURLs: string[], newItems: Item[]): Item[] => {
    const oldURLSet = new Set(oldURLs);
    return newItems.filter(({ url }) => !oldURLSet.has(url));
};

const fetchOldURLs = async (): Promise<string[]> => {
    const res = await db.get({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        TableName: await envvar.get('dynamodb/tablename/watch-portal'),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Key: {
            key: 'oldURLs',
        },
    }).promise();

    return res?.Item?.urls ?? [];
};

const setNewURLs = async (urls: string[]): Promise<void> => {
    await db.put({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        TableName: await envvar.get('dynamodb/tablename/watch-portal'),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Item: {
            key: 'oldURLs',
            urls,
        },
    }).promise();
};

const notifyItem = async (item: Item) => {
    await (await slack.bot).chat.postMessage({
        channel: await envvar.get('slack/channel/notify-temp'),
        username: '工学部ポータルサイト',
        icon_emoji: ':faculty-of-engineering:',
        text: source`
            <${item.url}|${item.title}>
        `,
    });
};

const main = async () => {
    const oldURLs = await fetchOldURLs();
    const data = await fetchRSS();
    const items = await extractItems(data);
    const newItems = filterNewItems(oldURLs, items);
    await Promise.all(newItems.map(item => notifyItem(item)));
    await setNewURLs(items.map(({ url }) => url));
};

export const handler: ScheduledHandler = async () => {
    await main();
};
