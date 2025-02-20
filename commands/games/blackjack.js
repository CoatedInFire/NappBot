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
    .setName("blackjack")
    .setDescription("🃏 Play a game of blackjack!")
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

    const deck = generateDeck();
    let playerHand = [drawCard(deck), drawCard(deck)];
    let dealerHand = [drawCard(deck), drawCard(deck)];

    function calculateHandValue(hand) {
      let value = hand.reduce((sum, card) => sum + card.value, 0);
      let aces = hand.filter((card) => card.rank === "A").length;
      while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
      }
      return value;
    }

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

    function formatHand(hand) {
      return hand.map((card) => `${card.rank}${card.suit}`).join(" ");
    }

    async function endGame(result) {
      let embed = new EmbedBuilder()
        .setTitle("🃏 Blackjack - Game Over")
        .setDescription(
          `**Your Hand:** ${formatHand(playerHand)} (${calculateHandValue(
            playerHand
          )})\n**Dealer's Hand:** ${formatHand(
            dealerHand
          )} (${calculateHandValue(dealerHand)})`
        )
        .setColor(result.color)
        .setFooter({ text: `You ${result.text}! ${result.earnings} coins` });

      await interaction.editReply({ embeds: [embed], components: [] });
      await updateUserBalance(userId, result.earnings);
    }

    async function dealerTurn() {
      while (calculateHandValue(dealerHand) < 17) {
        dealerHand.push(drawCard(deck));
      }

      let playerTotal = calculateHandValue(playerHand);
      let dealerTotal = calculateHandValue(dealerHand);

      if (dealerTotal > 21 || playerTotal > dealerTotal) {
        await endGame({ text: "win", color: "Green", earnings: bet });
      } else if (dealerTotal > playerTotal) {
        await endGame({ text: "lose", color: "Red", earnings: -bet });
      } else {
        await endGame({ text: "tie", color: "Yellow", earnings: 0 });
      }
    }

    async function updateGame(interaction) {
      let playerTotal = calculateHandValue(playerHand);
      if (playerTotal > 21) {
        return endGame({ text: "busted", color: "Red", earnings: -bet });
      }

      let embed = new EmbedBuilder()
        .setTitle("🃏 Blackjack")
        .setDescription(
          `**Your Hand:** ${formatHand(
            playerHand
          )} (${playerTotal})\n**Dealer's Hand:** ${dealerHand[0].rank}${
            dealerHand[0].suit
          } ?`
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
          .setDisabled(bet > balance)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    }

    const message = await interaction.reply({
      content: "🃏 Dealing cards...",
      ephemeral: false,
      fetchReply: true,
    });
    updateGame(interaction);

    const filter = (i) => i.user.id === userId;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "hit") {
        playerHand.push(drawCard(deck));
      } else if (i.customId === "stand") {
        collector.stop();
        return dealerTurn();
      } else if (i.customId === "double") {
        bet *= 2;
        playerHand.push(drawCard(deck));
        collector.stop();
        return dealerTurn();
      }
      await updateGame(i);
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] });
    });
  },
};
