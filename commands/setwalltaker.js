const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { database } = require("../utils/database"); // Use your MySQL database

// Ensure the Walltaker settings table exists
async function ensureTableExists() {
  try {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS walltaker_settings (
        guild_id VARCHAR(50) PRIMARY KEY,
        feed_id VARCHAR(50) NOT NULL,
        channel_id VARCHAR(50) NOT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    `);
    console.log("✅ Ensured 'walltaker_settings' table exists!");
  } catch (error) {
    console.error("❌ Error ensuring Walltaker table exists:", error);
  }
}
ensureTableExists(); // Call it when the bot starts

// ✅ Set Walltaker settings in MySQL
async function setWalltakerSettings(guildId, feedId, channelId) {
  try {
    await database.execute(
      `INSERT INTO walltaker_settings (guild_id, feed_id, channel_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE feed_id = VALUES(feed_id), channel_id = VALUES(channel_id);`,
      [guildId, feedId, channelId]
    );
    return true;
  } catch (error) {
    console.error("❌ MySQL Error (setWalltakerSettings):", error);
    return false;
  }
}

// ✅ Fetch Walltaker settings for a guild
async function getWalltakerSettings(guildId) {
  try {
    const [rows] = await database.execute(
      "SELECT feed_id, channel_id FROM walltaker_settings WHERE guild_id = ?",
      [guildId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("❌ MySQL Error (getWalltakerSettings):", error);
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setwalltaker")
    .setDescription(
      "📌 Set the Walltaker feed ID and channel for auto-posting."
    )
    .addStringOption((option) =>
      option
        .setName("feed_id")
        .setDescription("Enter the Walltaker Feed ID.")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Select the channel to post images in.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // Restrict to admins

  async execute(interaction) {
    const feedId = interaction.options.getString("feed_id");
    const channel = interaction.options.getChannel("channel");
    const guildId = interaction.guild.id;

    const success = await setWalltakerSettings(guildId, feedId, channel.id);
    if (success) {
      await interaction.reply(
        `✅ Walltaker settings updated!\n🔗 **Feed ID:** ${feedId}\n📢 **Channel:** ${channel}`
      );
    } else {
      await interaction.reply(
        "❌ Failed to save Walltaker settings. Try again."
      );
    }
  },
};
