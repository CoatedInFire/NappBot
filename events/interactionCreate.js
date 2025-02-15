module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (
      interaction.isChatInputCommand() ||
      interaction.isUserContextMenuCommand()
    ) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        return interaction.reply({
          content: "❌ Command not found!",
          ephemeral: true,
        });
      }

      try {
        console.log(`⚡ Executing: ${interaction.commandName}`);
        await command.execute(interaction);
      } catch (error) {
        console.error(`❌ Error executing ${interaction.commandName}:`, error);

        if (!interaction.replied) {
          if (interaction.deferred) {
            await interaction.editReply({
              content: "❌ An error occurred while executing this command.",
            });
          } else {
            await interaction.reply({
              content: "❌ An error occurred while executing this command.",
              ephemeral: true,
            });
          }
        }
      }
    }
  },
};
