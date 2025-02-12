const { REST, Routes } = require("discord.js");
require("dotenv").config();

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Ensure commands are valid before mapping
    const commands = client.commands
      .map((cmd) => {
        if (!cmd.data || typeof cmd.data.toJSON !== "function") {
          console.error(`⚠️ Skipping invalid command:`, cmd);
          return null;
        }
        return cmd.data.toJSON();
      })
      .filter(Boolean); // Remove null values

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    try {
      console.log("⚡ Registering slash commands...");
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log("✅ Slash commands updated!");
    } catch (error) {
      console.error("❌ Failed to update commands:", error);
    }
  },
};
