const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { fetchVPThreads } = require("../utils/fetchVPThreads");
const { decode } = require("html-entities"); // Decode HTML entities

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vp")
    .setDescription("Fetches a random /vp/ thread from 4chan."),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const threadList = await fetchVPThreads();
      if (!threadList || threadList.length === 0) {
        return interaction.editReply("❌ No active threads found on /vp/!");
      }

      let currentIndex = 0;
      let threadData = threadList[currentIndex];

      function createEmbed(thread) {
        return new EmbedBuilder()
          .setTitle("🧵 Random /vp/ Thread")
          .setDescription(
            decode(thread.comment)
              .replace(/<br\s*\/?>/g, "\n") // Replace HTML line breaks
              .slice(0, 4096) // Discord embed character limit
          )
          .setColor("#FFCC00")
          .setURL(thread.threadUrl)
          .setFooter({
            text: `⭐ Thread ID: ${thread.threadId}`, // 📝 Added comment for clarity
          })
          .setImage(thread.thumbnail || null);
      }

      function createButtons(index) {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("🔗 View on 4chan")
            .setStyle(ButtonStyle.Link)
            .setURL(threadList[index].threadUrl), // Update URL dynamically
          new ButtonBuilder()
            .setCustomId("prev_vp")
            .setLabel("⬅️ Previous")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(index === 0), // Disable if first thread
          new ButtonBuilder()
            .setCustomId("next_vp")
            .setLabel("➡️ Next")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(index === threadList.length - 1) // Disable if last thread
        );
      }

      let message = await interaction.editReply({
        embeds: [createEmbed(threadData)],
        components: [createButtons(currentIndex)],
      });

      const filter = (i) => i.user.id === interaction.user.id;
      const collector = message.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "next_vp") {
          currentIndex++;
        } else if (i.customId === "prev_vp") {
          currentIndex--;
        }

        threadData = threadList[currentIndex];

        await i.update({
          embeds: [createEmbed(threadData)],
          components: [createButtons(currentIndex)],
        });
      });

      collector.on("end", async () => {
        await interaction.editReply({ components: [] });
      });
    } catch (error) {
      console.error("❌ Error fetching /vp/ threads:", error);
      await interaction.editReply(
        "⚠️ An error occurred while retrieving threads. Please try again later."
      );
    }
  },
};
