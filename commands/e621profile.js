const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { fetchE621User } = require("../utils/e621API");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("e621profile")
    .setDescription("🔎 Get a user's profile from e621.net")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("The e621 username you want to lookup")
        .setRequired(true)
    ),

  async execute(interaction) {
    const username = interaction.options.getString("username");

    await interaction.deferReply(); // Defer reply while fetching data

    let profileData;
    try {
      profileData = await fetchE621User(username);
    } catch (error) {
      console.error("❌ Error fetching e621 user:", error);
      return interaction.editReply(
        "⚠️ Failed to fetch user data. Try again later."
      );
    }

    if (!profileData) {
      return interaction.editReply("❌ User not found or API error.");
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 e621 User Profile: ${profileData.username}`)
      .setURL(`https://e621.net/users/${profileData.id}`)
      .setColor("#00549F")
      .setThumbnail("https://e621.net/static/logo.png")
      .addFields(
        {
          name: "🆔 User ID",
          value: profileData.id?.toString() || "N/A",
          inline: true,
        },
        { name: "📅 Joined", value: profileData.joined || "N/A", inline: true },
        {
          name: "📤 Uploads",
          value: profileData.uploads?.toString() || "0",
          inline: true,
        },
        {
          name: "📝 Tag Edits",
          value: profileData.tagEdits?.toString() || "0",
          inline: true,
        },
        {
          name: "❤️ Favorites",
          value: profileData.favorites?.toString() || "0",
          inline: true,
        },
        {
          name: "🔧 Notes",
          value: profileData.notes?.toString() || "0",
          inline: true,
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    await interaction.editReply({ embeds: [embed] });
  },
};
