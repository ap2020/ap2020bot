import { cacheCalls } from '@/lib/cache-calls';
import { envvar } from '@/lib/envvar';
import type { drive_v3 } from 'googleapis';
import { URL } from 'url';

// TODO: drive-activity-apiと名前が衝突している
// DriveItemはDrive Activityの概念なので↓を改名すべきか？
// それともnamespaceで分けてあげるか
// そもそもcontentでアクセスするの面倒なので適切にラップしたい (#30)
export class DriveItem {
  client: drive_v3.Drive;
  content: drive_v3.Schema$File;

  constructor(client: drive_v3.Drive, content: drive_v3.Schema$File) {
    this.client = client;
    this.content = content;
  }
}

export const fetchDriveItem = cacheCalls(
  async (client: drive_v3.Drive, id: string): Promise<DriveItem> =>
    new DriveItem(client, (await client.files.get({ fileId: id, fields: 'id,name,parents,mimeType,webViewLink,permissions' })).data),
  (_, id) => id,
);

/**
 * cache for getPath
 * folderId => path
 */
const paths: Promise<Map<string, Promise<{ path: string | null; valid: boolean }>>> =
  (async () => new Map([[await envvar.get('google/drive/item/ap2020files'), Promise.resolve({ path: '/', valid: true })]]))();
export const getPath = async (client: drive_v3.Drive, item: DriveItem): Promise<string> => {
  /**
     * path: path to item
     * valid: true if path has rootFolderId in ancestor
     */
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const rec = cacheCalls(async (client: drive_v3.Drive, folderId: string): Promise<{ path: string | null; valid: boolean }> => {
    const folder = await fetchDriveItem(client, folderId);
    if (!folder.content.parents) {
      // folder is root of drive
      return { path: null, valid: false };
    }
    // I want to use Promise.any...
    const parentPaths = (
      (await Promise.all(folder.content.parents.map(async parentId => rec(client, parentId))))
        .filter(({ valid }) => valid).map(({ path }) => path)
    );
    if (parentPaths.length > 0) {
      const isFolder = folder.content.mimeType === 'application/vnd.google-apps.folder';
      // folder has one or more parents that is child of rootFolderId
      return { path: `${parentPaths[0]}${folder.content.name}${isFolder ? '/' : ''}`, valid: true };
    } else {
      // rootFolderId is not ancestor of folderId...
      return { path: null, valid: false };
    }
  }, (_, id) => id, paths);
  const path = await rec(client, item.content.id!);
  return path.valid ? path.path! : item.content.name!;
};

export type SentChannel = 'main' | 'lms' | 'none';

export const getSentChannel = cacheCalls<[drive_v3.Drive, string], SentChannel, string>(
  async (client: drive_v3.Drive, itemId: string): Promise<SentChannel> => {
    const item = await fetchDriveItem(client, itemId);
    if (!item.content.parents) {
      // root of drive
      return 'none';
    }
    if (item.content.parents.length === 0) {
      // we don't need to ignore this
      return 'none';
    }
    const parentSentChannels = new Set(await Promise.all(item.content.parents.map(async parentId => getSentChannel(client, parentId))));
    if (parentSentChannels.has('main')) return 'main';
    if (parentSentChannels.has('lms')) return 'lms';
    return 'none';
  },
  (_, id) => id,
  (async () => new Map([
    ...((await envvar.get('google/drive/ignored-items') ?? '').split(',').map(s => [s.trim(), Promise.resolve('none')] as [string, Promise<SentChannel>])),
    [await envvar.get('google/drive/item/ap2020files'), Promise.resolve('main' as const)],
    [await envvar.get('google/drive/item/lms'), Promise.resolve('lms' as const)],
  ]))(),
);

export const getLinkWithResourceKey = (item: DriveItem): string | null => {
  const originalURL = item.content.webViewLink;
  if (!originalURL) {
    return null;
  }
  const url = new URL(originalURL);
  // query parameter の resourcekey に設定するものだと仮定して実装
  // この仮定は↓がソース。公式情報は見つけられず。
  // https://arstechnica.com/gadgets/2021/07/heres-what-that-google-drive-security-update-message-means/
  // TODO: resource key つき URL を UI から取得できるようになった際、形式を確認する
  const resourceKey = item.content.resourceKey;
  if (resourceKey) {
    url.searchParams.set('resourcekey', resourceKey);
  }
  return url.toString();
}
