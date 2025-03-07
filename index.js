require("dotenv").config();
const {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { database } = require("./utils/database");
const { fetchWalltakerImage } = require("./utils/fetchWalltaker");
const { getE621PostId } = require("./utils/e621API");
const {
  getLastPostedImage,
  saveLastPostedImage,
} = require("./commands/utility/setwalltaker.js");

require("./server");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ Missing required environment variables!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

function getCommandFiles(dir) {
  let files = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getCommandFiles(fullPath));
    } else if (entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  });
  return files;
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  const commands = [];
  const commandFiles = getCommandFiles(path.join(__dirname, "commands"));

  for (const file of commandFiles) {
    try {
      const command = require(file);
      if (command?.data?.name && command?.execute) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
      } else {
        console.warn(`⚠️ Skipping invalid command file: ${file}`);
        if (!command?.data?.name) {
          console.warn(`   ❌ Missing data.name`);
        }
        if (!command?.execute) {
          console.warn(`   ❌ Missing execute function`);
        }
        if (command?.data && !command.data.toJSON) {
          console.warn(`   ❌ data object missing toJSON method`);
        }
      }
    } catch (error) {
      console.error(`❌ Error loading command file: ${file}`, error);
    }
  }

  console.log(`📜 Loaded ${client.commands.size} commands.`);

  try {
    console.log(`📜 Registering ${client.commands.size} commands...`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log(
      `✅ Successfully registered ${client.commands.size} global commands.`
    );
  } catch (error) {
    console.error("❌ Error registering commands:", error);
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

      const { imageUrl, sourceUrl, lastUpdatedBy } = imageData;
      const cleanImageUrl = imageUrl?.trim() || null;

      const lastPosted = await getLastPostedImage(guild_id);
      if (lastPosted === cleanImageUrl) {
        console.log(
          `✅ No new Walltaker image for guild ${guild_id}, skipping...`
        );
        continue;
      }

      console.log(
        `🆕 New Walltaker image detected for guild ${guild_id}, sending now!`
      );
      await saveLastPostedImage(guild_id, cleanImageUrl);

      const updatedByUser = lastUpdatedBy?.trim() || "anon";
      const e621PostId = await getE621PostId(cleanImageUrl);
      const e621PostUrl = e621PostId
        ? `https://e621.net/posts/${e621PostId}`
        : null;

      const embed = new EmbedBuilder()
        .setTitle(`🖼️ Walltaker Image for Feed ${feed_id}`)
        .setDescription(
          "🔄 **Automatic Detection** - A new image has been set!"
        )
        .setImage(cleanImageUrl)
        .setColor("#3498DB")
        .setFooter({
          text: `Image changed by: ${updatedByUser}`,
          iconURL: "https://cdn-icons-png.flaticon.com/512/1828/1828490.png",
        });

      const buttons = [
        new ButtonBuilder()
          .setLabel("🔗 View on Walltaker")
          .setStyle(ButtonStyle.Link)
          .setURL(sourceUrl),
      ];

      if (e621PostUrl) {
        buttons.push(
          new ButtonBuilder()
            .setLabel("🔍 View on e621")
            .setStyle(ButtonStyle.Link)
            .setURL(e621PostUrl)
        );
      }

      const row = new ActionRowBuilder().addComponents(...buttons);
      await channel.send({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(
        `❌ Error posting Walltaker image for guild ${guild_id}:`,
        error
      );
    }
  }
}

async function monitorWalltakerChanges() {
  await postWalltakerImages();
}

client.once("ready", async () => {
  console.log("✅ Bot is fully loaded and ready to go!");
  console.log("🕵️‍♂️ Starting Walltaker image monitoring...");

  setInterval(monitorWalltakerChanges, 30 * 1000);
});

(async () => {
  try {
    await database.query("SELECT 1");
    console.log("✅ Connected to MySQL!");
    await client.login(TOKEN);
    console.log("✅ Bot logged in successfully!");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});
