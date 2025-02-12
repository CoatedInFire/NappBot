module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({
        content: "❌ Command not found!",
        ephemeral: true,
      });
      return;
    }

    try {
      console.log(`⚡ Executing: ${interaction.commandName}`);
      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Error executing ${interaction.commandName}:`, error);
      await interaction.reply({
        content: "❌ An error occurred while executing this command.",
        ephemeral: true,
      });
    }
  },
};
