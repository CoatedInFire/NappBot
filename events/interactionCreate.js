module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      return interaction.reply({
        content: "❌ Command not found!",
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Error executing ${interaction.commandName}:`, error);
      await interaction
        .reply({
          content: "❌ An error occurred while executing this command.",
          ephemeral: true,
        })
        .catch(() =>
          interaction.editReply({ content: "❌ An error occurred." })
        );
    }
  },
};
