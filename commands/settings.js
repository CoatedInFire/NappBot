const { getUserPreference, setUserPreference } = require("../utils/database");

module.exports = {
  name: "settings",
  description: "View your saved settings.",
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const preference = await getUserPreference(userId);

      const embed = new EmbedBuilder()
        .setTitle("⚙️ Your Settings")
        .setDescription(`**Sex Preference:** ${preference}`)
        .setColor("#3498db")
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await interaction.reply({
        content:
          "⚠️ An error occurred while fetching your settings. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
