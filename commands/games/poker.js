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
  updateStreak,
} = require("../../utils/database");
const PokerGame = require("../../utils/pokerGame");
const { getHandStrengthTip } = require("../../utils/pokerUtils");
const PokerAI = require("../../utils/pokerai");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poker")
    .setDescription("♠️ Start a game of Texas Hold'em Poker.")
    .addIntegerOption((option) =>
      option
        .setName("bet")
        .setDescription("Amount of money to bet")
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
    try {
      await interaction.deferReply();

      const userId = interaction.user.id;
      const betAmount = interaction.options.getInteger("bet");
      const aiCount = interaction.options.getInteger("players") || 0;
      const userBalance = await getUserBalance(userId);
      const userStreak = await getUserStreak(userId);

      if (userBalance.balance < betAmount) {
        return interaction.editReply("❌ You don't have enough money to bet!");
      }

      await updateUserBalance(userId, -betAmount, 0);

      const players = [
        { id: userId, name: interaction.user.username, balance: betAmount },
      ];
      for (let i = 0; i < aiCount; i++) {
        players.push(new PokerAI(`AI_${i + 1}`, "Exploitative"));
      }

      const game = new PokerGame(players, betAmount);

      await interaction.followUp(
        `🔥 **Current Streak:** ${userStreak} Wins in a Row!`
      );

      let gameState = await playPokerRound(interaction, game, userId);
      if (gameState === "completed") {
        await interaction.followUp("🎉 Game Over! Thanks for playing.");
      }
    } catch (error) {
      console.error("Error executing /poker command:", error);
      await interaction.reply({
        content: "❌ An error occurred while executing the command.",
        flags: InteractionFlags.EPHEMERAL,
      });
    }
  },
};

async function playPokerRound(interaction, game, userId) {
  while (game.round !== "showdown") {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🃏 **${game.round.toUpperCase()} Stage**`)
          .setDescription(`💰 **Pot:** ${game.pot}`)
          .setColor("#ffcc00"),
      ],
    });

    let result = await game.nextTurn();
    if (result?.actionRequired) {
      await handleUserTurn(interaction, result.player, game);
    }
  }

  const { id, name, bestHand } = game.showdown();
  await updateUserBalance(id, game.pot, 0);

  let tip = getHandStrengthTip(bestHand);
  let embed = new EmbedBuilder()
    .setTitle("🏆 **Poker Game Over!**")
    .setDescription(`🎉 **Winner:** ${name}`)
    .addFields(
      { name: "🃏 Best Hand", value: bestHand },
      { name: "💰 Winnings", value: `${game.pot}` },
      { name: "📌 Strategy Tip", value: tip }
    )
    .setColor(id === userId ? "#00ff00" : "#ff0000");

  await interaction.followUp({ embeds: [embed], components: [playAgainRow()] });

  const filter = (i) => i.customId === "play_again" && i.user.id === userId;
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    time: 30000,
  });

  collector.on("collect", async (i) => {
    await i.deferUpdate();
    collector.stop();
    await restartGame(i);
  });

  if (id === userId) {
    await updateStreak(userId, "win");
  } else {
    await updateStreak(userId, "loss");
  }

  return "completed";
}

async function handleUserTurn(interaction, player, game) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("check")
      .setLabel("Check")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(game.currentBet > 0),
    new ButtonBuilder()
      .setCustomId("call")
      .setLabel(`Call (${game.currentBet})`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(player.balance < game.currentBet),
    new ButtonBuilder()
      .setCustomId("raise")
      .setLabel("Raise")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("fold")
      .setLabel("Fold")
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.followUp({
    content: `${player.name}, it's your turn! Choose an action:`,
    components: [row],
  });

  const filter = (i) => i.user.id === player.id;
  try {
    const collected = await interaction.channel.awaitMessageComponent({
      filter,
      time: 30000,
    });

    let action = collected.customId;
    let amount = 0;

    if (action === "raise") {
      amount = game.currentBet * 2;
    } else if (action === "call") {
      amount = game.currentBet;
    }

    game.handleAction(player, {
      action: action,
      amount: amount,
    });

    await collected.update({
      content: `${player.name} chose **${action.toUpperCase()}**`,
      components: [],
    });
  } catch {
    game.handleAction(player, { action: "fold" });
  }
}

async function restartGame(interaction) {
  await interaction.editReply({
    content: "🔄 Restarting game...",
    components: [],
  });
  setTimeout(async () => {
    await module.exports.execute(interaction);
  }, 1000);
}

function playAgainRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("play_again")
      .setLabel("🔄 Play Again")
      .setStyle(ButtonStyle.Primary)
  );
}
