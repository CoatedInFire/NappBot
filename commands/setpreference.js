const { setUserPreference } = require("../utils/database");

module.exports = {
  name: "setpreference",
  description: "Set your sex preference.",
  options: [
    {
      name: "sex",
      type: 3, // String
      description: "Choose 'male' or 'female'.",
      required: true,
    },
  ],
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const preference = interaction.options.getString("sex");

      if (!["male", "female"].includes(preference)) {
        return interaction.reply({
          content: "❌ Invalid preference! Please choose 'male' or 'female'.",
          ephemeral: true,
        });
      }

      const success = await setUserPreference(userId, preference);
      if (!success) {
        throw new Error("Database error");
      }

      await interaction.reply({
        content: `✅ Your preference has been set to **${preference}**!`,
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content:
          "⚠️ An error occurred while saving your preference. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
