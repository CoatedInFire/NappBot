const { REST, Routes } = require("discord.js");
require("dotenv").config();

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const commands = client.commands.map((cmd) => cmd.data.toJSON());

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
    try {
      console.log("⚡ Registering slash commands...");
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log("✅ Slash commands updated!");
    } catch (error) {
      console.error("❌ Failed to update commands:", error);
    }
  },
};
