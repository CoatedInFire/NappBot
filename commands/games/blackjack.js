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
  updateStreak,
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
    try {
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

        if (dealerTotal > 21 || playerTotal > dealerTotal) {
          result = "won 🎉";
          color = "Green";
          earnings = bet;
          await updateStreak(userId, "win");
        } else if (dealerTotal === playerTotal) {
          result = "pushed 🤝";
          color = "#808080";
          earnings = 0;
        } else {
          result = "lost 💀";
          color = "Red";
          earnings = -bet;
          await updateStreak(userId, "loss");
        }

        await updateUserBalance(userId, earnings, 0);

        let embed = new EmbedBuilder()
          .setTitle("🃏 Blackjack Result")
          .setDescription(
            `**Your Hand:** ${formatHand(playerHand)} (${playerTotal})\n` +
              `**Dealer's Hand:** ${formatHand(
                dealerHand
              )} (${dealerTotal})\n\n` +
              `**You ${result}!**\n` +
              (earnings !== 0
                ? `💰 **Earnings:** ${
                    earnings > 0 ? "+" : ""
                  }${earnings} coins\n`
                : "") +
              `🔥 **Streak:** ${await getUserStreak(userId)}`
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
        if (playerTotal === 21) {
          collector.stop();
          return dealerTurn();
        }

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
            .setStyle(ButtonStyle.Primary)
            .setDisabled(playerTotal >= 21),
          new ButtonBuilder()
            .setCustomId("stand")
            .setLabel("Stand")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("double")
            .setLabel("Double Down")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(bet * 2 > balanceData.balance || playerTotal >= 21),
          new ButtonBuilder()
            .setCustomId("split")
            .setLabel("Split")
            .setStyle(ButtonStyle.Success)
            .setDisabled(
              playerHand.length !== 2 ||
                playerHand[0].rank !== playerHand[1].rank
            )
        );

        if (interactionToUpdate.isMessageComponent()) {
          await interactionToUpdate.update({
            embeds: [embed],
            components: [row],
          });
        } else {
          await interactionToUpdate.editReply({
            embeds: [embed],
            components: [row],
          });
        }
      }

      async function restartGame(interaction) {
        await interaction.update({
          content: "🔄 Restarting game...",
          components: [],
        });
        setTimeout(async () => {
          await module.exports.execute(interaction);
        }, 1000);
      }

      const filter = (i) => i.isButton() && i.user.id === userId;
      const collector = interaction.channel.createMessageComponentCollector({
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
        } else if (i.customId === "split") {
          let splitHand = [playerHand.pop()];
          playerHand.push(drawCard(deck));
          splitHand.push(drawCard(deck));
          await playSplitHand(i, splitHand);
        } else if (i.customId === "play_again") {
          collector.stop();
          await restartGame(i);
        }
      });

      collector.on("end", async () => {
        await interaction.editReply({ components: [] });
      });

      await updateGame(interaction);
    } catch (error) {
      console.error("Error executing /blackjack command:", error);
      await interaction.reply({
        content: "❌ An error occurred while executing the command.",
        ephemeral: true,
      });
    }
  },
};

async function playSplitHand(interaction, splitHand) {
  let splitTotal = calculateHandValue(splitHand);
  let embed = new EmbedBuilder()
    .setTitle("🃏 Blackjack - Split Hand")
    .setDescription(
      `**Your Split Hand:** ${formatHand(splitHand)} (${splitTotal})\n` +
        `**Dealer's Hand:** ${dealerHand[0].rank}${dealerHand[0].suit} ?\n`
    )
    .setColor("Blue");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("hit_split")
      .setLabel("Hit")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("stand_split")
      .setLabel("Stand")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [embed],
    components: [row],
  });

  const filter = (i) => i.isButton() && i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    time: 60000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "hit_split") {
      splitHand.push(drawCard(deck));
      splitTotal = calculateHandValue(splitHand);
      if (splitTotal > 21) {
        collector.stop();
        await dealerTurn();
      } else {
        await playSplitHand(i, splitHand);
      }
    } else if (i.customId === "stand_split") {
      collector.stop();
      await dealerTurn();
    } else if (i.customId === "play_again") {
      collector.stop();
      await restartGame(i);
    }
  });

  collector.on("end", async () => {
    await interaction.editReply({ components: [] });
  });
}
