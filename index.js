require("dotenv").config();
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const { database } = require("./utils/database");
const { fetchWalltakerImage } = require("./utils/fetchWalltaker");
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
let lastPostedImages = {}; // Track last image for each guild

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
      if (!imageData || lastPostedImages[guild_id] === imageData.imageUrl) {
        console.log(`⚠️ No new Walltaker images for guild ${guild_id}`);
        continue;
      }

      lastPostedImages[guild_id] = imageData.imageUrl; // Update last posted image

      const messageContent = `🖼️ **New Walltaker Image!**\n🔗 [View on Walltaker](${imageData.sourceUrl})`;
      await channel.send({
        content: messageContent,
        files: [imageData.imageUrl],
      });

      console.log(`✅ Walltaker image posted to guild ${guild_id}`);
    } catch (error) {
      console.error(
        `❌ Error posting Walltaker image for guild ${guild_id}:`,
        error
      );
    }
  }
}

// ✅ Start automatic Walltaker posting when bot is ready
client.once("ready", async () => {
  console.log("🕵️‍♂️ Starting automated Walltaker image posting...");
  setInterval(postWalltakerImages, 10 * 60 * 1000); // Every 10 minutes
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
