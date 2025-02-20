const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getUserBalance, updateUserBalance } = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("higherlower")
    .setDescription("🔢 Guess if the next number is higher or lower!")
    .addIntegerOption((option) =>
      option
        .setName("bet")
        .setDescription("Amount of coins to bet")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("bet");
    let balance = await getUserBalance(userId);

    if (bet <= 0 || bet > balance) {
      return interaction.reply({
        content: "❌ Invalid bet amount!",
        ephemeral: true,
      });
    }

    let firstNumber = Math.floor(Math.random() * 100) + 1;
    let currentStreak = 0;

    async function playGame(interaction, firstNumber, bet, currentStreak) {
      const higherButton = new ButtonBuilder()
        .setCustomId("higher")
        .setLabel("⬆️ Higher")
        .setStyle(ButtonStyle.Primary);

      const lowerButton = new ButtonBuilder()
        .setCustomId("lower")
        .setLabel("⬇️ Lower")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(
        higherButton,
        lowerButton
      );

      const embed = new EmbedBuilder()
        .setTitle("🔢 Higher or Lower")
        .setDescription(
          `Your current number: **${firstNumber}**\n\nDo you think the next number will be **higher** or **lower**?`
        )
        .setColor("Gold")
        .addFields({
          name: "💰 Bet Amount",
          value: `${bet} coins`,
          inline: true,
        });

      await interaction.reply({ embeds: [embed], components: [row] });

      const filter = (i) => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 30000,
      });

      collector.on("collect", async (i) => {
        collector.stop();

        const secondNumber = Math.floor(Math.random() * 100) + 1;
        const choice = i.customId;
        let won = false;

        let winChance = currentStreak >= 3 ? 40 : 42;
        let loseChance = currentStreak >= 3 ? 51 : 49;
        let tieChance = 100 - (winChance + loseChance);

        if (bet >= 10000000) winChance = 39;

        const randomOutcome = Math.random() * 100;
        if (randomOutcome < winChance) {
          won =
            (choice === "higher" && secondNumber > firstNumber) ||
            (choice === "lower" && secondNumber < firstNumber);
        } else if (randomOutcome < winChance + loseChance) {
          won = false;
        } else {
          secondNumber = firstNumber;
        }

        const winnings = won ? bet : -bet;
        await updateUserBalance(userId, winnings);
        balance += winnings;
        currentStreak = won ? currentStreak + 1 : 0;

        const dealerComments = [
          "🎭 That was close!",
          "🤔 Interesting choice...",
          "😎 Feeling lucky?",
          "🎲 Roll the dice again?",
          "🔥 You're on a streak!",
          "💰 Time to cash out?",
        ];

        const resultEmbed = new EmbedBuilder()
          .setTitle("🔢 Higher or Lower - Result")
          .setDescription(`You bet **${bet} coins** and chose **${choice}**`)
          .addFields(
            { name: "🎲 First Number", value: `${firstNumber}`, inline: true },
            {
              name: "🎲 Second Number",
              value: `${secondNumber}`,
              inline: true,
            },
            {
              name: "🎯 Result",
              value: won
                ? "✅ You won!"
                : secondNumber === firstNumber
                ? "🤝 It's a tie!"
                : "❌ You lost!",
              inline: false,
            },
            { name: "💰 New Balance", value: `${balance} coins`, inline: true }
          )
          .setColor(
            won ? "Green" : secondNumber === firstNumber ? "Yellow" : "Red"
          )
          .setFooter({
            text: dealerComments[
              Math.floor(Math.random() * dealerComments.length)
            ],
          });

        const doubleButton = new ButtonBuilder()
          .setCustomId("double")
          .setLabel("💰 Double or Nothing")
          .setStyle(ButtonStyle.Danger);

        const cashOutButton = new ButtonBuilder()
          .setCustomId("cashout")
          .setLabel("💵 Cash Out")
          .setStyle(ButtonStyle.Success);

        const resultRow = new ActionRowBuilder().addComponents(
          doubleButton,
          cashOutButton
        );

        await i.update({
          embeds: [resultEmbed],
          components: won ? [resultRow] : [],
        });

        if (won) {
          const doubleCollector =
            interaction.channel.createMessageComponentCollector({
              filter,
              time: 30000,
            });

          doubleCollector.on("collect", async (btnInteraction) => {
            doubleCollector.stop();
            if (btnInteraction.customId === "double") {
              playGame(btnInteraction, secondNumber, bet * 2, currentStreak);
            } else {
              await btnInteraction.update({
                content: "💵 You cashed out your winnings!",
                components: [],
              });
            }
          });
        }
      });
    }

    playGame(interaction, firstNumber, bet, currentStreak);
  },
};
