const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cmds")
    .setDescription("📜 List all available commands."),

  async execute(interaction, client) {
    try {
      const commands = await client.application.commands.fetch();
      if (!commands.size) {
        return interaction.reply({
          content: "❌ No commands found!",
          ephemeral: true,
        });
      }

      const commandList = commands
        .map((cmd) => `\`/${cmd.name}\` - ${cmd.description}`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📜 Available Commands")
        .setDescription(commandList)
        .setColor("#FFA500")
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("❌ Error fetching commands:", error);
      await interaction.reply({
        content: "⚠️ Failed to fetch commands. Try again later.",
        ephemeral: true,
      });
    }
  },
};
