module.exports = {
  name: "cmds",
  description: "List all available commands.",
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

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content:
          "⚠️ An error occurred while fetching commands. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
