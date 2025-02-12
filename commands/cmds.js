const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cmds")
    .setDescription("List all available commands."),

  async execute(interaction) {
    try {
      if (!interaction.client.application) {
        return interaction.reply({
          content: "❌ Application commands are not available.",
          ephemeral: true,
        });
      }

      const commands = await interaction.client.application.commands.fetch();

      if (!commands.size) {
        return interaction.reply({
          content: "⚠️ No commands found.",
          ephemeral: true,
        });
      }

      const commandList = commands
        .map((cmd) => `\`/${cmd.name}\` - ${cmd.description}`)
        .join("\n");

      await interaction.reply({
        content: `📜 **Available Commands:**\n${commandList}`,
        ephemeral: true, // You can change this to `false` if you want everyone to see it
      });
    } catch (error) {
      console.error("❌ Error fetching commands:", error);
      await interaction.reply({
        content: "⚠️ Failed to retrieve commands.",
        ephemeral: true,
      });
    }
  },
};
