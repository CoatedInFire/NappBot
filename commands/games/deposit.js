const { SlashCommandBuilder } = require("discord.js");
const {
  getUserBalance,
  updateUserBalance,
  database,
} = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Deposit money into your bank account.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount to deposit")
        .setRequired(true)
    ),
  async execute(interaction) {
    const userId = interaction.user.id;
    const amount = interaction.options.getInteger("amount");

    if (amount <= 0) {
      return interaction.reply({
        content: "❌ You must deposit a **positive** amount.",
        ephemeral: true,
      });
    }

    try {
      const balanceData = await getUserBalance(userId);

      if (!balanceData) {
        return interaction.reply({
          content: "❌ Error fetching your balance. Please try again later.",
          ephemeral: true,
        });
      }

      if (balanceData.balance < amount) {
        return interaction.reply({
          content: `❌ You don't have enough money! Your wallet balance is **🪙 ${balanceData.balance}**.`,
          ephemeral: true,
        });
      }

      await updateUserBalance(userId, -amount, amount);
      await database.execute(
        "UPDATE users SET active_last = NOW() WHERE user_id = ?",
        [userId]
      );

      await interaction.reply({
        content: `✅ **Deposited 🪙 ${amount}** into your bank account!\n\n📊 **New Balances:**\n- Wallet: 🪙 **${
          balanceData.balance - amount
        }**\n- Bank: 🏦 **${balanceData.bank_balance + amount}**`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error executing deposit command:", error);
      await interaction.reply({
        content:
          "❌ An error occurred while processing your deposit. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
