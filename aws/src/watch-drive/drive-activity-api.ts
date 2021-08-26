import type { drive_v3, driveactivity_v2 } from 'googleapis';
import { getDriveItemId } from './lib';
import { DriveItem as DriveItem_, getLinkWithResourceKey, SentChannel } from './drive-api';
import { fetchDriveItem, getPath, getSentChannel } from './drive-api'; // TODO: 名前衝突なんとかしろ

export interface DriveItem {
  mimeType: string;
  name: string;
  link: string | null;
  sentChannel: SentChannel;
  getPath(drive: drive_v3.Drive): Promise<string>;
}

class FoundItem implements DriveItem {
  mimeType: string;
  name: string;
  link: string | null;
  sentChannel: SentChannel;

  driveItem: DriveItem_;

  getPath(drive: drive_v3.Drive): Promise<string> {
    return getPath(drive, this.driveItem);
  }

  constructor(item: DriveItem_, sentChannel: SentChannel) {
    if (!item.content.mimeType) {
      // いや起きないだろと思っている
      // 起きたらtargetの情報を使う (つまりNotFoundItem) けどちゃんとしたエラー処理が面倒
      // TODO: さすがにエグいので， requiredField = ["mimetype", ...] とかしてまとめて適切にチェックしたい
      throw new Error(`Missing mimeType: ${item.content.id}`);
    }
    if (!item.content.name) {
      throw new Error(`Missing name: ${item.content.id}`);
    }
    if (!item.content.id) {
      throw new Error('Missing id'); // これはどうログすりゃいいんだ
    }
    this.mimeType = item.content.mimeType;
    this.name = item.content.name;
    this.link = getLinkWithResourceKey(item);
    this.sentChannel = sentChannel;
    this.driveItem = item;
  }
}

class NotFoundItem implements DriveItem {
  mimeType: string;
  name: string;
  link: string | null;
  sentChannel = 'main' as const;

  getPath(): Promise<string> {
    return Promise.resolve(`???/${this.name}`);
  }

  constructor(target: driveactivity_v2.Schema$DriveItem) {
    if (!target.mimeType) {
      // いや起きないだろ
      throw new Error(`Missing mimeType: ${target.title}`);
    }
    if (!target.title) {
      throw new Error(`Missing title: ${target.title}`);
    }
    this.mimeType = target.mimeType;
    this.name = target.title;
    this.link = null;
  }
}

export const getDriveItem = async (drive: drive_v3.Drive, target: driveactivity_v2.Schema$Target): Promise<DriveItem> => {
  if (!target.driveItem) {
    throw new Error(`Not driveItem: ${target}`);
  }
  try {
    const driveItem = await fetchDriveItem(drive, getDriveItemId(target));
    const sentChannel = await getSentChannel(drive, driveItem.content.id!);
    return new FoundItem(driveItem, sentChannel);
  } catch (error) {
    const errors: { reason: string }[] = error?.response?.data?.error?.errors;
    if (!errors) {
      throw error;
    }
    if (errors.length != 1) {
      throw error;
    }
    if (errors[0].reason !== 'notFound') {
      throw error;
    }
    // not found so use NotFoundItem
    return new NotFoundItem(target.driveItem);
  }
};
