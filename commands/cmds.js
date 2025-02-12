const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cmds")
    .setDescription("List all available commands."),
  async execute(interaction) {
    try {
      // Check if application commands are available
      if (!interaction.client.application) {
        return interaction.reply({
          content: "❌ Application commands are not available.",
          ephemeral: true,
        });
      }

      // Fetch registered commands from Discord (optional)
      const registeredCommands =
        await interaction.client.application.commands.fetch();

      // Read commands from the local `commands/` directory
      const commandsPath = path.join(__dirname, "../commands"); // Adjust if needed
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));

      const commandList = commandFiles
        .map((file) => {
          const command = require(path.join(commandsPath, file));
          return `\`/${command.data.name}\` - ${command.data.description}`;
        })
        .join("\n");

      // Embed message
      const embed = new EmbedBuilder()
        .setTitle("📜 Available Commands")
        .setColor("#F1C40F")
        .setDescription(commandList)
        .setFooter({ text: `Total Commands: ${commandFiles.length}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (error) {
      console.error("❌ Error displaying commands:", error);
      await interaction.reply({
        content: "⚠️ Failed to retrieve commands.",
        ephemeral: true,
      });
    }
  },
};
