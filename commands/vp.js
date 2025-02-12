const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { fetchVPThreads } = require("../utils/fetchVPThreads"); // Ensure this function exists

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
      const threadData = threadList[currentIndex];

      const embed = new EmbedBuilder()
        .setTitle("🧵 Random /vp/ Thread")
        .setDescription(threadData.comment)
        .setColor("#FFCC00")
        .setURL(threadData.threadUrl)
        .setFooter({ text: `Thread ID: ${threadData.threadId}` });

      if (threadData.thumbnail) {
        embed.setImage(threadData.thumbnail);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("🔗 View on 4chan")
          .setStyle(ButtonStyle.Link)
          .setURL(threadData.threadUrl),
        new ButtonBuilder()
          .setCustomId("prev_vp")
          .setLabel("⬅️ Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true), // Initially disabled
        new ButtonBuilder()
          .setCustomId("next_vp")
          .setLabel("➡️ Next")
          .setStyle(ButtonStyle.Primary)
      );

      const message = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      // Button Interaction Collector
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

        const newThreadData = threadList[currentIndex];

        const updatedEmbed = new EmbedBuilder()
          .setTitle("🧵 Random /vp/ Thread")
          .setDescription(newThreadData.comment)
          .setColor("#FFCC00")
          .setURL(newThreadData.threadUrl)
          .setFooter({ text: `Thread ID: ${newThreadData.threadId}` });

        if (newThreadData.thumbnail) {
          updatedEmbed.setImage(newThreadData.thumbnail);
        }

        row.components[1].setDisabled(currentIndex === 0); // Disable 'Previous' on first
        row.components[2].setDisabled(currentIndex === threadList.length - 1); // Disable 'Next' on last

        await i.update({ embeds: [updatedEmbed], components: [row] });
      });

      collector.on("end", async () => {
        row.components[1].setDisabled(true);
        row.components[2].setDisabled(true);
        await interaction.editReply({ components: [row] });
      });
    } catch (error) {
      console.error("❌ Error fetching /vp/ threads:", error);
      await interaction.editReply(
        "⚠️ An error occurred while retrieving threads. Please try again later."
      );
    }
  },
};
