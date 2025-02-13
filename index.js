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
const {
  getLastPostedImage,
  saveLastPostedImage,
} = require("./commands/setwalltaker.js");

require("./server"); // Express Server

// Ensure required environment variables
if (!process.env.DISCORD_TOKEN) {
  console.error(`❌ Missing environment variable: DISCORD_TOKEN`);
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error(`❌ Missing environment variable: CLIENT_ID`);
  process.exit(1);
}

const client = new Client({
  intents: [
    // ... your intents
  ],
});

client.commands = new Collection();

client.once("ready", async () => {
  console.log("✅ Bot is fully loaded and ready to go!");

  const commands = require("./commands");

  commands.forEach((command) => {
    if (command && command.data && command.data.name) {
      // Check if command.data exists
      client.commands.set(command.data.name, command);
    } else {
      console.warn("⚠️ Invalid command exported:", command); // Log the invalid command
    }
  });

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

  let lastPostedImages = {};
  let lastCheckImages = {};

  async function fetchWalltakerSettings() {
    try {
      const [rows] = await database.execute(
        "SELECT * FROM walltaker_settings;"
      );
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
          console.error(
            `❌ Walltaker: Channel not found for guild ${guild_id}`
          );
          continue;
        }

        const imageData = await fetchWalltakerImage(feed_id);
        if (!imageData) {
          console.log(
            `⚠️ No image found in Walltaker feed for guild ${guild_id}`
          );
          continue;
        }

        const { imageUrl, sourceUrl, lastUpdatedBy } = imageData;
        const cleanImageUrl = imageUrl ? imageUrl.trim() : null;

        // ✅ Fetch last posted image from MySQL
        const lastPosted = await getLastPostedImage(guild_id);

        // ✅ Check if image is new
        if (!lastPosted || lastPosted !== cleanImageUrl) {
          console.log(
            `🆕 New Walltaker image detected for guild ${guild_id}, sending now!`
          );

          await saveLastPostedImage(guild_id, cleanImageUrl);
          lastPostedImages[guild_id] = cleanImageUrl;

          // ✅ Determine the user who changed the image
          const updatedByUser =
            lastUpdatedBy && lastUpdatedBy.trim() !== ""
              ? lastUpdatedBy
              : "anon";

          // ✅ Create Embed
          const embed = new EmbedBuilder()
            .setTitle(`🖼️ Walltaker Image for Feed ${feed_id}`)
            .setDescription(
              "🔄 **Automatic Detection** - A new image has been set!"
            )
            .setImage(cleanImageUrl)
            .setColor("#3498DB")
            .setFooter({
              text: `Image changed by: ${updatedByUser}`,
              iconURL:
                "https://cdn-icons-png.flaticon.com/512/1828/1828490.png",
            });

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
      } catch (error) {
        console.error(
          `❌ Error posting Walltaker image for guild ${guild_id}:`,
          error
        );
      }
    }
  }

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

  console.log("🕵️‍♂️ Starting Walltaker image monitoring...");
  setInterval(monitorWalltakerChanges, 30 * 1000);
  setInterval(postWalltakerImages, 10 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);

database
  .query("SELECT 1")
  .then(() => {
    console.log("✅ Connected to MySQL!");
    console.log("✅ Bot is fully loaded and ready to go!"); // Final confirmation
  })
  .catch((err) => {
    console.error("❌ MySQL Connection Error:", err);
    process.exit(1);
  });
