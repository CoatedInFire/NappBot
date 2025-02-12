module.exports = {
  data: {
    name: "cmds",
    description: "List all available commands.",
  },
  async execute(interaction) {
    try {
      // Ensure the client is ready before using application commands
      if (!interaction.client.application) {
        return interaction.reply({
          content: "❌ Application commands are not available.",
          ephemeral: true,
        });
      }

      // Fetch registered commands
      const commands = await interaction.client.application.commands.fetch();

      if (!commands.size) {
        return interaction.reply({
          content: "⚠️ No commands found.",
          ephemeral: true,
        });
      }

      // Create a response message listing all commands
      const commandList = commands
        .map((cmd) => `\`/${cmd.name}\` - ${cmd.description}`)
        .join("\n");

      await interaction.reply({
        content: `📜 **Available Commands:**\n${commandList}`,
        ephemeral: true, // Use flags instead later
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
