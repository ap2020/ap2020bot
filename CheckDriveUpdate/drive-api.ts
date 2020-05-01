import {drive_v3} from 'googleapis';

const driveItems = new Map<string, DriveItem>()

const rootFolderId = process.env.GOOGLE_ROOT_FOLDER_ID; // TODO: is this global variable good?

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

export const fetchDriveItem = async (client: drive_v3.Drive, id: string) => {
    return driveItems.has(id) ? // TODO: race condition
        driveItems.get(id):
        new DriveItem(client, (await client.files.get({fileId: id, fields: 'id,name,parents,mimeType,webViewLink'})).data);
}
