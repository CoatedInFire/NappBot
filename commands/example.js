module.exports = {
  data: new SlashCommandBuilder()
    .setName("example")
    .setDescription("Example command"),
  async execute(interaction) {
    await interaction.reply("Example command executed!");
  },
  modulePath: __filename,
};
