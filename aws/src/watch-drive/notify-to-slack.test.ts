import { set } from 'lodash';
import type { driveactivity_v2 } from 'googleapis';
import { isActivityByBot } from './notify-to-slack';

const fakeGroupEmail = 'hoge@groups.example.com';

const createActivity = (): driveactivity_v2.Schema$DriveActivity => {
  const activity: driveactivity_v2.Schema$DriveActivity = {};
  set(activity, ['primaryActionDetail', 'permissionChange', 'addedPermissions'], [
    {
      role: 'COMMENTER',
      group: {
        email: fakeGroupEmail,
      },
    },
  ]);
  activity.actors = [];
  activity.actors.push(set({}, ['user', 'knownUser', 'isCurrentUser'], true));
  return activity;
};

describe('isActivityByBot', () => {
  it('ignores adding comment permission by bot', () => {
    const activity = createActivity();
    expect(isActivityByBot(activity, fakeGroupEmail)).toBe(true);
  });

  it("doesn't ignore other permission changes", () => {
    const activity = createActivity();
    activity.primaryActionDetail!.permissionChange!.addedPermissions!.push(
      {
        role: 'WRITER',
        group: {
          email: fakeGroupEmail,
        },
      },
    );
    expect(isActivityByBot(activity, fakeGroupEmail)).toBe(false);
  });

  it("doesn't ignore removal of permission change", () => {
    const activity = createActivity();
    delete activity.primaryActionDetail!.permissionChange!.addedPermissions;
    activity.primaryActionDetail!.permissionChange!.removedPermissions = [{
      role: 'COMMENTER',
      group: {
        email: fakeGroupEmail,
      },
    }]; // activity type: create
    expect(isActivityByBot(activity, fakeGroupEmail)).toBe(false);
  });

  it("doesn't ignore adding permission to non-group", () => {
    const activity = createActivity();
    activity.primaryActionDetail!.permissionChange!.addedPermissions = [
      {
        role: 'VIEWER',
        user: {},
      },
    ];
    expect(isActivityByBot(activity, fakeGroupEmail)).toBe(false);
  });

  it("doesn't ignore adding permission to other group", () => {
    const activity = createActivity();
    activity.primaryActionDetail!.permissionChange!.addedPermissions = [
      {
        role: 'VIEWER',
        group: {
          email: 'fuga@groups.example.com',
        },
      },
    ];
    expect(isActivityByBot(activity, fakeGroupEmail)).toBe(false);
  });

  it("doesn't ignore other activity type", () => {
    const activity = createActivity();
    delete activity.primaryActionDetail!.permissionChange;
    activity.primaryActionDetail!.create = {}; // activity type: create
    expect(isActivityByBot(activity, fakeGroupEmail)).toBe(false);
  });

  it("doesn't ignore activity which has more than one actor", () => {
    const activity = createActivity();
    activity.actors!.push({ user: {} });
    expect(isActivityByBot(activity, fakeGroupEmail)).toBe(false);
  });

  it("doesn't ignore activity by other user", () => {
    const activity = createActivity();
    activity.actors = [{ user: { knownUser: { isCurrentUser: false } } }];
    expect(isActivityByBot(activity, fakeGroupEmail)).toBe(false);
  });

  it("doesn't ignore activity by non-user", () => {
    const activity = createActivity();
    activity.actors = [{ anonymous: {} }];
    expect(isActivityByBot(activity, fakeGroupEmail)).toBe(false);
  });
});
