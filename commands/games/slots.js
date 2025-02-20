const path = require("path");
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
    console.log(`⚡ Executing /slots from: ${module.exports.modulePath}`);

    const userId = interaction.user.id;
    let bet = interaction.options.getInteger("bet");
    let balance = await getUserBalance(userId);

    if (bet > balance) {
      return interaction.reply({
        content: "❌ You don't have enough coins!",
        ephemeral: true,
      });
    }

    const symbols = ["🍒", "🍋", "🍊", "🍉", "⭐", "💎"];
    const getRandomSymbol = () =>
      symbols[Math.floor(Math.random() * symbols.length)];

    const row1 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    const row2 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    const row3 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

    let win = row2[0] === row2[1] && row2[1] === row2[2];
    let jackpot = win && row2[0] === "💎";

    let winnings = win ? (jackpot ? bet * 10 : bet * 3) : -bet;
    await updateUserBalance(userId, winnings);

    const embed = new EmbedBuilder()
      .setTitle("🎰 Slot Machine Results")
      .setDescription(
        `
        ${row1.join(" ")}
        ${row2.join(" ")}  ⬅️
        ${row3.join(" ")}
      `
      )
      .setColor(win ? "Green" : "Red")
      .setFooter({
        text: win ? `You won ${winnings} coins!` : "Better luck next time!",
      });

    const playAgainButton = new ButtonBuilder()
      .setCustomId("play_again")
      .setLabel("🔄 Play Again")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(playAgainButton);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false,
    });

    const filter = (i) => i.user.id === userId;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 30000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "play_again") {
        await i.deferUpdate(); // Acknowledge button press
        collector.stop();
        await module.exports.execute(i); // Restart game with a fresh interaction
      }
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] });
    });
  },
};
