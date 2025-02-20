const path = require("path");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
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

  modulePath: path.resolve(__filename),

  async execute(interaction) {
    console.log(`⚡ Executing /war from: ${module.exports.modulePath}`);

    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("bet");

    const balance = await getUserBalance(userId);
    if (bet <= 0 || bet > balance) {
      return interaction.reply({
        content: "❌ Invalid bet amount!",
        ephemeral: true,
      });
    }

    await playWar(interaction, userId, bet);
  },
};

async function playWar(interaction, userId, bet) {
  const playerCard = Math.floor(Math.random() * 13) + 2;
  const dealerCard = Math.floor(Math.random() * 13) + 2;

  const result =
    playerCard > dealerCard ? "win" : playerCard < dealerCard ? "lose" : "tie";

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

  const playAgainButton = new ButtonBuilder()
    .setCustomId(`play_again_${userId}`)
    .setLabel("🔄 Play Again")
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(playAgainButton);

  const message = await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: false,
  });

  const filter = (i) => i.user.id === userId;
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    time: 30000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === `play_again_${userId}`) {
      collector.stop();
      await i.update({ content: "🔄 Restarting game...", components: [] });

      setTimeout(async () => {
        await playWar(interaction, userId, bet);
      }, 1000);
    }
  });

  collector.on("end", async () => {
    await interaction.editReply({ components: [] });
  });
}
