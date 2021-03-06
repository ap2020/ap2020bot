/* eslint-disable @typescript-eslint/naming-convention */
import type { ScheduledHandler } from 'aws-lambda';
import { axios } from '@/lib/axios';
import { source } from 'common-tags';
import Parser from 'rss-parser';
import 'source-map-support/register';
import { envvar } from '@/lib/envvar';
import { slack } from '@/lib/slack/client';
import { TinyStorage } from '@/lib/aws/dynamodb/tiny-storage';
import type { Option } from 'ts-results';

/**
 * お知らせ
 */
type Item = {
  url: string;
  title: string;
};

/**
 * 工学部ポータルサイトにアクセスし，
 * お知らせ一覧の文字列を取得する
 */
const fetchRSS = async (): Promise<string> => {
  const res = await axios.get(
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
    },
  );
  return res.data as string;
};

/**
 * お知らせ一覧の文字列をパースして，URL とタイトルを抽出
 * @param data RSS 文字列
 */
const extractItems = async (data: string): Promise<Item[]> => {
  const parser = new Parser();
  const rss = await parser.parseString(data);
  return rss.items
    .flatMap((item) => (item.link ? [{ title: item.title ?? 'No title', url: item.link }] : []));
};

/**
 * 既知の URL の配列と今回取得したお知らせの配列を比較し，
 * 未知のお知らせの配列を返す
 *
 * @param oldURLs 既知の URL の配列
 * @param newItems 取得したお知らせの配列
 */
export const filterNewItems = (oldURLs: string[], newItems: Item[]): Item[] => {
  const oldURLSet = new Set(oldURLs);
  return newItems.filter(({ url }) => !oldURLSet.has(url));
};

type StorageData = {
  urls: string[];
};

const storage = new TinyStorage<StorageData>('watch-portal');

/**
 * 以前保存した URL 一覧を取得する
 */
const fetchOldURLs = async (): Promise<Option<string[]>> => {
  const res = await storage.get();
  return res.map(({ urls }) => urls);
};

/**
 * 今回取得した URL 一覧を保存する
 * @param urls 保存する URL 一覧
 */
const setNewURLs = async (urls: string[]): Promise<void> => {
  await storage.set({ urls });
};

/**
 * お知らせを Slack に通知する
 * @param item 通知するお知らせ
 */
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

/**
 * Lambda が呼ばれたときにする本質的な処理
 */
const main = async () => {
  // 以前保存した URL 一覧を取得する
  const oldURLs = await fetchOldURLs();

  // 現在のお知らせ一覧ページを取得
  const data = await fetchRSS();
  // お知らせ一覧ページをパースして URL とタイトルを抽出
  const items = await extractItems(data);
  // 今回取得した URL 一覧を保存する
  await setNewURLs(items.map(({ url }) => url));

  if (!oldURLs.some) {
    console.log('No saved URLs found. Skipping notification.');
    return;
  }

  // 以前保存した URL 一覧と取得したデータを比較し，新規お知らせを抽出
  const newItems = filterNewItems(oldURLs.val, items);
  // 新規お知らせを Slack に通知
  await Promise.all(newItems.map(item => notifyItem(item)));
};

/**
 * Lambda で実行されるエントリーポイント
 *
 * Lambda specific な部分はこの部分で処理し，
 * 本質的な処理は main に書く。
 * 定期実行系は大抵非本質処理がいらないので，
 * 今回は main を呼ぶだけ。
 */
export const handler: ScheduledHandler = async () => {
  await main();
};
