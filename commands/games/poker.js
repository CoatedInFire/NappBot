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

const AI_PLAYSTYLES = {
  AGGRESSIVE: "Aggressive",
  CAUTIOUS: "Cautious",
  BALANCED: "Balanced",
};

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
        playstyle: Object.values(AI_PLAYSTYLES)[Math.floor(Math.random() * 3)],
      });
    }

    let currentPot = 0;
    let currentBet = POKER_STARTING_BLIND;
    let currentPlayerIndex = 0;
    let gameStage = 0;

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

    function getPokerTip(handRank, stage) {
      const tips = {
        "Pre-Flop": {
          "High Card":
            "You might want to fold unless you're in a late position.",
          "One Pair": "Pairs are decent, but watch for overbets.",
          "Two Pair": "You have a strong starting hand, consider raising.",
          "Three of a Kind":
            "A strong start! Raising aggressively is an option.",
        },
        Flop: {
          "High Card": "Bluffing might work, but folding is safer.",
          "One Pair": "Look for signs of an opponent’s strong hand.",
          "Two Pair": "Still strong! Consider a value bet.",
          "Three of a Kind":
            "Strong! Push the pot but don’t scare opponents away.",
        },
        Turn: {
          "High Card": "If you’re still here, consider bluffing carefully.",
          "One Pair": "Odds of improvement are low. Evaluate your position.",
          "Two Pair":
            "Good hand, but watch for potential straights or flushes.",
          "Three of a Kind": "Push more if the board isn’t dangerous.",
        },
        River: {
          "High Card": "Bluffing is risky here, but might be your only move.",
          "One Pair": "A small bet may push opponents to fold.",
          "Two Pair": "Good hand, but only bet if the board is safe.",
          "Three of a Kind": "If no threats appear, bet strong!",
        },
      };

      return tips[stage][handRank] || "Trust your instincts!";
    }

    async function nextTurn() {
      let player = players[currentPlayerIndex];
      if (player.folded) {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        return nextTurn();
      }

      let handRank = evaluateHand(player.hand);
      let pokerTip = getPokerTip(handRank, GAME_STAGES[gameStage]);

      const embed = new EmbedBuilder()
        .setTitle(`♠️ Poker - ${GAME_STAGES[gameStage]}`)
        .setDescription(`${player.name}'s turn`)
        .setColor("Blurple")
        .addFields(
          { name: "💡 Poker Tip", value: pokerTip },
          { name: "🔥 Current Streak", value: await getStreakMessage(userId) }
        );

      await interaction.editReply({ embeds: [embed] });

      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    }

    async function getStreakMessage(userId) {
      const { streak, lastResult } = await getUserStreak(userId);
      if (streak === 0) return "No active streak.";
      return lastResult === "win"
        ? `🔥 Win Streak: ${streak}`
        : `❄️ Loss Streak: ${streak}`;
    }

    async function updateStreak(userId, result) {
      const { streak, lastResult } = await getUserStreak(userId);
      if (lastResult === result) {
        await updateUserStreak(userId, streak + 1, result);
      } else {
        await updateUserStreak(userId, 1, result);
      }
    }

    dealCards();
    nextTurn();
  },
};
