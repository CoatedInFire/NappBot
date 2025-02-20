const path = require("path");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getUserBalance, updateUserBalance } = require("../../utils/database");

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
    ),

  modulePath: path.resolve(__filename),

  async execute(interaction) {
    console.log(`⚡ Executing /roulette from: ${module.exports.modulePath}`);

    const userId = interaction.user.id;
    const betAmount = interaction.options.getInteger("bet");

    const balance = await getUserBalance(userId);
    if (betAmount <= 0 || betAmount > balance) {
      return interaction.reply({
        content: "❌ Invalid bet amount!",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🎰 Roulette")
      .setDescription("Choose your bet type below!")
      .setColor("Gold");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("bet_number")
        .setLabel("🎯 Number")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("bet_color")
        .setLabel("🔴⚫ Color")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("bet_even_odd")
        .setLabel("🔢 Even/Odd")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("bet_high_low")
        .setLabel("⬆️⬇️ High/Low")
        .setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false,
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      let betType;
      let betValue;

      switch (i.customId) {
        case "bet_number":
          betType = "number";
          betValue = Math.floor(Math.random() * 37);
          break;
        case "bet_color":
          betType = "color";
          betValue = Math.random() < 0.5 ? "red" : "black";
          break;
        case "bet_even_odd":
          betType = "even_odd";
          betValue = Math.random() < 0.5 ? "even" : "odd";
          break;
        case "bet_high_low":
          betType = "high_low";
          betValue = Math.random() < 0.5 ? "high" : "low";
          break;
        default:
          return;
      }

      collector.stop();
      await playRoulette(i, userId, betAmount, betType, betValue);
    });

    collector.on("end", async () => {
      await message.edit({ components: [] });
    });
  },
};

async function playRoulette(interaction, userId, betAmount, betType, betValue) {
  const result =
    rouletteWheel[Math.floor(Math.random() * rouletteWheel.length)];
  const { number, color } = result;

  let won = false;
  let winnings = 0;

  switch (betType) {
    case "number":
      if (parseInt(betValue) === number) {
        won = true;
        winnings = betAmount * 35;
      }
      break;
    case "color":
      if (betValue === color) {
        won = true;
        winnings = betAmount * 2;
      }
      break;
    case "even_odd":
      if (number !== 0) {
        if (
          (betValue === "even" && number % 2 === 0) ||
          (betValue === "odd" && number % 2 !== 0)
        ) {
          won = true;
          winnings = betAmount * 2;
        }
      }
      break;
    case "high_low":
      if (number !== 0) {
        if (
          (betValue === "high" && number >= 19 && number <= 36) ||
          (betValue === "low" && number >= 1 && number <= 18)
        ) {
          won = true;
          winnings = betAmount * 2;
        }
      }
      break;
  }

  await updateUserBalance(userId, won ? winnings : -betAmount);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("play_again")
      .setLabel("🔄 Play Again")
      .setStyle(ButtonStyle.Success)
  );

  const message = await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle("🎰 Roulette Results")
        .setDescription(
          `The wheel landed on **${number} (${color.toUpperCase()})**!`
        )
        .addFields(
          {
            name: "Your Bet",
            value: `${betType} → **${betValue}**`,
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
          }
        )
        .setColor(won ? "Green" : "Red"),
    ],
    components: [row],
  });

  message
    .awaitMessageComponent({ time: 30000 })
    .then(() => module.exports.execute(interaction));
}
