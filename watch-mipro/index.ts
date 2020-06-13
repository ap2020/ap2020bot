import { AzureFunction, Context } from "@azure/functions"
import scrapeIt from "scrape-it";
import { slack } from "../utils/slack/clients";

/**
 * return A \ B
 */
const disjoint = <T>(A: Set<T>, B: Set<T>): Set<T> =>
    new Set([...A].filter(x => !B.has(x)));

const check: AzureFunction = async function (context: Context, timer: any, oldData: string[]): Promise<string[]> {
    context.log('last data:', oldData);
    const oldProblems = new Set(oldData === undefined? [] : oldData);
    const {problems} = (await scrapeIt<{ problems: string[] }>("http://133.11.136.29/public/", {
        problems: {
            listItem: "[title^=problem]",
        }
    })).data;

    context.log(`found problems: ${[...problems].join(', ')}`);

    const newProblems = disjoint(new Set(problems), new Set(oldProblems));
    const deletedProblems = disjoint(new Set(oldProblems), new Set(problems));
    
    const messages = [];
    if (newProblems.size > 0) {
        messages.push(`:new:問題追加: ${[...newProblems].join(', ')}`) 
    }
    if (deletedProblems.size > 0) {
        messages.push(`:innocent:問題削除: ${[...newProblems].join(', ')}`) 
    }

    if (messages.length > 0) {
        await slack.bot.chat.postMessage({
            channel: process.env.SLACK_CHANNEL_MIPRO,
            text: messages.join('\n\n'),
        });
    }

    return problems;
};

export default check;


// for development

// import {context} from "../utils-dev/fake-context";
// check(context, undefined, ['20pro02','20pro032','20pro100']).catch(console.error);
