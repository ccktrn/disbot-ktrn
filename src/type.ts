import { SharedSlashCommand } from 'discord.js';
import { Interaction, CacheType } from 'discord.js';

export type SlashCmd = {
  builder: SharedSlashCommand; // SlashCommandBuilder-like object
  execute: (interaction: Interaction<CacheType>) => Promise<void>; 
}
