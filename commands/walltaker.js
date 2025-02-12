const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { fetchWalltakerImage } = require("../utils/fetchWalltaker");
const { database } = require("../utils/database"); // ✅ Import database

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
    await interaction.deferReply({ ephemeral: true }); // ✅ Ephemeral confirmation

    const guildId = interaction.guild.id;
    let feedId = interaction.options.getString("feed_id");
    let targetChannel = interaction.options.getChannel("channel");

    // ✅ Fetch from database if no feed ID is provided
    if (!feedId) {
      const [settings] = await database.execute(
        "SELECT feed_id, channel_id FROM walltaker_settings WHERE guild_id = ? LIMIT 1",
        [guildId]
      );

      if (!settings.length) {
        return interaction.editReply({
          content:
            "❌ No Walltaker feed is set for this server! Use `/setwalltaker` first.",
          ephemeral: true,
        });
      }

      feedId = settings[0].feed_id;
      if (!targetChannel) {
        targetChannel = await interaction.client.channels
          .fetch(settings[0].channel_id)
          .catch(() => null);
      }
    }

    // ✅ Default to command channel if database channel is invalid
    if (!targetChannel) targetChannel = interaction.channel;

    const imageData = await fetchWalltakerImage(feedId);
    if (!imageData) {
      return interaction.editReply({
        content: "❌ No image found for this Walltaker feed.",
        ephemeral: true,
      });
    }

    // ✅ Create Embed
    const embed = new EmbedBuilder()
      .setTitle(`🖼️ Walltaker Image for Feed ${feedId}`)
      .setImage(imageData.imageUrl)
      .setColor("#3498DB")
      .setFooter({
        text: `Image changed by: ${imageData.lastUpdatedBy} | Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    // ✅ Create Button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🔗 View on Walltaker")
        .setStyle(ButtonStyle.Link)
        .setURL(imageData.sourceUrl)
    );

    // ✅ Send message to the chosen channel
    await targetChannel.send({ embeds: [embed], components: [row] });

    return interaction.editReply({
      content: `✅ Image posted in ${targetChannel}.`,
      ephemeral: true,
    });
  },
};
