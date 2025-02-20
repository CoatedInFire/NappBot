const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserBalance, updateUserBalance } = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("🎰 Spin the slot machine!")
    .addIntegerOption((option) =>
      option
        .setName("bet")
        .setDescription("The amount of coins to bet")
        .setRequired(true)
        .setMinValue(10)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    let bet = interaction.options.getInteger("bet");
    let balance = await getUserBalance(userId);

    if (bet > balance) {
      return interaction.reply({
        content: "❌ You don't have enough coins!",
        ephemeral: true,
      });
    }

    const symbols = ["🍒", "🍋", "🍊", "🍉", "⭐", "💎"];
    const getRandomSymbol = () =>
      symbols[Math.floor(Math.random() * symbols.length)];

    const row1 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    const row2 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    const row3 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

    let win = row2[0] === row2[1] && row2[1] === row2[2];
    let jackpot = win && row2[0] === "💎";

    let winnings = win ? (jackpot ? bet * 10 : bet * 3) : -bet;
    await updateUserBalance(userId, winnings);

    const embed = new EmbedBuilder()
      .setTitle("🎰 Slot Machine Results")
      .setDescription(
        `
        ${row1.join(" ")}
        ${row2.join(" ")}  ⬅️
        ${row3.join(" ")}
      `
      )
      .setColor(win ? "Green" : "Red")
      .setFooter({
        text: win ? `You won ${winnings} coins!` : "Better luck next time!",
      });

    return interaction.reply({ embeds: [embed] });
  },
};
