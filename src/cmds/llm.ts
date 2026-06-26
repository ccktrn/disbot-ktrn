import { SlashCommandBuilder, Interaction, CacheType, MessageFlags } from 'discord.js'
import { SlashCmd } from '../type';
import { LLMService } from '../services/llm-service';

import { handleChat } from '../handlers/llm/chat';
import { handleAddKeyword } from '../handlers/llm/add-keyword';
import { handleRemoveKeyword } from '../handlers/llm/remove-keyword';
import { handleListKeyword } from '../handlers/llm/list-keyword';
import { handleModel } from '../handlers/llm/model';

const llmService = new LLMService();

const builder = new SlashCommandBuilder()
  .setName('llm')
  .setDescription('LLM機能の利用や設定を行います。')
  .addSubcommand(subcommand =>
    subcommand
      .setName('chat')
      .setDescription('LLMにメッセージを送信し、返答を得ます。')
      .addStringOption(option => 
        option.setName('message')
          .setDescription('LLMに送信するメッセージ')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('add-keyword')
      .setDescription('LLMが自動で反応するキーワードを追加します。')
      .addStringOption(option => 
        option.setName('keyword')
          .setDescription('反応させたいキーワード (例: "ねえねえ")')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove-keyword')
      .setDescription('LLMが自動で反応するキーワードを削除します。')
      .addStringOption(option => 
        option.setName('keyword')
          .setDescription('削除したいキーワード')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list-keyword')
      .setDescription('現在登録されている自動応答キーワードの一覧を表示します。')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('model')
      .setDescription('使用するLLMモデルを設定します。')
      .addStringOption(option => 
        option.setName('name')
          .setDescription('モデル名 (例: "meta-llama/llama-3.1-8b-instruct:free")。空なら現在の設定を確認します。')
          .setRequired(false)
      )
  );



const execute = async (interaction: Interaction<CacheType>) => {
  if (!interaction.isChatInputCommand()) return;

  const subcommand = interaction.options.getSubcommand();

  try {
    if (subcommand === 'chat') {
      await handleChat(interaction, llmService);
    } 
    else if (subcommand === 'add-keyword') {
      await handleAddKeyword(interaction, llmService);
    } 
    else if (subcommand === 'remove-keyword') {
      await handleRemoveKeyword(interaction, llmService);
    } 
    else if (subcommand === 'list-keyword') {
      await handleListKeyword(interaction, llmService);
    }
    else if (subcommand === 'model') {
      await handleModel(interaction, llmService);
    }
  } catch (error) {
    console.error("Error in /llm command:", error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: "エラーが発生しました。" });
    } else {
      await interaction.reply({ content: "エラーが発生しました。", flags: [ MessageFlags.Ephemeral ] });
    }
  }
};

const llmCmd: SlashCmd = {
  builder,
  execute,
};
export default llmCmd;
