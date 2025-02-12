require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { database } = require("./utils/database");
const commands = require("./commands"); // Import SlashCommandBuilder commands
require("./server"); // Import Express server

// Ensure environment variables exist
["TOKEN", "CLIENT_ID"].forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing environment variable: ${envVar}`);
    process.exit(1);
  }
});

const token = process.env.TOKEN;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers, // ✅ Needed for .getUser()
  ],
});

// ✅ Command map (fixing outdated lookup)
const commandMap = new Map(commands.map((cmd) => [cmd.name, cmd]));

// ✅ Bot is ready
client.once("ready", () => console.log(`✅ Logged in as ${client.user.tag}`));

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return; // ✅ Supports only slash commands (fix)

  const command = commandMap.get(interaction.commandName);

  if (!command) {
    await interaction.reply({
      content: "❌ Command not found!",
      ephemeral: true,
    });
    return;
  }

  try {
    console.log(`⚡ Executing: ${interaction.commandName}`);
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    await interaction.reply({
      content: "❌ An error occurred while executing this command.",
      ephemeral: true,
    });
  }
});

client.login(token);

// ✅ Test database connection
database
  .query("SELECT 1")
  .then(() => console.log("✅ Connected to MySQL!"))
  .catch((err) => {
    console.error("❌ MySQL Connection Error:", err);
    process.exit(1);
  });
