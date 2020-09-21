import { ScheduledHandler } from 'aws-lambda';
import axios from 'axios';
import Parser from 'rss-parser';
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

export const hello: ScheduledHandler = async () => {
    const data = await fetchRSS();
    const items = await extractItems(data);
    console.log(items);
};
