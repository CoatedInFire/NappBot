const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { fetchWalltakerImage } = require("../utils/fetchWalltaker");

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
    const targetChannel = interaction.options.getChannel("channel") || interaction.channel; // Default to the command channel

    const imageData = await fetchWalltakerImage(feedId);

    if (!imageData) {
      return interaction.editReply("❌ No image found for this Walltaker feed.");
    }

    // Create Embed
    const embed = new EmbedBuilder()
      .setTitle(`🖼️ Walltaker Image for Feed ${feedId}`)
      .setImage(imageData.imageUrl)
      .setColor("#3498DB")
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

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
