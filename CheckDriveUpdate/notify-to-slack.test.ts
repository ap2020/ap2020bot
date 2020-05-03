import {set} from 'lodash';
import type {driveactivity_v2} from 'googleapis';
import {isActivityByBot} from './notify-to-slack';

const fakeGroupEmail = 'hoge@groups.example.com'

describe('isActivityByBot', () => {
    it('ignores adding comment permission by bot', () => {
        const activity: driveactivity_v2.Schema$DriveActivity = {};
        set(activity, ["primaryActionDetail", "permissionChange", "addedPermissions"], [
            {
                "role": "COMMENTER",
                "group": {
                    "email": fakeGroupEmail,
                }
            }
        ]);
        activity.actors = []
        activity.actors.push(set({}, ["user", "knownUser", 'isCurrentUser'], true));
        expect(isActivityByBot(activity, fakeGroupEmail)).toBe(true);
    });

    it("doesn't ignore other permission changes", () => {
        const activity: driveactivity_v2.Schema$DriveActivity = {};
        set(activity, ["primaryActionDetail", "permissionChange", "addedPermissions"], [
            {
              "role": "VIEWER",
              "group": {
                "email": fakeGroupEmail,
              }
            },
            {
              "role": "COMMENTER",
              "group": {
                "email": fakeGroupEmail,
              }
            }
          ]);
        activity.actors = []
        activity.actors.push(set({}, ["user", "knownUser", 'isCurrentUser'], true));
        expect(isActivityByBot(activity, fakeGroupEmail)).toBe(false);
    })
});
