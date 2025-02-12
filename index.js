require("dotenv").config();
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const { database } = require("./utils/database");
const { fetchWalltakerImage } = require("./utils/fetchWalltaker");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

require("./server"); // Express Server

// Ensure required environment variables
["TOKEN", "CLIENT_ID"].forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing environment variable: ${envVar}`);
    process.exit(1);
  }
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers, // Needed for user lookups
  ],
});

// ✅ Load commands from /commands and store them in client.commands
client.commands = new Collection();
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ Skipping invalid command file: ${file}`);
  }
}

// ✅ Load events from /events and register them
const eventFiles = fs
  .readdirSync("./events")
  .filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// ✅ Walltaker Auto-Posting Setup
let lastPostedImages = {}; // Tracks last image per guild
let lastCheckImages = {}; // Tracks last image seen per guild

async function fetchWalltakerSettings() {
  try {
    const [rows] = await database.execute("SELECT * FROM walltaker_settings;");
    return rows;
  } catch (error) {
    console.error("❌ MySQL Error (fetchWalltakerSettings):", error);
    return [];
  }
}

async function postWalltakerImages() {
  const settings = await fetchWalltakerSettings();

  for (const { guild_id, feed_id, channel_id } of settings) {
    try {
      const channel = await client.channels.fetch(channel_id);
      if (!channel) {
        console.error(`❌ Walltaker: Channel not found for guild ${guild_id}`);
        continue;
      }

      const imageData = await fetchWalltakerImage(feed_id);
      if (!imageData) {
        console.log(
          `⚠️ No image found in Walltaker feed for guild ${guild_id}`
        );
        continue;
      }

      const { imageUrl, sourceUrl } = imageData;

      // ✅ Check if image is new
      if (lastPostedImages[guild_id] !== imageUrl) {
        console.log(
          `🆕 New Walltaker image detected for guild ${guild_id}, sending now!`
        );

        lastPostedImages[guild_id] = imageUrl; // Update last posted image

        // ✅ Create Embed
        const embed = new EmbedBuilder()
          .setTitle(`🖼️ Walltaker Image for Feed ${feed_id}`)
          .setImage(imageUrl)
          .setColor("#3498DB");

        // ✅ Create Button
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("🔗 View on Walltaker")
            .setStyle(ButtonStyle.Link)
            .setURL(sourceUrl)
        );

        await channel.send({ embeds: [embed], components: [row] });
      } else {
        console.log(
          `✅ No new Walltaker image for guild ${guild_id}, skipping...`
        );
      }

      // ✅ Update last seen image to detect changes quickly
      lastCheckImages[guild_id] = imageUrl;
    } catch (error) {
      console.error(
        `❌ Error posting Walltaker image for guild ${guild_id}:`,
        error
      );
    }
  }
}

// ✅ Monitor for new Walltaker images
async function monitorWalltakerChanges() {
  const settings = await fetchWalltakerSettings();

  for (const { guild_id, feed_id } of settings) {
    try {
      const imageData = await fetchWalltakerImage(feed_id);
      if (!imageData) continue;

      const { imageUrl } = imageData;

      if (lastCheckImages[guild_id] !== imageUrl) {
        console.log(
          `🚨 Change detected in Walltaker feed ${feed_id} for guild ${guild_id}, posting immediately!`
        );
        await postWalltakerImages();
      }
    } catch (error) {
      console.error(`❌ Error checking Walltaker feed ${feed_id}:`, error);
    }
  }
}

// ✅ Start automatic Walltaker posting when bot is ready
client.once("ready", async () => {
  console.log("🕵️‍♂️ Starting Walltaker image monitoring...");

  // ✅ Check for changes every 30 seconds (faster detection)
  setInterval(monitorWalltakerChanges, 30 * 1000);

  // ✅ Full image check every 10 minutes (backup in case of missed changes)
  setInterval(postWalltakerImages, 10 * 60 * 1000);
});

// ✅ Log in
client.login(process.env.TOKEN);

// ✅ Test database connection
database
  .query("SELECT 1")
  .then(() => console.log("✅ Connected to MySQL!"))
  .catch((err) => {
    console.error("❌ MySQL Connection Error:", err);
    process.exit(1);
  });
