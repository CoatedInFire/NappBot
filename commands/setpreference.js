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
    await interaction.deferReply({ ephemeral: true }); // ✅ Prevents "Already Replied" error

    const userId = interaction.user.id;
    const preference = interaction.options.getString("sex");

    try {
      const success = await setUserPreference(userId, preference);
      if (!success) {
        console.error(`❌ Failed to set preference for user ${userId}`);
        return interaction.editReply({
          content: "⚠️ Could not save your preference. Try again later.",
        });
      }

      console.log(`✅ Preference set for ${userId}: ${preference}`);
      await interaction.editReply({
        content: `✅ Your preference has been set to **${preference}**!`,
      });
    } catch (error) {
      console.error("❌ Error setting preference:", error);
      await interaction.editReply({
        content:
          "⚠️ An error occurred while saving your preference. Please try again later.",
      });
    }
  },
};
