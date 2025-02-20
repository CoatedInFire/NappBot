const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("🏓 Pings the bot and shows the latency."),
  async execute(interaction) {
    await interaction.reply({
      content: `🏓 Pong! Latency: ${
        Date.now() - interaction.createdTimestamp
      }ms`,
      ephemeral: true,
    });
  },
  modulePath: __filename,
};
