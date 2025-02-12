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

    const profileData = await fetchE621User(username);
    if (!profileData) {
      return interaction.editReply("❌ User not found or API error.");
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 e621 User Profile: ${profileData.username}`)
      .setURL(`https://e621.net/users/${profileData.id}`)
      .setColor("#00549F")
      .setThumbnail("https://e621.net/static/logo.png")
      .addFields(
        { name: "🆔 User ID", value: profileData.id.toString(), inline: true },
        { name: "📅 Joined", value: profileData.joined, inline: true },
        {
          name: "📤 Uploads",
          value: profileData.uploads.toString(),
          inline: true,
        },
        {
          name: "📝 Tag Edits",
          value: profileData.tagEdits.toString(),
          inline: true,
        },
        {
          name: "❤️ Favorites",
          value: profileData.favorites.toString(),
          inline: true,
        },
        { name: "🔧 Notes", value: profileData.notes.toString(), inline: true }
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    await interaction.editReply({ embeds: [embed] });
  },
};
