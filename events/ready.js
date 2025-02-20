const { REST, Routes } = require("discord.js");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    if (!client.commands || client.commands.size === 0) {
      console.warn("⚠️ No commands found. Skipping registration.");
      return;
    }

    if (process.env.DISABLE_READY_COMMANDS === "true") {
      console.log(
        "⏭️ Skipping command registration (DISABLE_READY_COMMANDS is enabled)."
      );
      return;
    }

    try {
      console.log(`📜 Registering ${client.commands.size} commands...`);
      const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

      const commands = client.commands.map((cmd) => cmd.data.toJSON());

      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: commands,
      });

      console.log(
        `✅ Successfully registered ${client.commands.size} global commands.`
      );
    } catch (error) {
      console.error("❌ Error registering commands:", error);
    }
  },
};
