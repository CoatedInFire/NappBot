const path = require("path");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionFlags,
} = require("discord.js");
const {
  getUserBalance,
  updateUserBalance,
  getUserStreak,
  updateUserStreak,
} = require("../../utils/database");

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
    if (!balance || bet <= 0 || bet > balance.balance) {
      return interaction.reply({
        content: "❌ Invalid bet amount or insufficient balance!",
        flags: InteractionFlags.EPHEMERAL,
      });
    }

    await playWar(interaction, userId, bet);
  },
};

async function playWar(interaction, userId, bet) {
  const suits = ["♠️", "♥️", "♦️", "♣️"];
  const getRandomCard = () => ({
    value: Math.floor(Math.random() * 13) + 2,
    suit: suits[Math.floor(Math.random() * suits.length)],
  });

  const playerCard = getRandomCard();
  const dealerCard = getRandomCard();

  const result =
    playerCard.value > dealerCard.value
      ? "win"
      : playerCard.value < dealerCard.value
      ? "lose"
      : "tie";

  let winnings = 0;
  if (result === "win") winnings = bet;
  if (result === "lose") winnings = -bet;

  if (result !== "tie") await updateUserBalance(userId, winnings, 0);

  const streak = await getUserStreak(userId);
  let newStreak = streak ? streak : 0;

  switch (result) {
    case "win":
      newStreak = newStreak >= 0 ? newStreak + 1 : 1;
      break;
    case "lose":
      newStreak = newStreak <= 0 ? newStreak - 1 : -1;
      break;
    case "tie":
      break;
  }

  await updateUserStreak(userId, newStreak);

  const tips = {
    win: [
      "🔥 Keep up the streak! Maybe raise your bet?",
      "✅ Winning is great! But don't push your luck too hard!",
      "💡 If you're on a streak, consider stopping at a set goal.",
    ],
    lose: [
      "❌ Bad luck! Maybe lower your bet to recover?",
      "📉 Losing streak? Take a break or change your strategy!",
      "🤔 If you're losing often, think about pacing your bets.",
    ],
    tie: [
      "⚖️ A tie! Consider playing again for a better outcome.",
      "🤝 A tie means nobody wins. Will you go for another round?",
      "🔄 No loss, no win. Maybe this is your chance to go big?",
    ],
  };

  const embed = new EmbedBuilder()
    .setTitle("⚔️ War")
    .setDescription(`You bet **${bet} coins**`)
    .addFields(
      {
        name: "🎴 Your Card",
        value: `${playerCard.value} ${playerCard.suit}`,
        inline: true,
      },
      {
        name: "🎴 Dealer's Card",
        value: `${dealerCard.value} ${dealerCard.suit}`,
        inline: true,
      },
      {
        name: "🎯 Result",
        value:
          result === "win"
            ? "✅ You won!"
            : result === "lose"
            ? "❌ You lost!"
            : "⚖️ It's a tie!",
        inline: false,
      },
      {
        name: "💰 Payout",
        value:
          result === "win"
            ? `+${winnings} coins`
            : result === "lose"
            ? `-${bet} coins`
            : "0 coins",
        inline: true,
      },
      {
        name: "🔥 Streak",
        value:
          newStreak > 0
            ? `🔥 **${newStreak}-win streak!**`
            : newStreak < 0
            ? `❄️ **${Math.abs(newStreak)}-loss streak!**`
            : "😐 No streak",
        inline: true,
      },
      {
        name: "💡 Tip",
        value: tips[result][Math.floor(Math.random() * tips[result].length)],
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
    fetchReply: true,
  });

  const filter = (i) =>
    i.user.id === userId && i.customId === `play_again_${userId}`;
  const collector = message.createMessageComponentCollector({
    filter,
    time: 30000,
  });

  collector.on("collect", async (i) => {
    await i.deferUpdate();
    collector.stop();

    await i.editReply({ content: "🔄 Restarting game...", components: [] });

    setTimeout(async () => {
      await playWar(interaction, userId, bet);
    }, 1000);
  });

  collector.on("end", async () => {
    await interaction.editReply({ components: [] });
  });
}
