const path = require("path");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  getUserBalance,
  updateUserBalance,
  getUserStreak,
  updateUserStreak,
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

const AI_PLAYSTYLES = ["Aggressive", "Cautious", "Balanced"];
const GAME_STAGES = ["Pre-Flop", "Flop", "Turn", "River"];

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
    await interaction.deferReply();
    const userId = interaction.user.id;
    const buyIn = interaction.options.getInteger("buy_in");
    const aiCount = interaction.options.getInteger("players") || 0;
    const userBalance = await getUserBalance(userId);

    if (userBalance.balance < buyIn) {
      return interaction.editReply("❌ You don't have enough money to buy in!");
    }

    await updateUserBalance(userId, -buyIn, 0);

    let players = [
      {
        id: userId,
        name: interaction.user.username,
        chips: buyIn,
        hand: [],
        folded: false,
        playstyle: "Human",
      },
    ];

    for (let i = 0; i < aiCount; i++) {
      players.push({
        id: `AI_${i}`,
        name: AI_NAMES[i],
        chips: buyIn,
        hand: [],
        folded: false,
        playstyle:
          AI_PLAYSTYLES[Math.floor(Math.random() * AI_PLAYSTYLES.length)],
      });
    }

    let pot = 0;
    let currentBet = POKER_STARTING_BLIND;
    let communityCards = [];
    let gameStage = 0;

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

    function dealCards() {
      players.forEach((player) => {
        player.hand = [drawCard(), drawCard()];
      });
    }

    function evaluateHand(hand) {
      return HAND_RANKINGS[Math.floor(Math.random() * HAND_RANKINGS.length)];
    }

    function placeBet(player, amount) {
      if (player.chips < amount) {
        player.folded = true;
        return 0;
      }
      player.chips -= amount;
      pot += amount;
      return amount;
    }

    async function bettingRound() {
      for (let player of players) {
        if (player.folded) continue;

        if (player.playstyle === "Human") {
          await interaction.editReply(
            `${player.name}, it's your turn! Type **call**, **raise**, or **fold**.`
          );
          return;
        } else {
          if (player.playstyle === "Aggressive") {
            placeBet(player, currentBet * 2);
          } else if (player.playstyle === "Cautious") {
            if (Math.random() < 0.5) player.folded = true;
            else placeBet(player, currentBet);
          } else {
            placeBet(player, currentBet);
          }
        }
      }
    }

    async function nextStage() {
      if (gameStage < 3) {
        communityCards.push(drawCard());
        if (gameStage === 0) communityCards.push(drawCard(), drawCard());
        gameStage++;
        await bettingRound();
      } else {
        await determineWinner();
      }
    }

    async function determineWinner() {
      let bestHand = null;
      let winner = null;

      players.forEach((player) => {
        if (!player.folded) {
          let handRank = evaluateHand([...player.hand, ...communityCards]);
          if (
            !bestHand ||
            HAND_RANKINGS.indexOf(handRank) > HAND_RANKINGS.indexOf(bestHand)
          ) {
            bestHand = handRank;
            winner = player;
          }
        }
      });

      if (winner) {
        winner.chips += pot;
        if (winner.id === userId) {
          await updateUserBalance(userId, pot, 0);
          await updateUserStreak(userId, "win");
        } else {
          await updateUserStreak(userId, "loss");
        }

        const embed = new EmbedBuilder()
          .setTitle("♠️ Poker Game Over")
          .setDescription(`🏆 Winner: **${winner.name}** with **${bestHand}**!`)
          .addFields({ name: "💰 Pot", value: `${pot} Chips` })
          .setColor("Gold");

        await interaction.editReply({ embeds: [embed] });
      }
    }

    dealCards();
    await nextStage();
  },
};
