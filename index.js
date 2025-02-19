require("dotenv").config();
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const { database } = require("./utils/database");
const { fetchWalltakerImage } = require("./utils/fetchWalltaker");
const { getE621PostId } = require("./utils/e621API");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  getLastPostedImage,
  saveLastPostedImage,
} = require("./commands/setwalltaker.js");

require("./server");

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error("❌ Missing required environment variables!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

const { exec } = require("child_process");
console.log("🚀 Deploying commands...");
exec("node deploy-commands.js", (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Command deployment error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`⚠️ Command deployment stderr: ${stderr}`);
    return;
  }
  console.log(`✅ Command deployment output:\n${stdout}`);
});

const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js") && file !== "index.js");

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command?.data?.name) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ Skipping invalid command: ${file} - Missing 'data.name'`);
  }
}

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

async function monitorWalltakerChanges() {
  const settings = await fetchWalltakerSettings();

  for (const { guild_id, feed_id } of settings) {
    try {
      let imageData;
      try {
        imageData = await fetchWalltakerImage(feed_id);
      } catch (error) {
        console.error(
          `❌ Error fetching Walltaker image for feed ${feed_id}:`,
          error
        );
        continue;
      }

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

client.once("ready", async () => {
  console.log("✅ Bot is fully loaded and ready to go!");
  console.log("🕵️‍♂️ Starting Walltaker image monitoring...");
  setInterval(monitorWalltakerChanges, 45 * 1000);
  setInterval(postWalltakerImages, 10 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);

database
  .query("SELECT 1")
  .then(() => console.log("✅ Connected to MySQL!"))
  .catch((err) => {
    console.error("❌ MySQL Connection Error:", err);
    process.exit(1);
  });
