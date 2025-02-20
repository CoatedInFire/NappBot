const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { fetchE621User, fetchE621Images } = require("../../utils/e621API");

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
    await interaction.deferReply();

    let profileData = await fetchE621User(username);
    if (!profileData) {
      return interaction.editReply("❌ User not found or API error.");
    }

    let currentView = "uploads";
    let imageData = await fetchE621Images([`user:${username}`], 3);
    if (!imageData || imageData.length === 0) {
      imageData = await fetchE621Images([`fav:${username}`], 3);
      currentView = "favorites";
    }

    function createEmbed() {
      const imagesList =
        imageData
          .map(
            (post, index) =>
              `**${index + 1}.** [Post ID: ${post.postId}](${
                post.postUrl
              }) | Score: ${post.score}`
          )
          .join("\n") || "No images found.";

      return new EmbedBuilder()
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
          {
            name: "📅 Joined",
            value: profileData.joined || "N/A",
            inline: true,
          },
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
          },
          {
            name: `🖼️ Most Recent ${
              currentView === "uploads" ? "Uploads" : "Favorites"
            }`,
            value: imagesList,
          }
        )
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });
    }

    function createActionRow() {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("toggle_view")
          .setLabel(
            `Switch to ${currentView === "uploads" ? "Favorites" : "Uploads"}`
          )
          .setStyle(ButtonStyle.Primary)
      );
    }

    const message = await interaction.editReply({
      embeds: [createEmbed()],
      components: [createActionRow()],
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      currentView = currentView === "uploads" ? "favorites" : "uploads";
      const newImages = await fetchE621Images(
        [`${currentView === "uploads" ? "user" : "fav"}:${username}`],
        3
      );

      if (newImages && newImages.length > 0) {
        imageData = newImages;
      }

      await i.update({
        embeds: [createEmbed()],
        components: [createActionRow()],
      });
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] });
    });
  },
  modulePath: __filename,
};

