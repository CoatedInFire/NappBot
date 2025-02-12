const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { fetchVPThreads } = require("../utils/fetchVPThreads");
const { decode } = require("html-entities");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vp")
    .setDescription("Fetches a random /vp/ thread from 4chan."),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      let threadList = await fetchVPThreads();
      if (!threadList || threadList.length === 0) {
        return interaction.editReply("❌ No active threads found on /vp/!");
      }

      function getRandomThread() {
        return threadList[Math.floor(Math.random() * threadList.length)];
      }

      let threadData = getRandomThread();

      function createEmbed(thread) {
        return new EmbedBuilder()
          .setTitle("🧵 Random /vp/ Thread")
          .setDescription(
            decode(thread.comment)
              .replace(/<br\s*\/?>/g, "\n") // Convert HTML line breaks to newlines
              .slice(0, 4096) // Ensure text doesn't exceed Discord's limit
          )
          .setColor("#FFCC00")
          .setURL(thread.threadUrl)
          .setFooter({
            text: `⭐ Thread ID: ${thread.threadId}`, // 📝 Thread ID for reference
          })
          .setImage(thread.thumbnail || null);
      }

      function createButtons() {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("🔗 View on 4chan")
            .setStyle(ButtonStyle.Link)
            .setURL(threadData.threadUrl), // Dynamically update URL
          new ButtonBuilder()
            .setCustomId("random_vp")
            .setLabel("🎲 New Random Thread")
            .setStyle(ButtonStyle.Primary)
        );
      }

      let message = await interaction.editReply({
        embeds: [createEmbed(threadData)],
        components: [createButtons()],
      });

      const filter = (i) => i.user.id === interaction.user.id;
      const collector = message.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "random_vp") {
          threadData = getRandomThread();
          await i.update({
            embeds: [createEmbed(threadData)],
            components: [createButtons()],
          });
        }
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
