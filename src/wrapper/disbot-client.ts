import { Client, Partials, REST } from "discord.js";
import { Routes } from 'discord-api-types/v9'
import { SlashCmd } from '../type';

import * as dotenv from "dotenv";

type DiscordMessageCategory = 'log' | 'info' | 'warning' | 'success' | 'error';

// Wrapper class for Discord client
class DisbotClient {
  public static client: Client;
  private static client_id = process.env.DISCORD_CLIENT_ID!;
  private static token = process.env.DISCORD_TOKEN!;
  private static channelId: string | undefined = undefined; // Channel ID to send messages to Discord

  private static readonly categorySettings: Record<DiscordMessageCategory, { 
    editGracePeriod: number, // Time in seconds to wait before editing a message, if 0 , No edit and always send a new message
    formatter: (message: string) => string 
  }> = {
    log: {
      editGracePeriod: 5 * 60, // 5 minutes can edit
      formatter: (message) => `**[LOG]** ${message}`
    },
    info: {
      editGracePeriod: 0, // always create a new message
      formatter: (message) => `**[INFO]** ${message}`
    },
    warning: {
      editGracePeriod: 0, // always create a new message
      formatter: (message) => `**[WARNING]** ${message}`
    },
    success: {
      editGracePeriod: 0, // always create a new message
      formatter: (message) => `**[SUCCESS]** ${message}`
    },
    error: {
      editGracePeriod: 0, // always create a new message
      formatter: (message) => `**[ERROR]** ${message}`
    }
  };

  private constructor() {
    // Private constructor to prevent instantiation
  }

  public static createClient(): Client {
    if (!this.client) {
      // Create a new Discord client instance
      this.client = new Client({
        intents: [          
          "Guilds",
          "GuildMessages",
          "MessageContent",
        ],
        partials: [
          Partials.Message,
          Partials.Channel,
          Partials.Reaction,
          Partials.User,
          Partials.GuildMember,
          Partials.ThreadMember,
          Partials.GuildScheduledEvent,
        ]
      });
    }
    return this.client;
  }

  public static login(): Promise<string> {
    if (!this.client) {
      throw new Error("Discord client is not created. Call createClient() first.");
    }
    if (!this.token) {
      throw new Error("Discord token is not set. Please set DISCORD_TOKEN in environment variables.");
    }
    return this.client.login(this.token);
  }

  public static setChannelId(channelId: string): void {
    this.channelId = channelId;
  }
  public static getChannelId(): string | undefined {
    return this.channelId;
  }  

  public static sendMsg(message: string, category: DiscordMessageCategory = 'info'): void {
    // send message to Discord
    if (!this.channelId) {
      console.error("Channel ID is not set. Cannot send message to Discord.");
      return;
    }
    const channel = this.client.channels.cache.get(this.channelId);
    if (!channel) {
      console.error("Channel not found. Cannot send message to Discord.");
      return;
    }
    if (!channel.isSendable()) {
      console.error("Channel is not sendable. Cannot send message to Discord.");
      return;
    }


    // decorate message to Discords
    const { editGracePeriod, formatter } = this.categorySettings[category];

    if (editGracePeriod > 0 && channel.lastMessage && channel.lastMessage.editable) {
      const last = channel.lastMessage.editedAt || channel.lastMessage.createdAt;
      if (Date.now() - last.getTime() < editGracePeriod * 1000) {
        // If the last message was sent within the editGracePeriod time, edit it
        channel.lastMessage.edit(formatter(message))
          .catch(err => console.error("Failed to edit message:", err));
        return;
      }
    }
    // If the message cannot be edited, send it as a normal message
    channel.send(formatter(message));
  }



  
  // コマンドを登録・更新する関数 (特定のギルドのみ)
  public static async deployCmdsForGuild (cmdMap: Map<string, SlashCmd>, guild_id: string) {


    const cmds = Array.from(cmdMap.values()).map(cmd => cmd.builder)
    DisbotClient.client.guilds.fetch(guild_id)
    .then(guild => {
      guild.commands.set(cmds)
      .then(() => {
        console.log(`Commands registered successfully in guild: ${guild.name} (id: ${guild.id})`);
      })
      .catch(error => {
        console.error(`Failed to register commands in guild ${guild.name} (id: ${guild.id}):`, error);
      });
    })
    .catch(error => {
      console.error(`Failed to fetch guild with ID ${guild_id}:`, error);
    });
    return
  }

  // コマンドを登録・更新する関数 (すべてのギルド, 反映時差有り)
  public static async deployCmds (cmdMap: Map<string, SlashCmd>) {


    const cmds = Array.from(cmdMap.values()).map(cmd => cmd.builder)
    DisbotClient.client.application?.commands.set(cmds)
    .then(() => {
      console.log("Commands registered successfully.");
    })
    .catch(error => {
      console.error("Failed to register commands:", error);
    });
    return
  }



}

export default DisbotClient;