import type { driveactivity_v2, people_v1, drive_v3 } from 'googleapis';
import type { slack } from '../utils/slack';

export const rootFolderId = process.env.GOOGLE_ROOT_FOLDER_ID;

export interface Clients {
    slack: typeof slack;
    drive: drive_v3.Drive;
    driveActivity: driveactivity_v2.Driveactivity;
    people: people_v1.People;
}

export const getDriveItemId = (target: driveactivity_v2.Schema$Target): string => {
    let itemName: string;
    if (target.driveItem) itemName = target.driveItem.name;
    else if (target.drive) itemName = target.drive.name;
    else if (target.fileComment) itemName = target.fileComment.parent.name;
    // else {
    //   const _exhaustiveCheck: never = target;
    //   itemName = _exhaustiveCheck;
    // }
    return itemName.replace(/^items\//, '');
};
