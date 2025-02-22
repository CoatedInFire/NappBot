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
} = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("🎰 Spin the slot machine!")
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
      console.log(`⚡ Executing /slots from: ${module.exports.modulePath}`);

      const userId = interaction.user.id;
      const bet = interaction.options.getInteger("bet");
      const balance = await getUserBalance(userId);

      if (!balance || bet > balance.balance) {
        return interaction.reply({
          content: "❌ You don't have enough coins!",
          flags: InteractionFlags.EPHEMERAL,
        });
      }

      const symbols = ["🍒", "🍋", "🍊", "🍉", "⭐", "💎"];
      const getRandomSymbol = () =>
        symbols[Math.floor(Math.random() * symbols.length)];

      const row1 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
      const row2 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
      const row3 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

      const win = row2[0] === row2[1] && row2[1] === row2[2];
      const jackpot = win && row2[0] === "💎";

      let winnings = win ? (jackpot ? bet * 10 : bet * 3) : -bet;
      await updateUserBalance(userId, winnings, 0);

      const streak = (await getUserStreak(userId)) || 0;
      const newStreak = win
        ? streak >= 0
          ? streak + 1
          : 1
        : streak <= 0
        ? streak - 1
        : -1;

      await updateStreak(userId, win ? "win" : "loss");

      const embed = new EmbedBuilder()
        .setTitle("🎰 Slot Machine Results")
        .setDescription(
          `
          ${row1.join(" ")}
          ${row2.join(" ")}  ⬅️
          ${row3.join(" ")}
          `
        )
        .setColor(win ? "Green" : "Red")
        .addFields(
          {
            name: "Result",
            value: win ? "✅ You won!" : "❌ You lost!",
            inline: true,
          },
          {
            name: "Payout",
            value: win ? `+${winnings} coins` : `-${bet} coins`,
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
        .setFooter({
          text: win ? `You won ${winnings} coins!` : "Better luck next time!",
        });

      const playAgainButton = new ButtonBuilder()
        .setCustomId("play_again")
        .setLabel("🔄 Play Again")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(playAgainButton);

      const message = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });

      const filter = (i) => i.user.id === userId && i.customId === "play_again";
      const collector = message.createMessageComponentCollector({
        filter,
        time: 30000,
      });

      async function restartGame(interaction) {
        await interaction.editReply({ content: "🔄 Restarting game...", components: [] });
        setTimeout(async () => {
          await module.exports.execute(interaction);
        }, 1000);
      }

      collector.on("collect", async (i) => {
        await i.deferUpdate();
        collector.stop();
        await restartGame(i);
      });

      collector.on("end", async () => {
        await interaction.editReply({ components: [] });
      });
    } catch (error) {
      console.error("Error executing /slots command:", error);
      await interaction.reply({
        content: "❌ An error occurred while executing the command.",
        flags: InteractionFlags.EPHEMERAL,
      });
    }
  },
};
