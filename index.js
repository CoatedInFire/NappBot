require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { database } = require("./database");
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
  const command = commandMap.get(interaction.commandName);
  if (!command)
    return interaction.reply({
      content: "❌ Command not found!",
      ephemeral: true,
    });

  try {
    console.log(`⚡ Executing: ${interaction.commandName}`);
    if (typeof command.execute === "function")
      await command.execute(interaction);
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
