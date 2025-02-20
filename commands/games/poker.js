const path = require("path");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  database,
  getUserBalance,
  updateUserBalance,
} = require("../../utils/database");

const POKER_STARTING_BLIND = 100;
const AI_NAMES = ["Omni", "Kaden", "Dusty", "Crayon"];
const HAND_RANKINGS = [
  "High Card",
  "One Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
  "Royal Flush",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poker")
    .setDescription("♠️ Start a game of Texas Hold'em Poker.")
    .addIntegerOption((option) =>
      option
        .setName("buy_in")
        .setDescription("Amount of money to convert into poker chips")
        .setMinValue(100)
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("players")
        .setDescription("Number of AI players (0-3)")
        .setMinValue(0)
        .setMaxValue(3)
        .setRequired(false)
    ),

  modulePath: path.resolve(__filename),

  async execute(interaction) {
    console.log(`⚡ Executing /poker from: ${module.exports.modulePath}`);

    await interaction.deferReply();

    const userId = interaction.user.id;
    const buyIn = interaction.options.getInteger("buy_in");
    const aiCount = interaction.options.getInteger("players") || 0;
    const userBalance = await getUserBalance(userId);

    if (userBalance < buyIn) {
      return interaction.editReply({
        content: "❌ You don't have enough money to buy in!",
        ephemeral: true,
      });
    }

    await updateUserBalance(userId, -buyIn);
    let players = [
      {
        id: userId,
        name: interaction.user.username,
        chips: buyIn,
        hand: [],
        folded: false,
      },
    ];

    for (let i = 0; i < aiCount; i++) {
      players.push({
        id: `AI_${i}`,
        name: AI_NAMES[i],
        chips: buyIn,
        hand: [],
        folded: false,
      });
    }

    let currentPot = 0;
    let currentBet = POKER_STARTING_BLIND;
    let currentPlayerIndex = 0;

    function dealCards() {
      players.forEach((player) => {
        player.hand = [drawCard(), drawCard()];
      });
    }

    function drawCard() {
      const suits = ["♠", "♥", "♦", "♣"];
      const values = [
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
        "A",
      ];
      return {
        suit: suits[Math.floor(Math.random() * 4)],
        value: values[Math.floor(Math.random() * 13)],
      };
    }

    function evaluateHand(hand) {
      return HAND_RANKINGS[Math.floor(Math.random() * HAND_RANKINGS.length)];
    }

    async function nextTurn() {
      let player = players[currentPlayerIndex];
      if (player.folded) {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        return nextTurn();
      }

      const embed = new EmbedBuilder()
        .setTitle("♠️ Poker Game")
        .setDescription(`${player.name}'s turn`)
        .setColor("Blurple")
        .addFields(
          { name: "Pot", value: `${currentPot} chips`, inline: true },
          { name: "Current Bet", value: `${currentBet} chips`, inline: true },
          {
            name: "Your Hand",
            value: player.hand.map((c) => `${c.value}${c.suit}`).join(" | "),
          }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("call")
          .setLabel("Call")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("raise")
          .setLabel("Raise")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("fold")
          .setLabel("Fold")
          .setStyle(ButtonStyle.Danger)
      );

      const message = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      const collector = message.createMessageComponentCollector({
        time: 30000,
      });
      collector.on("collect", async (i) => {
        if (i.user.id !== player.id)
          return i.reply({ content: "❌ Not your turn!", ephemeral: true });

        if (i.customId === "fold") {
          player.folded = true;
          await i.update({ content: `${player.name} folds.`, components: [] });
        } else if (i.customId === "call") {
          if (player.chips < currentBet) {
            return i.reply({
              content: "❌ Not enough chips to call!",
              ephemeral: true,
            });
          }
          player.chips -= currentBet;
          currentPot += currentBet;
          await i.update({ content: `${player.name} calls.`, components: [] });
        } else if (i.customId === "raise") {
          const raiseAmount = currentBet * 2;
          if (player.chips < raiseAmount) {
            return i.reply({
              content: "❌ Not enough chips to raise!",
              ephemeral: true,
            });
          }
          player.chips -= raiseAmount;
          currentPot += raiseAmount;
          currentBet = raiseAmount;
          await i.update({
            content: `${player.name} raises to ${raiseAmount}.`,
            components: [],
          });
        }

        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        if (players.filter((p) => !p.folded).length === 1) {
          return endGame();
        }
        nextTurn();
      });

      collector.on("end", () => {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        if (players.filter((p) => !p.folded).length === 1) {
          return endGame();
        }
        nextTurn();
      });
    }

    async function endGame() {
      const activePlayers = players.filter((p) => !p.folded);
      let winner =
        activePlayers[Math.floor(Math.random() * activePlayers.length)];
      const winningHand = evaluateHand(winner.hand);

      await updateUserBalance(winner.id, currentPot);

      const embed = new EmbedBuilder()
        .setTitle("🏆 Poker Game Over!")
        .setDescription(
          `${winner.name} wins the pot of ${currentPot} chips with a **${winningHand}**!`
        )
        .setColor("Gold");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("play_again")
          .setLabel("🔄 Play Again")
          .setStyle(ButtonStyle.Success)
      );

      const message = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      const collector = message.createMessageComponentCollector({
        time: 30000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "play_again" && i.user.id === userId) {
          await i.update({ content: "🔄 Restarting game...", components: [] });
          await module.exports.execute(interaction);
        }
      });

      collector.on("end", async () => {
        await message.edit({ components: [] });
      });
    }

    dealCards();
    nextTurn();
  },
};
