import {drive_v3} from 'googleapis';
import {cacheCalls} from '../utils/utils';
import {rootFolderId} from './lib';

const driveItems = new Map<string, Promise<DriveItem>>()

// TODO: drive-activity-apiと名前が衝突している
// DriveItemはDrive Activityの概念なので↓を改名すべきか？
// それともnamespaceで分けてあげるか
// そもそもcontentでアクセスするの面倒なので適切にラップしたい (#30)
export class DriveItem {
    client: drive_v3.Drive;
    content: drive_v3.Schema$File;
    private _path: string|null;

    constructor(client: drive_v3.Drive, content: drive_v3.Schema$File) {
        this.client = client;
        this.content = content;
        this._path = null;
    }
}

export const fetchDriveItem = cacheCalls(async (client: drive_v3.Drive, id: string): Promise<DriveItem> =>
    new DriveItem(client, (await client.files.get({fileId: id, fields: 'id,name,parents,mimeType,webViewLink,permissions'})).data)
, (c, id) => id);

/**
 * cache for getPath
 * folderId => path
 */
const paths: Map<string, Promise<{path: string | null, valid: boolean}>> = new Map([[rootFolderId, Promise.resolve({path: '/', valid: true})]]);
export const getPath = async (client: drive_v3.Drive, item: DriveItem): Promise<string> => {
    /**
     * path: path to item
     * valid: true if path has rootFolderId in ancestor
     */
    const rec = cacheCalls(async (client: drive_v3.Drive, folderId: string): Promise<{path: string | null; valid: boolean}> => {
        const folder = await fetchDriveItem(client, folderId);
        if (!folder.content.parents) {
            // folder is root of drive
            return { path: null, valid: false };
        }
        // I want to use Promise.any...
        const parentPaths = (
            (await Promise.all(folder.content.parents.map(async parentId => rec(client, parentId))))
            .filter(({valid}) => valid).map(({path}) => path)
        );
        if (parentPaths.length > 0) {
            const isFolder = folder.content.mimeType === 'application/vnd.google-apps.folder';
            // folder has one or more parents that is child of rootFolderId
            return { path: `${parentPaths[0]}${folder.content.name}${isFolder? '/': ''}`, valid: true };
        } else {
            // rootFolderId is not ancestor of folderId...
            return { path: null, valid: false };
        }
    }, (c, id) => id, paths);
    const path = await rec(client, item.content.id);
    return path.valid? path.path: item.content.name;
};

export const isIgnored = cacheCalls(async (client: drive_v3.Drive, itemId: string): Promise<boolean> => {
    const item = await fetchDriveItem(client, itemId);
    if(!item.content.parents) {
        // root of drive
        return false;
    }
    if (item.content.parents.length === 0) {
        // we don't need to ignore this
        return false;
    }
    const isParentsIgnored = await Promise.all(item.content.parents.map(async parentId => isIgnored(client, parentId)));
    // 全ての親がignoredならtrue
    return isParentsIgnored.every((x) => x);
}, (c, id) => id, new Map([
    ...((process.env.GOOGLE_DRIVE_IGNORED_IDS ?? '').split(',').map(s => [s.trim(), Promise.resolve(true)] as [string, Promise<boolean>])),
    [rootFolderId, Promise.resolve(false)],
]));
