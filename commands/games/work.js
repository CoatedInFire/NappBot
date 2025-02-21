const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  getUserBalance,
  updateUserBalance,
  database,
} = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("💼 Work a shift and earn some coins!"),

  async execute(interaction) {
    const userId = interaction.user.id;

    const cooldownResult = await database.execute(
      "SELECT last_work FROM users WHERE user_id = ?",
      [userId]
    );

    const lastWorkTime = await getUserLastWork(userId);
    const cooldown = 10 * 60 * 1000;
    const now = Date.now();

    if (lastWorkTime && now - new Date(lastWorkTime).getTime() < cooldown) {
      const remainingTime = Math.ceil(
        (cooldown - (now - new Date(lastWorkTime).getTime())) / 60000
      );
      return interaction.reply({
        content: `❌ You need to wait **${remainingTime} minutes** before working again!`,
        ephemeral: true,
      });
    }

    await updateUserLastWork(userId);

    const earnings = Math.floor(Math.random() * (10000 - 2000 + 1)) + 2000;
    await updateUserBalance(userId, earnings);

    await database.execute(
      "UPDATE users SET last_work = NOW() WHERE user_id = ?",
      [userId]
    );

    const workMessages = [
      `👷 You worked as a **construction worker** and earned **🪙 ${earnings} coins**!`,
      `📦 You delivered some packages and made **🪙 ${earnings} coins**!`,
      `💻 You did some freelance programming and got paid **🪙 ${earnings} coins**!`,
      `🚗 You drove for a rideshare company and earned **🪙 ${earnings} coins**!`,
      `🎨 You sold some artwork and made **🪙 ${earnings} coins**!`,
      `🍔 You worked at a fast food place and got **🪙 ${earnings} coins**!`,
      `🎶 You performed on the street and received **🪙 ${earnings} coins**!`,
      `🔧 You fixed someone's car and got paid **🪙 ${earnings} coins**!`,
    ];

    const message =
      workMessages[Math.floor(Math.random() * workMessages.length)];

    const embed = new EmbedBuilder()
      .setTitle("💼 Work Complete!")
      .setDescription(message)
      .setColor("#00FF00");

    await interaction.reply({ embeds: [embed] });
  },
};
