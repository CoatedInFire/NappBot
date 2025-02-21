const path = require("path");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  InteractionFlags,
} = require("discord.js");
const {
  getUserBalance,
  updateUserBalance,
  getUserStreak,
  updateWinStreak,
  updateLossStreak,
  markUserActive,
} = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("🃏 Play a game of blackjack!")
    .addIntegerOption((option) =>
      option
        .setName("bet")
        .setDescription("The amount of coins to bet")
        .setRequired(true)
        .setMinValue(10)
    ),

  modulePath: path.resolve(__filename),

  async execute(interaction) {
    console.log(`⚡ Executing /blackjack from: ${module.exports.modulePath}`);

    const userId = interaction.user.id;
    let bet = interaction.options.getInteger("bet");
    let balanceData = await getUserBalance(userId);
    let streakData = await getUserStreak(userId);

    if (!balanceData || bet > balanceData.balance) {
      return interaction.reply({
        content: "❌ You don't have enough coins!",
        flags: InteractionFlags.EPHEMERAL,
      });
    }

    await markUserActive(userId);

    const deck = generateDeck();
    let playerHand = [drawCard(deck), drawCard(deck)];
    let dealerHand = [drawCard(deck), drawCard(deck)];

    function generateDeck() {
      const suits = ["♠", "♥", "♦", "♣"];
      const ranks = [
        "A",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
      ];
      return suits.flatMap((suit) =>
        ranks.map((rank) => ({
          suit,
          rank,
          value: rank === "A" ? 11 : isNaN(rank) ? 10 : parseInt(rank),
        }))
      );
    }

    function drawCard(deck) {
      return deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
    }

    function calculateHandValue(hand) {
      let value = hand.reduce((sum, card) => sum + card.value, 0);
      let aces = hand.filter((card) => card.rank === "A").length;
      while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
      }
      return value;
    }

    function formatHand(hand) {
      return hand.map((card) => `${card.rank}${card.suit}`).join(" ");
    }

    async function dealerTurn() {
      let dealerTotal = calculateHandValue(dealerHand);
      while (dealerTotal < 17) {
        dealerHand.push(drawCard(deck));
        dealerTotal = calculateHandValue(dealerHand);
      }

      let playerTotal = calculateHandValue(playerHand);
      let result;
      let color;
      let earnings = 0;
      let newStreak = { wins: 0, losses: 0 };

      if (dealerTotal > 21 || playerTotal > dealerTotal) {
        result = "won 🎉";
        color = "Green";
        earnings = bet;
        newStreak.wins = (streakData.wins || 0) + 1;
      } else if (dealerTotal === playerTotal) {
        result = "pushed 🤝";
        color = "Gray";
      } else {
        result = "lost 💀";
        color = "Red";
        earnings = -bet;
        newStreak.losses = (streakData.losses || 0) + 1;
      }

      await updateUserBalance(userId, earnings, 0);

      if (earnings > 0) {
        await updateWinStreak(userId, newStreak.wins);
      } else if (earnings < 0) {
        await updateLossStreak(userId, newStreak.losses);
      }

      let embed = new EmbedBuilder()
        .setTitle("🃏 Blackjack Result")
        .setDescription(
          `**Your Hand:** ${formatHand(playerHand)} (${playerTotal})\n` +
            `**Dealer's Hand:** ${formatHand(
              dealerHand
            )} (${dealerTotal})\n\n` +
            `**You ${result}!**\n` +
            (earnings !== 0
              ? `💰 **Earnings:** ${earnings > 0 ? "+" : ""}${earnings} coins\n`
              : "") +
            `🔥 **Win Streak:** ${newStreak.wins} | ❄️ **Loss Streak:** ${newStreak.losses}`
        )
        .setColor(color);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("play_again")
          .setLabel("Play Again")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    }

    let initialEmbed = new EmbedBuilder()
      .setTitle("🃏 Blackjack")
      .setDescription("🃏 Dealing cards...");

    const message = await interaction.reply({
      embeds: [initialEmbed],
      components: [],
      fetchReply: true,
    });

    async function updateGame(interactionToUpdate) {
      let playerTotal = calculateHandValue(playerHand);
      if (playerTotal > 21) return dealerTurn();

      let embed = new EmbedBuilder()
        .setTitle("🃏 Blackjack")
        .setDescription(
          `**Your Hand:** ${formatHand(playerHand)} (${playerTotal})\n` +
            `**Dealer's Hand:** ${dealerHand[0].rank}${dealerHand[0].suit} ?\n`
        )
        .setColor("Blue");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("hit")
          .setLabel("Hit")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("stand")
          .setLabel("Stand")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("double")
          .setLabel("Double Down")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(bet * 2 > balanceData.balance)
      );

      await interactionToUpdate.update({ embeds: [embed], components: [row] });
    }

    const filter = (i) => i.user.id === userId;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "hit") {
        playerHand.push(drawCard(deck));
        if (calculateHandValue(playerHand) > 21) {
          collector.stop();
          await dealerTurn();
        } else {
          await updateGame(i);
        }
      } else if (i.customId === "stand") {
        collector.stop();
        await dealerTurn();
      } else if (i.customId === "double") {
        bet *= 2;
        playerHand.push(drawCard(deck));
        collector.stop();
        await dealerTurn();
      } else if (i.customId === "play_again") {
        await execute(i);
      }
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] });
    });

    await updateGame(interaction);
  },
};
