const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserBalance, database } = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your wallet and bank balance."),
  async execute(interaction) {
    const userId = interaction.user.id;
    await database.execute(
      "UPDATE users SET active_last = NOW() WHERE user_id = ?",
      [userId]
    );

    const balanceData = await getUserBalance(userId);

    if (!balanceData) {
      return interaction.reply({
        content: "❌ Error fetching your balance.",
        ephemeral: true,
      });
    }

    const { balance, bank_balance } = balanceData;

    const embed = new EmbedBuilder()
      .setTitle("💰 Your Balance")
      .addFields(
        { name: "Wallet", value: `🪙 ${balance}`, inline: true },
        { name: "Bank", value: `🏦 ${bank_balance}`, inline: true }
      )
      .setColor("#FFD700");

    await interaction.reply({ embeds: [embed] });
  },
};
