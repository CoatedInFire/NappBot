const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserBalance, updateUserBalance } = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("war")
    .setDescription("⚔️ Play a game of War against the dealer!")
    .addIntegerOption((option) =>
      option
        .setName("bet")
        .setDescription("Amount of coins to bet")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("bet");

    const balance = await getUserBalance(userId);
    if (bet <= 0 || bet > balance) {
      return interaction.reply({
        content: "❌ Invalid bet amount!",
        ephemeral: true,
      });
    }

    const playerCard = Math.floor(Math.random() * 13) + 2;
    const dealerCard = Math.floor(Math.random() * 13) + 2;

    const result =
      playerCard > dealerCard
        ? "win"
        : playerCard < dealerCard
        ? "lose"
        : "tie";
    let winnings = 0;
    if (result === "win") winnings = bet;
    if (result === "lose") winnings = -bet;

    await updateUserBalance(userId, winnings);

    const embed = new EmbedBuilder()
      .setTitle("⚔️ War")
      .setDescription(`You bet **${bet} coins**`)
      .addFields(
        { name: "🎴 Your Card", value: `${playerCard}`, inline: true },
        { name: "🎴 Dealer's Card", value: `${dealerCard}`, inline: true },
        {
          name: "🎯 Result",
          value:
            result === "win"
              ? "✅ You won!"
              : result === "lose"
              ? "❌ You lost!"
              : "⚖️ It's a tie!",
          inline: false,
        }
      )
      .setColor(
        result === "win" ? "Green" : result === "lose" ? "Red" : "Yellow"
      );

    await interaction.reply({ embeds: [embed] });
  },
};
