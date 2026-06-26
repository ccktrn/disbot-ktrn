import { Events, OAuth2Scopes } from "discord.js";
import * as dotenv from "dotenv";
import createCmdMap from "./lib/create-cmd-map";
import DisbotClient from "./wrapper/disbot-client";
import { LLMService } from "./services/llm-service";
import { ReminderService } from "./services/reminder-service";

dotenv.config();

const llmService = new LLMService();
const reminderService = new ReminderService();

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
  reminderService.startChecker(client);
});



// Register commands when the bot joins a new guild (discord-server)
client.on(Events.GuildCreate, guild => {
  console.log(`Joined a new guild: ${guild.name} (id: ${guild.id}).`);
});



import { handleMessage } from "./handlers/onMsg";

// Listen for messages
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  // Let the message handler process the message if it's a mention, reply, or keyword match
  const handledByLLM = await handleMessage(message, client, llmService);
  if (handledByLLM) {
    return;
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