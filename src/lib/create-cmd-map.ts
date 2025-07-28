import { SlashCmd } from "../type";
import { readdirSync } from "fs";
import { join } from "path";


// find cmds in the cmds directory
function createCmdMap(): Map<string, SlashCmd> {
  const cmdMap = new Map<string, SlashCmd>();

  const cmdFiles = readdirSync(join(__dirname, '../cmds')).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of cmdFiles) {
    const cmd = require(`../cmds/${file}`).default as SlashCmd;
    if (cmd && cmd.builder && typeof cmd.execute === "function") {
      cmdMap.set(cmd.builder.name, cmd);
    } else {
      console.warn(`Command in file ${file} is missing 'builder' or 'execute' properties.`);
    }
  }
  return cmdMap;
}

export default createCmdMap;