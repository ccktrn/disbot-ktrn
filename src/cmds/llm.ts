import { SlashCommandBuilder, Interaction, CacheType, MessageFlags } from 'discord.js'
import { SlashCmd } from '../type';
import { generateLLMResponse } from '../lib/llm/llm-client';
import { LLMConfigRepository } from '../repositories/llm-config-repository';

const llmConfigRepo = new LLMConfigRepository();

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
      const message = interaction.options.getString('message', true);
      await interaction.deferReply();
      const response = await generateLLMResponse(message);
      const safeResponse = response.length > 2000 ? response.substring(0, 1997) + "..." : response;
      await interaction.editReply({ content: safeResponse });
    } 
    else if (subcommand === 'add-keyword') {
      const keyword = interaction.options.getString('keyword', true);
      llmConfigRepo.addKeyword(keyword);
      await interaction.reply({ content: `キーワード \`${keyword}\` を追加しました。` });
    } 
    else if (subcommand === 'remove-keyword') {
      const keyword = interaction.options.getString('keyword', true);
      const removed = llmConfigRepo.removeKeyword(keyword);
      if (removed) {
        await interaction.reply({ content: `キーワード \`${keyword}\` を削除しました。` });
      } else {
        await interaction.reply({ content: `キーワード \`${keyword}\` は登録されていません。`, flags: [ MessageFlags.Ephemeral ] });
      }
    } 
    else if (subcommand === 'list-keyword') {
      const keywords = llmConfigRepo.getKeywords();
      if (keywords.length === 0) {
        await interaction.reply({ content: '現在登録されているキーワードはありません。', flags: [ MessageFlags.Ephemeral ] });
      } else {
        await interaction.reply({ content: `**現在登録されているキーワード:**\n${keywords.map(kw => `- \`${kw}\``).join('\n')}` });
      }
    }
    else if (subcommand === 'model') {
      const name = interaction.options.getString('name');
      if (name) {
        llmConfigRepo.setConfig('model_name', name);
        await interaction.reply({ content: `使用するモデルを \`${name}\` に設定しました。` });
      } else {
        const currentModel = llmConfigRepo.getConfig('model_name') || process.env.LLM_API_MODEL || "デフォルト(google/gemini-2.0-flash-lite-preview-02-05:free)";
        await interaction.reply({ content: `現在のモデル設定: \`${currentModel}\``, flags: [ MessageFlags.Ephemeral ] });
      }
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
