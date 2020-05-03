import {drive_v3} from 'googleapis';
import {cacheCalls} from '../utils/utils';
import {rootFolderId} from './lib';

const driveItems = new Map<string, Promise<DriveItem>>()

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

export const fetchDriveItem = async (client: drive_v3.Drive, id: string) => { // TODO: use cacheCalls
    if (driveItems.has(id)) {
        return driveItems.get(id);
    } else {
        const driveItemPromise = (async () =>
            new DriveItem(client, (await client.files.get({fileId: id, fields: 'id,name,parents,mimeType,webViewLink,permissions'})).data)
        )();
        driveItems.set(id, driveItemPromise);
        return driveItemPromise;
    }
}

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
