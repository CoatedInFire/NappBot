const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserPreference } = require("../../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("⚙️ View your saved settings."),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const preference = await getUserPreference(userId);

      const embed = new EmbedBuilder()
        .setTitle("⚙️ Your Settings")
        .setDescription(
          `**Sex Preference:** ${preference ? preference : "Not set"}`
        )
        .setColor("#3498db")
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("❌ Error fetching user settings:", error);
      await interaction.reply({
        content:
          "⚠️ An error occurred while fetching your settings. Please try again later.",
        ephemeral: true,
      });
    }
  },
  modulePath: __filename,
};
