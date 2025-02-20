const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("🪙 Flip a coin (Heads or Tails)"),
  async execute(interaction) {
    const outcomes = ["Heads 🪙", "Tails 🎭"];
    const result = outcomes[Math.floor(Math.random() * outcomes.length)];

    await interaction.reply(`The coin landed on **${result}**!`);
  },
};
