import type { drive_v3, driveactivity_v2 } from 'googleapis';
import { getDriveItemId } from './lib';
import { fetchDriveItem, getPath, DriveItem as DriveItem_, isIgnored } from './drive-api'; // TODO: 名前衝突なんとかしろ

export interface DriveItem {
    mimeType: string;
    name: string;
    link: string | null;
    ignored: boolean;
    getPath(drive: drive_v3.Drive): Promise<string>;
}

class FoundItem implements DriveItem {
    mimeType: string;
    name: string;
    link: string | null;
    ignored: boolean;

    driveItem: DriveItem_;

    getPath(drive: drive_v3.Drive): Promise<string> {
        return getPath(drive, this.driveItem);
    }

    constructor(item: DriveItem_, ignored: boolean) {
        if (!item.content.mimeType) {
            // いや起きないだろと思っている
            // 起きたらtargetの情報を使う (つまりNotFoundItem) けどちゃんとしたエラー処理が面倒
            // TODO: さすがにエグいので， requiredField = ["mimetype", ...] とかしてまとめて適切にチェックしたい
            throw Error(`Missing mimeType: ${item.content.id}`);
        }
        if (!item.content.name) {
            throw Error(`Missing name: ${item.content.id}`);
        }
        if (!item.content.id) {
            throw Error('Missing id'); // これはどうログすりゃいいんだ
        }
        this.mimeType = item.content.mimeType;
        this.name = item.content.name;
        this.link = item.content.webViewLink ?? null;
        this.ignored = ignored;
        this.driveItem = item;
    }
}

class NotFoundItem implements DriveItem {
    mimeType: string;
    name: string;
    link: string | null;
    ignored = false;

    getPath(): Promise<string> {
        return Promise.resolve(`???/${this.name}`);
    }

    constructor(target: driveactivity_v2.Schema$DriveItem) {
        if (!target.mimeType) {
            // いや起きないだろ
            throw Error(`Missing mimeType: ${target.title}`);
        }
        if (!target.title) {
            throw Error(`Missing title: ${target.title}`);
        }
        this.mimeType = target.mimeType;
        this.name = target.title;
        this.link = null;
    }
}

export const getDriveItem =
    async (drive: drive_v3.Drive, target: driveactivity_v2.Schema$Target): Promise<DriveItem> => {
        if (!target.driveItem) {
            throw Error(`Not driveItem: ${JSON.stringify(target)}`);
        }
        try {
            const driveItem = await fetchDriveItem(drive, getDriveItemId(target));
            const ignored = await isIgnored(drive, driveItem.content.id);
            return new FoundItem(driveItem, ignored);
        } catch (err) {
            const errors: {reason: string}[] = err?.response?.data?.error?.errors;
            if (!errors) {
                throw err;
            }
            if (errors.length !== 1) {
                throw err;
            }
            if (errors[0].reason !== 'notFound') {
                throw err;
            }
            // not found so use NotFoundItem
            return new NotFoundItem(target.driveItem);
        }
    };
