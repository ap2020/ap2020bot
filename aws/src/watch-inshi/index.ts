/* eslint-disable @typescript-eslint/naming-convention */
import type { ScheduledHandler } from 'aws-lambda';
import { axios } from '@/lib/axios';
import 'source-map-support/register';
import { envvar } from '@/lib/envvar';
import { slack } from '@/lib/slack/client';
import cheerio from 'cheerio';
import diff from 'diff';
import { getBucketName, s3 } from '@/lib/s3';
import type { MessageAttachment } from '@slack/web-api';

// TODO: ドキュメントが崩壊している

const fetchHTML = async (): Promise<string> =>
  (await axios.get('https://www.i.u-tokyo.ac.jp/edu/entra/index.shtml')).data as string;

/**
 * HTMLをパースしてテキストに変換
 */
const extractTextFromHTML = (html: string): string => {
  const $ = cheerio.load(html);
  return $('#free').text();
};

/**
 * 差分を計算
 */
export const calcDiff = (oldText: string, newText: string): diff.Change[] => {
  const changes = diff.diffLines(oldText, newText, { ignoreWhitespace: true });
  return changes;
};

/**
 * 差分をSlack用に整形
 */
const formatDiff = (changes: diff.Change[]): MessageAttachment[] =>
  // TODO: もっといい感じに
  changes
    .filter(change => change.added || change.removed)
    .map(change => (change.added ? {
      color: '#28a745',
      title: '追加',
      text: change.value,
    } : {
      color: '#d73a49',
      title: '削除',
      text: change.value,
    }));

/**
 * 前回取得したHTMLを取得する
 */
const loadOldHTML = async (): Promise<string> => {
  const res = await s3.getObject({
    Bucket: getBucketName('default'),
    Key: 'watch-inshi/ist/index.html',
  }).promise();
  return res.Body.toString();
};

/**
 * 今回取得したHTMLを保存する
 */
const saveNewHTML = async (html: string): Promise<void> => {
  await s3.putObject({
    Bucket: getBucketName('default'),
    Key: 'watch-inshi/ist/index.html',
    Body: html,
  }).promise();
};

/**
 * お知らせを Slack に通知する
 * @param item 通知するお知らせ
 */
const notify = async (attachments: MessageAttachment[]) => {
  await (await slack.bot).chat.postMessage({
    channel: await envvar.get('slack/channel/notify-temp'),
    username: '院試に詳しい芹沢あさひ',
    icon_emoji: ':serizawa-asahi:',
    text: '冬優子ちゃん大変っす！院試情報が更新されたっすよ！',
    attachments,
  });
};

/**
 * Lambda が呼ばれたときにする本質的な処理
 */
const main = async () => {
  // 以前保存したHTMLを取得する
  const oldText = extractTextFromHTML(await loadOldHTML());
  // 現在のお知らせ一覧ページを取得
  const newHTML = await fetchHTML();
  const newText = extractTextFromHTML(newHTML);
  // お知らせ一覧ページをパースして URL とタイトルを抽出
  const changes = calcDiff(oldText, newText);
  // 以前保存した URL 一覧と取得したデータを比較し，新規お知らせを抽出
  const attachments = formatDiff(changes);
  // 新規お知らせを Slack に通知
  await notify(attachments);
  // 今回取得した URL 一覧を保存する
  await saveNewHTML(newHTML);
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
