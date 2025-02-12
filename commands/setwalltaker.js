const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { database } = require("../utils/database"); // Use your MySQL database

// ✅ Ensure required tables exist
async function ensureTablesExist() {
  try {
    // Walltaker Settings Table
    await database.execute(`
      CREATE TABLE IF NOT EXISTS walltaker_settings (
        guild_id VARCHAR(50) PRIMARY KEY,
        feed_id VARCHAR(50) NOT NULL,
        channel_id VARCHAR(50) NOT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    `);

    // ✅ New: Walltaker Last Posted Images Table
    await database.execute(`
      CREATE TABLE IF NOT EXISTS walltaker_last_posted (
        guild_id VARCHAR(50) PRIMARY KEY,
        image_url TEXT NOT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    `);

    console.log(
      "✅ Ensured 'walltaker_settings' and 'walltaker_last_posted' tables exist!"
    );
  } catch (error) {
    console.error("❌ Error ensuring Walltaker tables exist:", error);
  }
}
ensureTablesExist(); // Call on bot startup

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

// ✅ Fetch Last Posted Image (New Function)
async function getLastPostedImage(guildId) {
  try {
    const [rows] = await database.execute(
      "SELECT image_url FROM walltaker_last_posted WHERE guild_id = ?",
      [guildId]
    );
    return rows.length > 0 ? rows[0].image_url : null;
  } catch (error) {
    console.error("❌ MySQL Error (getLastPostedImage):", error);
    return null;
  }
}

// ✅ Save Last Posted Image (New Function)
async function saveLastPostedImage(guildId, imageUrl) {
  try {
    await database.execute(
      `INSERT INTO walltaker_last_posted (guild_id, image_url)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);`,
      [guildId, imageUrl]
    );
  } catch (error) {
    console.error("❌ MySQL Error (saveLastPostedImage):", error);
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

  // Export new functions
  getLastPostedImage,
  saveLastPostedImage,
};
