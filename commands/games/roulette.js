const path = require("path");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  getUserBalance,
  updateUserBalance,
  getUserStreak,
  updateUserStreak,
} = require("../../utils/database");

const rouletteWheel = [
  { number: 0, color: "green" },
  { number: 32, color: "red" },
  { number: 15, color: "black" },
  { number: 19, color: "red" },
  { number: 4, color: "black" },
  { number: 21, color: "red" },
  { number: 2, color: "black" },
  { number: 25, color: "red" },
  { number: 17, color: "black" },
  { number: 34, color: "red" },
  { number: 6, color: "black" },
  { number: 27, color: "red" },
  { number: 13, color: "black" },
  { number: 36, color: "red" },
  { number: 11, color: "black" },
  { number: 30, color: "red" },
  { number: 8, color: "black" },
  { number: 23, color: "red" },
  { number: 10, color: "black" },
  { number: 5, color: "red" },
  { number: 24, color: "black" },
  { number: 16, color: "red" },
  { number: 33, color: "black" },
  { number: 1, color: "red" },
  { number: 20, color: "black" },
  { number: 14, color: "red" },
  { number: 31, color: "black" },
  { number: 9, color: "red" },
  { number: 22, color: "black" },
  { number: 18, color: "red" },
  { number: 29, color: "black" },
  { number: 7, color: "red" },
  { number: 28, color: "black" },
  { number: 12, color: "red" },
  { number: 35, color: "black" },
  { number: 3, color: "red" },
  { number: 26, color: "black" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roulette")
    .setDescription("🎰 Play a game of roulette!")
    .addIntegerOption((option) =>
      option.setName("bet").setDescription("Amount to bet").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("bet_type")
        .setDescription("Choose your bet type")
        .setRequired(true)
        .addChoices(
          { name: "🎯 Number", value: "number" },
          { name: "🔴⚫ Color", value: "color" },
          { name: "🔢 Even/Odd", value: "even_odd" },
          { name: "⬆️⬇️ High/Low", value: "high_low" }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("Pick a number (0-36) if betting on a number")
        .setMinValue(0)
        .setMaxValue(36)
    ),

  modulePath: path.resolve(__filename),

  async execute(interaction) {
    console.log(`⚡ Executing /roulette from: ${module.exports.modulePath}`);

    const userId = interaction.user.id;
    const betAmount = interaction.options.getInteger("bet");
    const betType = interaction.options.getString("bet_type");
    const chosenNumber = interaction.options.getInteger("number");

    const balance = await getUserBalance(userId);
    if (betAmount <= 0 || betAmount > balance) {
      return interaction.reply({
        content: "❌ Invalid bet amount!",
        ephemeral: true,
      });
    }

    if (
      betType === "number" &&
      (chosenNumber === null || chosenNumber < 0 || chosenNumber > 36)
    ) {
      return interaction.reply({
        content: "❌ You must pick a valid number between 0 and 36!",
        ephemeral: true,
      });
    }

    const result =
      rouletteWheel[Math.floor(Math.random() * rouletteWheel.length)];
    const { number, color } = result;

    let won = false;
    let winnings = 0;

    switch (betType) {
      case "number":
        if (chosenNumber === number) {
          won = true;
          winnings = betAmount * 35;
        }
        break;
      case "color":
        if (
          chosenNumber === null &&
          color === (Math.random() < 0.5 ? "red" : "black")
        ) {
          won = true;
          winnings = betAmount * 2;
        }
        break;
      case "even_odd":
        if (
          number !== 0 &&
          ((chosenNumber === null && number % 2 === 0) ||
            (chosenNumber !== null && number % 2 !== 0))
        ) {
          won = true;
          winnings = betAmount * 2;
        }
        break;
      case "high_low":
        if (
          number !== 0 &&
          ((chosenNumber === null && number >= 19 && number <= 36) ||
            (chosenNumber !== null && number >= 1 && number <= 18))
        ) {
          won = true;
          winnings = betAmount * 2;
        }
        break;
    }

    // Update balance and active streak
    await updateUserBalance(userId, won ? winnings : -betAmount);

    const streak = await getUserStreak(userId);
    const newStreak = won
      ? streak >= 0
        ? streak + 1
        : 1
      : streak <= 0
      ? streak - 1
      : -1;
    await updateUserStreak(userId, newStreak);

    const embed = new EmbedBuilder()
      .setTitle("🎰 Roulette Results")
      .setDescription(
        `The wheel landed on **${number} (${color.toUpperCase()})**!`
      )
      .addFields(
        {
          name: "Your Bet",
          value: `${betType} → **${chosenNumber ?? "N/A"}**`,
          inline: true,
        },
        {
          name: "Result",
          value: won ? "✅ You won!" : "❌ You lost!",
          inline: true,
        },
        {
          name: "Payout",
          value: won ? `+${winnings} coins` : `-${betAmount} coins`,
          inline: true,
        },
        {
          name: "Streak",
          value:
            newStreak > 0
              ? `🔥 **${newStreak}-win streak!**`
              : newStreak < 0
              ? `❄️ **${Math.abs(newStreak)}-loss streak!**`
              : "😐 No streak",
          inline: false,
        }
      )
      .setColor(won ? "Green" : "Red");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("play_again")
        .setLabel("🔄 Play Again")
        .setStyle(ButtonStyle.Success)
    );

    const message = await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false,
    });

    const filter = (i) =>
      i.user.id === interaction.user.id && i.customId === "play_again";
    const collector = message.createMessageComponentCollector({
      filter,
      time: 30000,
    });

    collector.on("collect", async (i) => {
      collector.stop();
      await module.exports.execute(i);
    });

    collector.on("end", async () => {
      await message.edit({ components: [] });
    });
  },
};
