import { Events, OAuth2Scopes } from "discord.js";
import * as dotenv from "dotenv";
import createCmdMap from "./lib/create-cmd-map";
import DisbotClient from "./wrapper/disbot-client";
import { generateLLMResponse } from "./lib/llm/llm-client";
import { LLMConfigRepository } from "./repositories/llm-config-repository";
import { ReminderRepository } from "./repositories/reminder-repository";

dotenv.config();

const llmConfigRepo = new LLMConfigRepository();
const reminderRepo = new ReminderRepository();

// Create a new Discord client instance
const client = DisbotClient.createClient();

const cmdMap = createCmdMap(); // Create the command map from the cmds directory

// clientReady
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  // generate an invite link for the bot
  const inviteLink = readyClient.generateInvite({
    scopes: [
      OAuth2Scopes.Bot,
      OAuth2Scopes.ApplicationsCommands,
    ],
    permissions: [
      'SendMessages',
      'ManageMessages',
      'ReadMessageHistory',
      'ViewChannel'
    ]
  });
  console.log(`${"-".repeat(10)}\n Invite link for the bot :\n${inviteLink} \n${"-".repeat(10)}`);

  // Register commands
  const devGuildId = process.env.DISCORD_DEV_GUILD_ID 
  if (devGuildId){ // if dev-guild is set, deploy commands to only that guild
    DisbotClient.deployCmdsForGuild(cmdMap, devGuildId)
  } else {
    DisbotClient.deployCmds(cmdMap)
  }

  // --- Start Reminder Checker ---
  setInterval(async () => {
    const now = Date.now();
    const pending = reminderRepo.getPendingReminders(now);
    for (const r of pending) {
      try {
        const channel = await client.channels.fetch(r.channel_id);
        if (channel && 'send' in channel && typeof channel.send === 'function') {
          await channel.send(`🔔 <@${r.user_id}> リマインダーの時間です！\n> ${r.content}`);
        }
      } catch (err) {
        console.error(`Failed to send reminder ${r.id}:`, err);
      } finally {
        // 成功しても失敗しても時間が過ぎたものは削除する
        reminderRepo.removeReminderById(r.id);
      }
    }
  }, 10000); // 10秒ごとにチェック
});



// Register commands when the bot joins a new guild (discord-server)
client.on(Events.GuildCreate, guild => {
  console.log(`Joined a new guild: ${guild.name} (id: ${guild.id}).`);
});



// Listen for messages
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  if (message.mentions.has(message.client.user)) { // If the bot is mentioned in a message
    message.reply(`Hello ${message.author.username}!`);
    return;
  }

  const keywords = llmConfigRepo.getKeywords();
  const matchedKeyword = keywords.find(kw => message.content.startsWith(kw));
  
  if (matchedKeyword) {
    try {
      await message.channel.sendTyping();
      const response = await generateLLMResponse(message.content);
      const safeResponse = response.length > 2000 ? response.substring(0, 1997) + "..." : response;
      await message.reply(safeResponse);
    } catch (error) {
      console.error("Error in keyword response:", error);
    }
  }
});

// Listen for interactions e.g. slash commands
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

  if (!DisbotClient.getChannelId()) {
    DisbotClient.setChannelId(interaction.channelId);
  }

  const command = cmdMap.get(interaction.commandName);
  if (!command) {
    await interaction.reply({ content: `Unknown command: ${interaction.commandName}`, ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});


DisbotClient.login()