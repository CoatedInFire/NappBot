module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand() || !client.commands.has(interaction.commandName)) return;

    const command = client.commands?.get(interaction.commandName);
    if (!command) {
      return interaction.reply({
        content: "❌ Command not found!",
        ephemeral: true,
      });
    }

    try {
      console.log(`⚡ Executing: ${interaction.commandName}`);
      await interaction.deferReply(); // Avoids timeouts

      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Error executing ${interaction.commandName}:`, error);

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
  },
};
