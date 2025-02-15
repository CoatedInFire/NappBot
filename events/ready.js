module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📜 Loaded ${client.commands.size} commands.`);
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
    console.log("✅ Bot is fully operational.");
  },
};
