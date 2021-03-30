import type { WebClient } from '@slack/web-api';
import assert from 'assert';
import type { driveactivity_v2, people_v1, drive_v3 } from 'googleapis';


export interface Clients {
  slack: WebClient;
  drive: drive_v3.Drive;
  driveActivity: driveactivity_v2.Driveactivity;
  people: people_v1.People;
}

export const getDriveItemId = (target: driveactivity_v2.Schema$Target): string => {
  let itemName: string | null = null;
  if (target.driveItem) itemName = target.driveItem.name!;
  else if (target.drive) itemName = target.drive.name!;
  else if (target.fileComment) itemName = target.fileComment.parent!.name!;
  // else {
  //   const _exhaustiveCheck: never = target;
  //   itemName = _exhaustiveCheck;
  // }
  assert(itemName !== null);
  return itemName.replace(/^items\//, '');
};
