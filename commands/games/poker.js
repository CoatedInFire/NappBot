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
  updateUserStreak,
} = require("../../utils/database");
const { evaluateHand, determineWinner } = require("../../utils/pokerUtils");

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
    await interaction.deferReply({ flags: InteractionFlags.EPHEMERAL });

    const userId = interaction.user.id;
    const buyIn = interaction.options.getInteger("buy_in");
    const aiCount = interaction.options.getInteger("players") || 0;
    const userBalance = await getUserBalance(userId);

    if (!userBalance || userBalance.balance < buyIn) {
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
      const betAmount = Math.min(player.chips, amount);
      player.chips -= betAmount;
      pot += betAmount;
      return betAmount;
    }

    async function bettingRound() {
      for (let player of players) {
        if (player.folded) continue;

        if (player.playstyle === "Human") {
          const handEmbed = new EmbedBuilder()
            .setTitle("Your Hand")
            .setDescription(
              player.hand.map((card) => `${card.value}${card.suit}`).join(" ")
            );

          await interaction.followUp({
            embeds: [handEmbed],
            flags: InteractionFlags.EPHEMERAL,
          });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("call")
              .setLabel("Call")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId("raise")
              .setLabel("Raise")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("fold")
              .setLabel("Fold")
              .setStyle(ButtonStyle.Danger)
          );

          await interaction.editReply({
            content: `${player.name}, it's your turn! Choose an action:`,
            components: [row],
            fetchReply: true,
          });

          const filter = (i) => i.user.id === userId;
          const collected = await interaction.channel.awaitMessageComponent({
            filter,
            time: 30000,
          });

          if (collected) {
            if (collected.customId === "call") {
              placeBet(player, currentBet);
            } else if (collected.customId === "raise") {
              placeBet(player, currentBet * 2);
              currentBet *= 2;
            } else if (collected.customId === "fold") {
              player.folded = true;
            }

            await collected.update({
              content: `${
                player.name
              } chose ${collected.customId.toUpperCase()}`,
              components: [],
            });
          } else {
            await interaction.editReply({
              content: `${player.name} ran out of time!`,
              components: [],
            });
            player.folded = true;
          }
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
        if (gameStage === 0) {
          communityCards.push(drawCard(), drawCard(), drawCard());
        } else {
          communityCards.push(drawCard());
        }
        gameStage++;
        currentBet = POKER_STARTING_BLIND;
        players.forEach((p) => (p.currentBet = 0));

        const communityEmbed = new EmbedBuilder()
          .setTitle(`Community Cards - ${GAME_STAGES[gameStage]}`)
          .setDescription(
            communityCards.map((card) => `${card.value}${card.suit}`).join(" ")
          );
        await interaction.followUp({ embeds: [communityEmbed] });

        await bettingRound();
      } else {
        const { winner, evaluatedHands } = determineWinner(
          players,
          communityCards
        ); // Call determineWinner

        if (winner) {
          winner.chips += pot;
          if (winner.id === interaction.user.id) {
            await updateUserBalance(userId, pot, 0);
            await updateUserStreak(userId, "win");
          } else {
            await updateUserStreak(userId, "loss");
          }

          const embed = new EmbedBuilder()
            .setTitle("♠️ Poker Game Over")
            .setDescription(
              `🏆 Winner: **${winner.name}** with **${
                winner.handRanking || "Unknown"
              }**!`
            ) // Use winner.handRanking or a default
            .addFields(
              { name: "💰 Pot", value: `${pot} Chips`, inline: true },
              {
                name: "Player Chips",
                value: players.map((p) => `${p.name}: ${p.chips}`).join("\n"),
                inline: true,
              },
              {
                name: "Community Cards",
                value: communityCards
                  .map((c) => `${c.value}${c.suit}`)
                  .join(" "),
                inline: true,
              },
              {
                name: "Hands Played",
                value: evaluatedHands
                  .map((h) => `${h.player}: ${h.hand} (${h.ranking})`)
                  .join("\n"),
              }
            )
            .setColor("Gold");

          await interaction.editReply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setTitle("♠️ Poker Game Over")
            .setDescription("No winner. All players folded or it's a tie.")
            .addFields(
              { name: "💰 Pot", value: `${pot} Chips`, inline: true },
              {
                name: "Player Chips",
                value: players.map((p) => `${p.name}: ${p.chips}`).join("\n"),
                inline: true,
              },
              {
                name: "Community Cards",
                value: communityCards
                  .map((c) => `${c.value}${c.suit}`)
                  .join(" "),
                inline: true,
              },
              {
                name: "Hands Played",
                value: evaluatedHands
                  .map((h) => `${h.player}: ${h.hand} (${h.ranking})`)
                  .join("\n"),
              }
            )
            .setColor("Gold");
          await interaction.editReply({ embeds: [embed] });
        }
      }
    }

    async function determineWinner() {
      let bestHand = null;
      let winner = null;
      const evaluatedHands = [];

      for (const player of players) {
        if (!player.folded) {
          const hand = [...player.hand, ...communityCards];
          const handRank = evaluateHand(hand);
          evaluatedHands.push({
            player: player.name,
            hand: hand.map((c) => `${c.value}${c.suit}`).join(" "),
            ranking: handRank,
          });

          if (
            !bestHand ||
            HAND_RANKINGS.indexOf(handRank) > HAND_RANKINGS.indexOf(bestHand)
          ) {
            bestHand = handRank;
            winner = player;
          }
        }
      }

      if (winner) {
        winner.chips += pot;
        if (winner.id === interaction.user.id) {
          await updateUserBalance(userId, pot, 0);
          await updateUserStreak(userId, "win");
        } else {
          await updateUserStreak(userId, "loss");
        }

        const embed = new EmbedBuilder()
          .setTitle("♠️ Poker Game Over")
          .setDescription(`🏆 Winner: **${winner.name}** with **${bestHand}**!`)
          .addFields(
            { name: "💰 Pot", value: `${pot} Chips`, inline: true },
            {
              name: "Player Chips",
              value: players.map((p) => `${p.name}: ${p.chips}`).join("\n"),
              inline: true,
            },
            {
              name: "Community Cards",
              value: communityCards.map((c) => `${c.value}${c.suit}`).join(" "),
              inline: true,
            },
            {
              name: "Hands Played",
              value: evaluatedHands
                .map((h) => `${h.player}: ${h.hand} (${h.ranking})`)
                .join("\n"),
            }
          )
          .setColor("Gold");

        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle("♠️ Poker Game Over")
          .setDescription("No winner. All players folded or it's a tie.")
          .addFields(
            { name: "💰 Pot", value: `${pot} Chips`, inline: true },
            {
              name: "Player Chips",
              value: players.map((p) => `${p.name}: ${p.chips}`).join("\n"),
              inline: true,
            },
            {
              name: "Community Cards",
              value: communityCards.map((c) => `${c.value}${c.suit}`).join(" "),
              inline: true,
            },
            {
              name: "Hands Played",
              value: evaluatedHands
                .map((h) => `${h.player}: ${h.hand} (${h.ranking})`)
                .join("\n"),
            }
          )
          .setColor("Gold");
        await interaction.editReply({ embeds: [embed] });
      }
    }

    dealCards();
    await nextStage();
  },
};
