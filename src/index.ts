import { WebClient } from "@slack/web-api";
import async from "async";
import Bottleneck from "bottleneck";
import colors from "colors";

import { LogType } from "./types/types";

const slackWeb = new WebClient();

// Create a rate limiter with Bottleneck
const limiter = new Bottleneck({
  minTime: 1000, // 1 second between each request
});

const messageQueue = async.queue(async (task: any, callback: any) => {
  try {
    await limiter.schedule(() => slackWeb.chat.postMessage(task));
    callback();
  } catch (error) {
    console.error("Error posting message:", error);
    // @ts-ignore
    callback(error);
  }
}, 1); // Only one worker to ensure order and rate limit

/**
 * Takes in a message and logs it to a slack channel.
 *
 * @param {string}     token - Slack Token (needs permissions to post message in the channel!)
 * @param {string} channelId - Slack Channel ID (where to log the error in slack)
 * @param {string}  message - The message to log
 * @param {LogType} type - The type of message to log
 *
 */
function slack(
  token: string,
  channelId: string,
  message: string,
  type: LogType
) {
  const slkMessage = {
    token: token,
    channel: channelId,
    text: message,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message
            .split("\n")
            .map((a) => `> ${a}`)
            .join("\n"),
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${new Date().toString()}`,
          },
        ],
      },
    ],
  };

  switch (type) {
    case "info":
      slkMessage.text = `:information_source: ${slkMessage.text}`;
      // @ts-expect-error
      message.blocks[0].text.text = `:information_source: ${message.blocks[0].text.text}`;
      break;
    case "start":
      slkMessage.text = `:rocket: ${slkMessage.text}`;
      // @ts-expect-error
      message.blocks[0].text.text = `:rocket: ${message.blocks[0].text.text}`;
      break;
    case "cron":
      slkMessage.text = `:alarm_clock: ${slkMessage.text}`;
      // @ts-expect-error
      message.blocks[0].text.text = `:alarm_clock: ${message.blocks[0].text.text}`;
      break;
    case "error":
      slkMessage.text = `🚨 Yo <@S0790GPRA48> deres an error \n\n [ERROR]: ${slkMessage.text}`;
      // @ts-expect-error
      message.blocks[0].text.text = `🚨 Yo <@S0790GPRA48> deres an error \n\n [ERROR]: ${message.blocks[0].text.text}`;
      break;
    default:
      slkMessage.text = slkMessage.text;
  }

  messageQueue.push(message, (error) => {
    if (error) {
      console.error("Failed to send message:", error);
    }
  });
}

/**
 * Logs a message to the console.
 * (but pretty!) Oooooh! Colors!
 *
 * @param {string}  message - The message to log
 * @param {LogType} type - The type of message to log
 *
 */
function terminal(message: string, type: LogType) {
  switch (type) {
    case "error":
      console.error(colors.red(message));
      break;
    case "warning":
      console.warn(colors.yellow(message));
      break;
    case "info":
      console.info(colors.blue(message));
      break;
    case "success":
      console.log(colors.green(message));
      break;
    case "start":
      console.log(colors.bgBlue(message));
      break;
    case "cron":
      console.log(colors.magenta(`[CRON]: ${message}`));
      break;
    default:
      console.log(message);
  }
}

/**
 * Logs a message to ALL the channels.
 *
 * @param {string}  message - The message to log
 * @param {string}  slackToken - Slack Token (needs permissions to post message in the channel!)
 * @param {string} slackChannel - Slack Channel ID (where to log the error in slack)
 * @param {LogType} type - The type of message to log
 *
 */
function full(
  message: string,
  slackToken: string,
  slackChannel: string,
  type: LogType
) {
  terminal(message, type);
  slack(slackToken, slackChannel, message, type);
}

// people should be able to call this function as logger.log(), logger.slack(), logger.terminal(), logger.full()
export default {
  log: terminal,
  slack,
  terminal,
  full,
};
