const { SlashCommandBuilder } = require("discord.js");
const { setUserPreference } = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setpreference")
    .setDescription("🔧 Set your sex preference.")
    .addStringOption((option) =>
      option
        .setName("sex")
        .setDescription("Choose 'male' or 'female'.")
        .setRequired(true)
        .addChoices(
          { name: "Male", value: "male" },
          { name: "Female", value: "female" }
        )
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const preference = interaction.options.getString("sex");

      const success = await setUserPreference(userId, preference);
      if (!success) {
        throw new Error("Database error");
      }

      await interaction.reply({
        content: `✅ Your preference has been set to **${preference}**!`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("❌ Error setting preference:", error);
      await interaction.reply({
        content:
          "⚠️ An error occurred while saving your preference. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
