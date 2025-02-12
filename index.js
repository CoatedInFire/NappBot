require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { database } = require("./utils/database");
const commands = require("./commands");
require("./server"); // Import Express server

// Ensure environment variables
["TOKEN", "CLIENT_ID"].forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing environment variable: ${envVar}`);
    process.exit(1);
  }
});

const token = process.env.TOKEN;
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});
const commandMap = new Map(commands.map((cmd) => [cmd.name, cmd]));

client.once("ready", () => console.log(`✅ Logged in as ${client.user.tag}`));

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = commands.find((cmd) => cmd.name === interaction.commandName);

  if (!command) {
    await interaction.reply({
      content: "❌ Command not found!",
      ephemeral: true,
    });
    return;
  }

  try {
    console.log(`⚡ Executing: ${interaction.commandName}`);

    // TEMP FIX: Make the bot reply with a placeholder response
    await interaction.reply({
      content: `✅ Command received: **${interaction.commandName}**`,
      ephemeral: true,
    });
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    await interaction.reply({
      content: "❌ An error occurred!",
      ephemeral: true,
    });
  }
});

client.login(token);

database
  .query("SELECT 1")
  .then(() => console.log("✅ Connected to MySQL!"))
  .catch((err) => {
    console.error("❌ MySQL Connection Error:", err);
    process.exit(1);
  });
