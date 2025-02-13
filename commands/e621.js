const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { fetchE621Images } = require("../utils/e621API");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("e621")
    .setDescription("🔞 Search for images on e621.net")
    .setDMPermission(true)
    .addStringOption((option) =>
      option
        .setName("tags")
        .setDescription("Enter search tags separated by spaces (optional)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const sender = interaction.user;
    const tags = interaction.options.getString("tags")?.split(" ") || [];

    if (tags.length === 0) {
      tags.push("score:>=100"); // Fetch top-rated posts
    }

    await interaction.deferReply();

    let postDataArray;
    try {
      postDataArray = await fetchE621Images(tags, 10);
    } catch (error) {
      console.error("❌ Error fetching e621 data:", error);
      return interaction.editReply("⚠️ Failed to fetch data. Try again later.");
    }

    if (!postDataArray || postDataArray.length === 0) {
      return interaction.editReply("❌ No results found!");
    }

    let currentIndex = 0;
    let timeout; // Timeout reference

    function createEmbed(postData) {
      return new EmbedBuilder()
        .setTitle("🔞 e621 Image Result")
        .setDescription(
          `**Artist(s):** ${
            postData.artists && postData.artists.length
              ? postData.artists.join(", ")
              : "*Unknown*"
          }\n` +
            `**Characters:** ${
              postData.characters && postData.characters.length
                ? postData.characters.join(", ")
                : "*Unknown*"
            }`
        )
        .setColor("#00549F")
        .setImage(
          postData.imageUrl && postData.imageUrl.endsWith(".webm")
            ? postData.thumbnail
            : postData.imageUrl
        )
        .setFooter({
          text: `⭐ Score: ${postData.score} | ❤️ Favorites: ${postData.favCount} | 📌 Post ID: ${postData.postId}\nRequested by ${sender.tag}`,
          iconURL: sender.displayAvatarURL(),
        });
    }

    function createRow() {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("🔗 View on e621")
          .setStyle(ButtonStyle.Link)
          .setURL(postDataArray[currentIndex].postUrl),
        new ButtonBuilder()
          .setCustomId(`prev_${interaction.id}`)
          .setLabel("⬅️ Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentIndex === 0),
        new ButtonBuilder()
          .setCustomId(`next_${interaction.id}`)
          .setLabel("➡️ Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentIndex === postDataArray.length - 1)
      );
    }

    const message = await interaction.editReply({
      embeds: [createEmbed(postDataArray[currentIndex])],
      components: [createRow()],
    });

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 90000, // 1.5 minutes
    });

    function resetTimeout() {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        collector.stop(); // Stop collector after timeout
      }, 90000);
    }

    resetTimeout(); // Start the timeout initially

    collector.on("collect", async (i) => {
      if (i.customId === `next_${interaction.id}`) {
        currentIndex = Math.min(currentIndex + 1, postDataArray.length - 1);
      } else if (i.customId === `prev_${interaction.id}`) {
        currentIndex = Math.max(currentIndex - 1, 0);
      }

      await i.update({
        embeds: [createEmbed(postDataArray[currentIndex])],
        components: [createRow()],
      });

      resetTimeout(); // Refresh the timeout on every button press
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] });
    });
  },
};
