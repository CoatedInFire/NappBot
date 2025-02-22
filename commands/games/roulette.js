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
          { name: "🔴 Red", value: "red" },
          { name: "⚫ Black", value: "black" },
          { name: "🔢 Even", value: "even" },
          { name: "🔢 Odd", value: "odd" },
          { name: "⬆️ High (19-36)", value: "high" },
          { name: "⬇️ Low (1-18)", value: "low" }
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
    try {
      console.log(`⚡ Executing /roulette from: ${module.exports.modulePath}`);

      const userId = interaction.user.id;
      const betAmount = interaction.options.getInteger("bet");
      const betType = interaction.options.getString("bet_type");
      const chosenNumber = interaction.options.getInteger("number");

      const balance = await getUserBalance(userId);
      if (!balance || betAmount <= 0 || betAmount > balance.balance) {
        return interaction.reply({
          content: "❌ Invalid bet amount or insufficient balance!",
          flags: InteractionFlags.EPHEMERAL,
        });
      }

      if (betType === "number" && chosenNumber === null) {
        return interaction.reply({
          content: "❌ You must pick a valid number between 0 and 36!",
          flags: InteractionFlags.EPHEMERAL,
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
        case "red":
        case "black":
          if (color === betType) {
            won = true;
            winnings = betAmount * 2;
          }
          break;
        case "even":
          if (number !== 0 && number % 2 === 0) {
            won = true;
            winnings = betAmount * 2;
          }
          break;
        case "odd":
          if (number % 2 !== 0) {
            won = true;
            winnings = betAmount * 2;
          }
          break;
        case "high":
          if (number >= 19 && number <= 36) {
            won = true;
            winnings = betAmount * 2;
          }
          break;
        case "low":
          if (number >= 1 && number <= 18) {
            won = true;
            winnings = betAmount * 2;
          }
          break;
      }

      try {
        await updateUserBalance(userId, won ? winnings : -betAmount, 0);
      } catch (error) {
        console.error("Error updating user balance:", error);
        return interaction.reply({
          content: "❌ An error occurred while updating your balance. Please try again later.",
          flags: InteractionFlags.EPHEMERAL,
        });
      }

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
        fetchReply: true,
      });

      const collector = message.createMessageComponentCollector({
        filter: (i) => i.user.id === userId && i.customId === "play_again",
        time: 30000,
      });

      collector.on("collect", async (i) => {
        await i.deferUpdate();
        collector.stop();
        await this.execute(i);
      });

      collector.on("end", async () => {
        await interaction.editReply({ components: [] });
      });
    } catch (error) {
      console.error("Error executing /roulette command:", error);
      await interaction.reply({
        content: "❌ An error occurred while executing the command.",
        flags: InteractionFlags.EPHEMERAL,
      });
    }
  },
};
