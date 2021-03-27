import type { ScheduledHandler } from 'aws-lambda';
import { axios } from '@/lib/axios';
import 'source-map-support/register';
import { envvar } from '@/lib/envvar';
import { slack } from '@/lib/slack/client';
import cheerio from 'cheerio';
import * as diff from 'diff';
import { getBucketName, s3 } from '@/lib/s3';
import type { MessageAttachment } from '@slack/web-api';
import { source } from 'common-tags';
import type { Option } from 'ts-results';
import { None, Some } from 'ts-results';
import type { AWSError } from 'aws-sdk';
import { Size, validateSize } from '@/lib/validate';
import assert from 'assert';

const watchingUrl = 'https://www.i.u-tokyo.ac.jp/edu/entra/index.shtml';

const fetchHTML = async (): Promise<string> =>
  (await axios.get(watchingUrl)).data as string;

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
export const calcDiff = (oldText: string, newText: string): Option<diff.Change[]> => {
  const changes = diff.diffLines(oldText, newText, { ignoreWhitespace: true });
  if (changes.length === 1) {
    return None;
  }
  return Some(changes);
};

/**
 * 差分をSlack用に整形
 */
const formatDiff = (changes: diff.Change[]): MessageAttachment[] =>
  // TODO: もっといい感じに
  changes
    .filter(change => change.added || change.removed)
    .filter(change => change.value.trim())
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
const loadOldText = async (): Promise<Option<string>> => {
  try {
    const res = await s3.getObject({
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: getBucketName('default'),
      Key: 'watch-inshi/ist/index.txt',
      /* eslint-enable @typescript-eslint/naming-convention */
    }).promise();
    assert(res.Body !== undefined);
    return Some(res.Body.toString());
  } catch (error_) {
    const error = error_ as AWSError;
    if (['AccessDenied', 'NoSuchKey'].includes(error.code)) {
      return None;
    }
    throw error;
  }
};

/**
 * 今回取得したHTMLを保存する
 */
const saveNewText = async (text: string): Promise<void> => {
  const buf = Buffer.from(text);

  if (!validateSize(buf, new Size(1, 'mb'))) {
    throw new Error(`Buffer is too big: ${buf.length} bytes`);
  }

  await s3.putObject({
    /* eslint-disable @typescript-eslint/naming-convention */
    Bucket: getBucketName('default'),
    Key: 'watch-inshi/ist/index.txt',
    Body: buf,
    /* eslint-enable @typescript-eslint/naming-convention */
  }).promise();
};

/**
 * お知らせを Slack に通知する
 */
const notify = async (attachments: MessageAttachment[]) => {
  await (await slack.bot).chat.postMessage({
    /* eslint-disable @typescript-eslint/naming-convention */
    channel: await envvar.get('slack/channel/inshi-ist'),
    username: '院試に詳しい芹沢あさひ',
    icon_emoji: ':serizawa-asahi:',
    text: source`
      冬優子ちゃん大変っす！院試情報が更新されたっすよ！
      ${watchingUrl}
    `,
    attachments,
    /* eslint-enable @typescript-eslint/naming-convention */
  });
};

/**
 * Lambda が呼ばれたときにする本質的な処理
 */
export const main = async (): Promise<void> => {
  const oldText = await loadOldText();

  // 現在のお知らせ一覧ページを取得
  const newHTML = await fetchHTML();
  const newText = extractTextFromHTML(newHTML);
  // 取得した HTML を保存
  await saveNewText(newText);

  if (!oldText.some) { // TODO: somehow option.none does not work as type guard
    console.log('No saved HTML found. Skipping notification.');
    return;
  }

  // 差分を計算
  const changes = calcDiff(oldText.val, newText);
  if (!changes.some) {
    console.log('No changes. Skipping notification.');
    return;
  }
  // Slack 投稿用に差分を整形
  const attachments = formatDiff(changes.val);
  // 新規お知らせを Slack に通知
  await notify(attachments);
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
