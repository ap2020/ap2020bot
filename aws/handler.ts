import { ScheduledHandler } from 'aws-lambda';
import axios, { AxiosRequestConfig } from 'axios';
import Parser from 'rss-parser';
import 'source-map-support/register';

const parser = new Parser();

const url = 'https://info.t.u-tokyo.ac.jp/rss/index.xml';

const config: AxiosRequestConfig = {
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
};

export const hello: ScheduledHandler = async (event, _context) => {
    const { data } = (await axios.get(url, config));
    const rss = await parser.parseString(data);
    console.log(rss.title);
    console.log(rss.items);
};
