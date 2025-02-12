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
    .addStringOption((option) =>
      option
        .setName("tags")
        .setDescription("Enter search tags separated by spaces")
        .setRequired(false)
    ),

  async execute(interaction) {
    const sender = interaction.user;
    const tags = interaction.options.getString("tags")?.split(" ") || [];

    await interaction.deferReply(); // Defer reply while fetching data

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

    // Function to create an embed from postData
    function createEmbed(postData) {
      return new EmbedBuilder()
        .setTitle("🔞 e621 Image Result")
        .setDescription(
          `**Artist(s):** ${
            postData.artists.length ? postData.artists.join(", ") : "N/A"
          }\n` +
            `**Characters:** ${
              postData.characters.length
                ? postData.characters.join(", ")
                : "N/A"
            }`
        )
        .setColor("#00549F")
        .setImage(
          postData.imageUrl.endsWith(".webm")
            ? postData.thumbnail
            : postData.imageUrl
        )
        .setFooter({
          text: `⭐ Score: ${postData.score} | ❤️ Favorites: ${postData.favCount} | 📌 Post ID: ${postData.postId}\nRequested by ${sender.tag}`,
          iconURL: sender.displayAvatarURL(),
        });
    }

    // Function to create action buttons
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

    // Button Interaction Collector
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 60000,
    });

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

      // Stop collector if at first or last image
      if (currentIndex === 0 || currentIndex === postDataArray.length - 1) {
        collector.stop();
      }
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] }); // Removes buttons when interaction expires
    });
  },
};
