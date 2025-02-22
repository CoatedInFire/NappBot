const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  getUserBalance,
  getUserStreak,
  database,
} = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your wallet and bank balance."),

  async execute(interaction) {
    const userId = interaction.user.id;

    try {
      await database.execute(
        "UPDATE users SET active_last = NOW() WHERE user_id = ?",
        [userId]
      );

      const balanceData = await getUserBalance(userId);
      const streak = await getUserStreak(userId);

      if (!balanceData) {
        return interaction.reply({
          content: "❌ Error fetching your balance.",
          ephemeral: true,
        });
      }

      const { balance, bank_balance } = balanceData;

      let streakText = "😐 No streak";
      if (streak > 0) {
        streakText = `🔥 **${streak}-win streak!**`;
      } else if (streak < 0) {
        streakText = `❄️ **${Math.abs(streak)}-loss streak!**`;
      }

      const embed = new EmbedBuilder()
        .setTitle("💰 Your Balance")
        .addFields(
          { name: "Wallet", value: `🪙 ${balance}`, inline: true },
          { name: "Bank", value: `🏦 ${bank_balance}`, inline: true },
          { name: "🔥 Streak", value: streakText, inline: false }
        )
        .setColor("#FFD700");

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error executing balance command:", error);
      await interaction.reply({
        content: "❌ An error occurred while fetching your balance.",
        ephemeral: true,
      });
    }
  },
};
