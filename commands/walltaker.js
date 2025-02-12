const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { fetchWalltakerImage } = require("../utils/fetchWalltaker");
const { database } = require("../utils/database"); // Ensure database is imported

module.exports = {
  data: new SlashCommandBuilder()
    .setName("walltaker")
    .setDescription("🖼️ Fetch the latest image from Walltaker.")
    .addStringOption((option) =>
      option
        .setName("feed_id")
        .setDescription("Enter a specific Walltaker feed ID (optional)")
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to send the image (optional)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply(); // Defer while fetching

    const feedId = interaction.options.getString("feed_id") || "33359"; // Default feed ID
    let targetChannel = interaction.options.getChannel("channel");

    // If no channel is specified, fetch from database
    if (!targetChannel) {
      const [settings] = await database.execute(
        "SELECT channel_id FROM walltaker_settings WHERE guild_id = ? LIMIT 1",
        [interaction.guild.id]
      );

      if (!settings.length) {
        return interaction.editReply(
          "❌ No Walltaker channel is set for this server!"
        );
      }

      targetChannel = await interaction.client.channels.fetch(
        settings[0].channel_id
      );
      if (!targetChannel) {
        return interaction.editReply(
          "❌ The saved Walltaker channel is invalid or missing permissions!"
        );
      }
    }

    const imageData = await fetchWalltakerImage(feedId);

    if (!imageData) {
      return interaction.editReply(
        "❌ No image found for this Walltaker feed."
      );
    }

    // Create Embed
    const embed = new EmbedBuilder()
      .setTitle(`🖼️ Walltaker Image for Feed ${feedId}`)
      .setImage(imageData.imageUrl)
      .setColor("#3498DB")
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    // Create Button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🔗 View on Walltaker")
        .setStyle(ButtonStyle.Link)
        .setURL(imageData.sourceUrl)
    );

    // Send message to the chosen channel
    await targetChannel.send({ embeds: [embed], components: [row] });

    return interaction.editReply(`✅ Image posted in ${targetChannel}.`);
  },
};
