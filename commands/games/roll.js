const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("🎲 Roll a random number (default 1-100, customizable)")
    .addIntegerOption((option) =>
      option.setName("min").setDescription("Minimum number").setRequired(false)
    )
    .addIntegerOption((option) =>
      option.setName("max").setDescription("Maximum number").setRequired(false)
    ),
  async execute(interaction) {
    const min = interaction.options.getInteger("min") ?? 1;
    const max = interaction.options.getInteger("max") ?? 100;

    if (min >= max) {
      return interaction.reply({
        content: "❌ The minimum must be less than the maximum.",
        ephemeral: true,
      });
    }

    const roll = Math.floor(Math.random() * (max - min + 1)) + min;
    await interaction.reply(
      `🎲 You rolled a **${roll}** (Range: ${min}-${max})`
    );
  },
};
