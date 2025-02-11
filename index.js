require("dotenv").config();

const { URL } = require("node:url");

// Ensure MYSQL_PUBLIC_URL is defined before creating the URL object
const dbUrl = process.env.MYSQL_PUBLIC_URL
  ? new URL(process.env.MYSQL_PUBLIC_URL)
  : null;

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const mysql = require("mysql2/promise");
const fetch = require("node-fetch");
const express = require("express");

const app = express();

// Create a Discord Client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildIntegrations,
  ],
});

// Confirm that environment variables are loaded
if (!process.env.MYSQL_PUBLIC_URL) {
  console.warn("⚠️ Warning: MYSQL_PUBLIC_URL is not defined in .env");
}

// 1. MySQL Connection Pool (Conditional)
let pool;

if (dbUrl) {
  pool = mysql.createPool({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port, 10),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.substring(1),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  async function testConnection() {
    try {
      const connection = await pool.getConnection();
      console.log("Successfully connected to MySQL database!");
      connection.release();
    } catch (error) {
      console.error("Error connecting to MySQL:", error);
    }
  }

  testConnection();
} else {
  console.error("MYSQL_PUBLIC_URL environment variable is not set!");
  process.exit(1);
}

// 2. Create Table (if it doesn't exist) - Moved INSIDE client.once('ready')
async function createTable() {
  try {
    const connection = await pool.getConnection();
    console.log("Attempting to create tables...");
    await connection.execute(`
          CREATE TABLE IF NOT EXISTS users (
              user_id VARCHAR(255) PRIMARY KEY,
              sex VARCHAR(255) DEFAULT 'random',
              total_commands INT DEFAULT 0,
              favorite_command VARCHAR(255),
              command_counts JSON
          )
      `);
    console.log("Users table created (or already exists).");

    await connection.execute(`
          CREATE TABLE IF NOT EXISTS global_stats (
              stat_name VARCHAR(255) PRIMARY KEY,
              stat_value VARCHAR(255)
          )
      `);
    console.log("global_stats table created (or already exists).");

    await connection.execute(`
          CREATE TABLE IF NOT EXISTS command_usage (
              command_name VARCHAR(255),
              count INT DEFAULT 0,
              PRIMARY KEY (command_name)
          )
      `);
    connection.release();
    console.log("Tables created successfully (or already existed).");
  } catch (error) {
    console.error("Error in createTable function:", error);
    if (error.sqlMessage) {
      console.error("SQL Error:", error.sqlMessage);
    }
  }
}

async function getUserPreference(userId) {
  try {
    const [rows] = await pool.execute(
      "SELECT sex FROM users WHERE user_id = ?",
      [userId]
    );
    return rows[0]?.sex || "random";
  } catch (error) {
    console.error("Error getting user preference:", error);
    return "random";
  }
}

async function setUserPreference(userId, sex) {
  try {
    await pool.execute(
      "INSERT INTO users (user_id, sex) VALUES (?, ?) ON DUPLICATE KEY UPDATE sex = ?",
      [userId, sex, sex]
    );
  } catch (error) {
    console.error("Error setting user preference:", error);
  }
}
async function getTotalCommands(userId) {
  try {
    const [rows] = await pool.execute(
      "SELECT total_commands FROM users WHERE user_id = ?",
      [userId]
    );
    return rows[0]?.total_commands || 0;
  } catch (error) {
    console.error("Error getting total commands:", error);
    return 0;
  }
}

async function getFavoriteCommand(userId) {
  try {
    const [rows] = await pool.execute(
      "SELECT favorite_command FROM users WHERE user_id = ?",
      [userId]
    );
    return rows[0]?.favorite_command || "None";
  } catch (error) {
    console.error("Error getting favorite command:", error);
    return "None";
  }
}

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);

  if (!pool) {
    console.error("❌ Database connection pool is not initialized!");
    return;
  }

  try {
    await createTable();

    await pool.execute(
      "INSERT IGNORE INTO global_stats (stat_name, stat_value) VALUES ('total_commands', '0')"
    );

    const defaultCommands = [
      "ping",
      "hug",
      "fuck",
      "lick",
      "kiss",
      "e621",
      "cmds",
      "settings",
      "setpreference",
    ];
    for (const cmd of defaultCommands) {
      await pool.execute(
        "INSERT IGNORE INTO command_usage (command_name, count) VALUES (?, 0)",
        [cmd]
      );
    }

    console.log("📊 Global stats initialized.");

    const rest = new REST({ version: "10" }).setToken(token);
    console.log("🔄 Refreshing slash commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("✅ Successfully updated commands!");
  } catch (error) {
    console.error("❌ Error during initialization:", error);
  }
});

async function fetchE621Image(tags = []) {
  const query = tags.join("+");
  const url = `https://e621.net/posts.json?tags=${query}&limit=1`;
  const apiKey = process.env.E621_API_KEY;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NappBot/1.0 (by Napp on e621)",
        Authorization: `Basic ${Buffer.from(`Napp:${apiKey}`).toString(
          "base64"
        )}`,
      },
    });

    const data = await response.json();
    if (!data.posts || data.posts.length === 0) {
      return null;
    }

    const post = data.posts[0];
    const artists =
      post.tags.artist.length > 0 ? post.tags.artist.join(", ") : "Unknown";
    const characters =
      post.tags.character.slice(0, 3).join(", ") || "No characters tagged";
    const score = post.score.total;
    const favCount = post.fav_count;
    const postId = post.id;
    const postUrl = `https://e621.net/posts/${postId}`;
    const imageUrl = post.file.url;

    return { imageUrl, artists, characters, score, favCount, postId, postUrl };
  } catch (error) {
    console.error("Error fetching image from e621:", error.message);
    return null;
  }
}

// Global Variables to Store Stats (Initialize as needed)
let totalCommandsGlobal = 0;
const commandCountsGlobal = {};
const userCommandCounts = {};

async function updateGlobalStats(commandName) {
  try {
    // Update the total commands count
    await pool.execute(
      "UPDATE global_stats SET stat_value = stat_value + 1 WHERE stat_name = 'total_commands'"
    );

    // Fetch existing command count
    const [rows] = await pool.execute(
      "SELECT count FROM command_usage WHERE command_name = ?",
      [commandName]
    );

    let count = 0;
    if (rows.length > 0) {
      count = rows[0].count; // Ensure it's a number
    }

    // Insert or update command count properly
    await pool.execute(
      "INSERT INTO command_usage (command_name, count) VALUES (?, ?) ON DUPLICATE KEY UPDATE count = ?",
      [commandName, count + 1, count + 1]
    );
  } catch (error) {
    console.error("❌ Error updating command usage:", error);
  }
}

async function updateUserCommandCounts(userId, commandName) {
  userCommandCounts[userId] = userCommandCounts[userId] || {};
  userCommandCounts[userId][commandName] =
    (userCommandCounts[userId][commandName] || 0) + 1;
}

// Functions for Global Stats, Top Users, and Most Used Commands
async function getTotalCommandsGlobal() {
  try {
    const [rows] = await pool.execute(
      "SELECT stat_value FROM global_stats WHERE stat_name = 'total_commands'",
      []
    );
    return rows[0]?.stat_value || 0;
  } catch (error) {
    console.error("Error getting global total commands:", error);
    return 0;
  }
}

async function getTopUser() {
  try {
    const [rows] = await pool.execute(`
      SELECT user_id, total_commands
      FROM users
      ORDER BY total_commands DESC
      LIMIT 1
    `);
    return rows[0]?.user_id ? `<@${rows[0].user_id}>` : "No users yet";
  } catch (error) {
    console.error("Error getting top user:", error);
    return "Error getting top user";
  }
}

async function getMostUsedCommand() {
  try {
    const [rows] = await pool.execute(
      `
            SELECT command_name
            FROM command_usage
            ORDER BY count DESC
            LIMIT 1
        `,
      []
    );
    return rows[0]?.command_name || "No commands used yet";
  } catch (error) {
    console.error("Error getting most used command:", error);
    return "Error getting most used command";
  }
}

async function getMostUsedCommandCount() {
  try {
    const [rows] = await pool.execute(
      `
            SELECT count
            FROM command_usage
            ORDER BY count DESC
            LIMIT 1
        `,
      []
    );
    return rows[0]?.count || 0;
  } catch (error) {
    console.error("Error getting most used command count:", error);
    return "Error getting most used command count";
  }
}

async function getGlobalStat(stat_name) {
  try {
    const [rows] = await pool.execute(
      "SELECT stat_value FROM global_stats WHERE stat_name = ?",
      [stat_name]
    );
    return rows[0]?.stat_value || 0;
  } catch (error) {
    console.error("Error getting global stat:", error);
    return 0;
  }
}

// Slash commands
const commands = [
  // Ping
  {
    name: "ping",
    description: "Pings the bot and shows the latency",
  },

  // Hug
  {
    name: "hug",
    description: "🤗 Hug someone!",
    options: [
      { name: "user", type: 6, description: "User to hug", required: true },
      {
        name: "custom_gif",
        type: 3,
        description: "Custom Img / GIF (Optional)",
        required: false,
      },
    ],
  },

  // Fuck
  {
    name: "fuck",
    description: "😏 Have some fun with someone.",
    options: [
      {
        name: "user",
        type: 6,
        description: "User to have fun with",
        required: true,
      },
      {
        name: "pose",
        type: 3,
        description: "Choose which position the recipient gets penetrated in",
        required: false,
        choices: [
          { name: "Behind", value: "behind" },
          { name: "Front", value: "front" },
        ],
      },
      {
        name: "sex",
        type: 3,
        description: "Choose if the recipient is male or female",
        required: false,
        choices: [
          { name: "Female", value: "Female" },
          { name: "Male", value: "Male" },
        ],
      },
    ],
  },

  // Lick
  {
    name: "lick",
    description: "👅 Lick someone!",
    options: [
      { name: "user", type: 6, description: "User to lick", required: true },
      {
        name: "custom_gif",
        type: 3,
        description: "Custom Img / GIF (Optional)",
        required: false,
      },
    ],
  },

  // Kiss
  {
    name: "kiss",
    description: "😘 Kiss someone!",
    options: [
      { name: "user", type: 6, description: "User to kiss", required: true },
      {
        name: "custom_gif",
        type: 3,
        description: "Custom Img / GIF (Optional)",
        required: false,
      },
    ],
  },

  // e621 pull
  {
    name: "e621",
    description: "🔞 Search for an image on e621.net",
    options: [
      {
        name: "tags",
        type: 3,
        description: "Enter tags (separated by spaces, e.g., 'wolf male')",
        required: true,
      },
    ],
  },

  // Command list
  {
    name: "cmds",
    description: "📜 View a list of all available commands!",
  },

  // Settings
  {
    name: "settings",
    description: "View your preferences and usage statistics.",
  },

  // Set Preferences
  {
    name: "setpreference",
    description: "Set your preferred sex for the /fuck command.",
    options: [
      {
        name: "sex",
        type: 3, // STRING
        description: "Choose your preference",
        required: true,
        choices: [
          { name: "Female", value: "female" },
          { name: "Male", value: "male" },
        ],
      },
    ],
  },
];

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const userId = interaction.user.id;
  const commandName = interaction.commandName;
  let userRows; // Declare userRows outside try block

  try {
    console.log(`Processing command: ${commandName} for User ID: ${userId}`);

    // Increment total commands
    const [updateResult] = await pool.execute(
      "UPDATE users SET total_commands = total_commands + 1 WHERE user_id = ?",
      [userId]
    );

    console.log("Update result:", updateResult);

    // Fetch updated total commands
    [userRows] = await pool.execute(
      "SELECT total_commands, command_counts FROM users WHERE user_id = ?",
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      console.error(`User ${userId} not found in database.`);
      return;
    }

    console.log("Raw database response:", userRows);

    const totalCommands = userRows[0]?.total_commands || 0;
    const rawCommandCounts = userRows[0]?.command_counts;

    let commandCounts;
    try {
      commandCounts =
        typeof rawCommandCounts === "string"
          ? JSON.parse(rawCommandCounts)
          : rawCommandCounts || {};
    } catch (jsonError) {
      console.error("Error parsing command_counts JSON:", jsonError);
      commandCounts = {}; // Default to empty object
    }

    // Update command-specific counts
    commandCounts[commandName] = (commandCounts[commandName] || 0) + 1;
    await pool.execute(
      "UPDATE users SET command_counts = ? WHERE user_id = ?",
      [JSON.stringify(commandCounts), userId]
    );

    // Determine favorite command
    let favoriteCommand = "None";
    let maxCount = 0;
    for (const cmd in commandCounts) {
      if (commandCounts[cmd] > maxCount) {
        maxCount = commandCounts[cmd];
        favoriteCommand = cmd;
      }
    }

    await pool.execute(
      "UPDATE users SET favorite_command = ? WHERE user_id = ?",
      [favoriteCommand, userId]
    );

    // Update Global and User Command Stats
    await updateGlobalStats(commandName);
    await updateUserCommandCounts(userId, commandName);
  } catch (error) {
    console.error("Error updating command usage:", error);
  }
})

// Ping
if (interaction.commandName === "ping") {
  await interaction.reply({
    content: `🏓 Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`,
    flags: [MessageFlags.Ephemeral],
  });
}
// Hug
if (interaction.commandName === "hug") {
  const sender = interaction.user;
  const recipient = interaction.options.getUser("user");
  const customGif = interaction.options.getString("custom_gif");

  if (!recipient) {
    return interaction.reply({
      content: "❌ You must mention a user!",
      flags: 64,
    });
  }

  // Default hug GIFs
  const hugGifs = [
    "https://static1.e926.net/data/93/4d/934dd18261556c1fddcd41feacc3b9a8.gif",
    "https://static1.e926.net/data/58/1f/581f2a6acd677c631e1a52b8b5c11be0.gif",
    "https://static1.e926.net/data/ca/28/ca289ba459d138a511f216a31bfa01a2.gif",
    "https://static1.e926.net/data/73/47/73473d58b563719f729ab898436715f8.jpg",
    "https://static1.e926.net/data/92/6a/926aa2a696d91ca9c78510646df0ff1c.jpg",
    "https://static1.e926.net/data/35/09/3509727802c7391c9f1c5ff3be8dd99f.jpg",
    "https://d.furaffinity.net/art/pocketpaws/1607620005/1607620002.pocketpaws_6_drakethekobold.gif",
    "https://static1.e621.net/data/3e/85/3e85296961cbb123ae8992f6b8e104b4.jpg",
  ];
  const randomIndex = Math.floor(Math.random() * hugGifs.length);
  console.log(`Hug GIF Index: ${randomIndex}`);
  const randomGif = hugGifs[randomIndex];

  let embedDescription;
  let gifToUse;

  if (customGif) {
    embedDescription = `${sender} sends a special hug to ${recipient}! 💞`;
    gifToUse = customGif;
  } else {
    const hugMessages = [
      `${sender} wraps ${recipient} in a big warm hug! 🤗`,
      `Aww, ${sender} gives ${recipient} a loving hug! 💖`,
      `${sender} tightly hugs ${recipient}! So wholesome! 🥰`,
      `Hug alert! 🚨 ${sender} just sent ${recipient} a hug! 🫂`,
      `Nothing beats a good hug! ${sender} embraces ${recipient}! 💞`,
    ];
    embedDescription =
      hugMessages[Math.floor(Math.random() * hugMessages.length)];
    gifToUse = randomGif;
  }

  const embed = new EmbedBuilder()
    .setTitle("🤗 Hug Alert!")
    .setDescription(embedDescription)
    .setImage(gifToUse)
    .setColor("#FFC0CB")
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
// Fuck
if (interaction.commandName === "fuck") {
  const sender = interaction.user;
  const recipient = interaction.options.getUser("user");

  if (!recipient) {
    return interaction.reply({
      content: "❌ You must mention someone!",
      ephemeral: true,
    });
  }

  let pose = interaction.options.getString("pose");
  let type = interaction.options.getString("sex");

  if (!type) {
    const preference = getUserPreference(recipient.id);
    type = typeof preference === "string" ? preference : "male"; // Default to male
  }

  if (recipient.id === sender.id) {
    return interaction.reply({
      content: "❌ You can't do this to yourself...",
      ephemeral: true,
    });
  }

  const poseOptions = ["behind", "front"];
  if (!pose) {
    pose = poseOptions[Math.floor(Math.random() * poseOptions.length)];
  }

  const images = {
    female: {
      behind: [
        "https://static1.e621.net/data/e1/a1/e1a1be581602c5171be271c9a970c78d.gif",
        "https://static1.e621.net/data/1f/e1/1fe11f06141f5bcdc002a90ff4c3d80f.gif",
        "https://static1.e621.net/data/d7/b4/d7b42c559f7505d66bc69c4714a354e5.gif",
        "https://static1.e621.net/data/ba/05/ba0553f7459b3a4023860047ca8b24c2.gif",
        "https://static1.e621.net/data/ba/05/ba0553f7459b3a4023860047ca8b24c2.gif",
        "https://static1.e621.net/data/f6/41/f6411b4e47be198de2b07c0ab517b4f7.gif",
        "https://static1.e621.net/data/a4/6a/a46a2b7c85a626e801cb3ea1caac3a75.gif",
        "https://static1.e621.net/data/e0/21/e021e41d356a69925cee2405a794c296.gif",
      ],
      front: [
        "https://static1.e621.net/data/c5/30/c5305191eb41530fd8d3527a969527b3.gif",
        "https://static1.e621.net/data/2f/26/2f26fa4a23068a99e9ec9c2d1ed9a8e0.gif",
        "https://static1.e621.net/data/61/48/61482f946c4558d0f019772834164377.gif",
        "https://static1.e621.net/data/f7/b9/f7b9f8a757b40d88c18bdc0c3fc4af6f.gif",
        "https://static1.e621.net/data/2c/30/2c304532a4678c0310ae249b8dffa919.gif",
        "https://static1.e621.net/data/0a/bd/0abd48dda3e8a492b5c8418cd4c036cf.gif",
        "https://static1.e621.net/data/9b/c8/9bc80f868254e23f56acdfc9422d0f68.gif",
        "https://static1.e621.net/data/f5/58/f558f5e8928b5b0745a168145bbadef5.gif",
        "https://static1.e621.net/data/bf/f7/bff7f1f5f9cc8fdfef851c7297e317ff.gif",
        "https://static1.e621.net/data/b4/3e/b43e0cce74d6762ed2cb7509c4a0e43c.gif",
        "https://static1.e621.net/data/87/0d/870d9bb6129cd09e09671b0072a4b16e.gif",
        "https://static1.e621.net/data/70/c9/70c971f2014ebd9c55a63b85fa6ab689.gif",
        "https://static1.e621.net/data/5e/ea/5eeabd6bb56a6374ca8f237e76b1b319.png",
      ],
    },
    male: {
      behind: [
        "https://static1.e621.net/data/8d/6c/8d6c97b9b1f6ad1ce11a33e95aa3320f.gif",
        "https://static1.e621.net/data/27/15/27159b7051e706017e50520e5d8259be.gif",
        "https://static1.e621.net/data/58/2c/582c18a2337dc10f400d2f1806648e03.gif",
        "https://static1.e621.net/data/79/b7/79b7491d38ccc9b549d61a7484bb3229.gif",
        "https://static1.e621.net/data/6c/e8/6ce819f62b6d7d115c3b881129198eeb.gif",
        "https://static1.e621.net/data/d4/01/d401d2fa019876715db77f7606cdaeac.gif",
        "https://static1.e621.net/data/f4/92/f4929ae1d9100e7bcaa55d653fc1fbae.gif",
        "https://static1.e621.net/data/82/87/8287c98315dbfe1d497bd5b598e2bfc8.gif",
        "https://static1.e621.net/data/71/9f/719fb226f899f9dfe18fcb46d86f5c46.gif",
        "https://static1.e621.net/data/1f/75/1f755c945e0f6eafedd12209859f4c89.gif",
        "https://static1.e621.net/data/84/d3/84d364f4a107716b73ea95f0156c5860.gif",
        "https://static1.e621.net/data/23/1e/231e564fd4dcb183490b9e804b8f5353.gif",
        "https://static1.e621.net/data/f3/44/f3442925f778399b1fb1b3d3141ef2cd.gif",
        "https://static1.e621.net/data/66/13/6613282438444bf6ad871fe880e17da5.gif",
        "https://static1.e621.net/data/a2/95/a295fc91f6b9f366f803b2b37f82538d.gif",
        "https://static1.e621.net/data/c1/f2/c1f2056014f7330b6641c77d79645380.gif",
        "https://static1.e621.net/data/5d/99/5d99fb3ae454864b932bdee9f68bb75a.gif",
        "https://static1.e621.net/data/03/3a/033a1899a93547b88e97ed4465f13251.gif",
        "https://static1.e621.net/data/92/0e/920e3c8d0127829ea23ea0368d4033a1.png",
        "https://static1.e621.net/data/8f/e9/8fe9c133e3451ffa7934101f1d4d83b6.gif",
        "https://static1.e621.net/data/d0/e1/d0e1af0aef3471a8dbc7ad1dcf69739e.gif",
        "https://static1.e621.net/data/43/0c/430ce4951c7ef7612bfb1cd8b411d561.gif",
      ],
      front: [
        "https://static1.e621.net/data/00/ee/00eee273dc572ab71b23aa78dbbf5663.gif",
        "https://static1.e621.net/data/cb/a7/cba75d5c73b30b25a05aa48e0d883786.gif",
        "https://static1.e621.net/data/78/e8/78e888f5ab8155658d09b9d9818897f9.gif",
        "https://static1.e621.net/data/1b/91/1b9107b9d991e97b18a54e7acc34a770.gif",
        "https://static1.e621.net/data/69/08/690804c63fff076a218060a6ea586f76.gif",
        "https://static1.e621.net/data/03/62/03628379efa53089ffb58c45050be32c.gif",
        "https://static1.e621.net/data/89/c0/89c06489dfdb2b1442e0c780d1c701fe.gif",
        "https://static1.e621.net/data/56/b7/56b7dfc17a9346a47582398e01771d53.gif",
        "https://static1.e621.net/data/e2/0d/e20d2e81c752c2e5d8f0895d644099d1.gif",
        "https://static1.e621.net/data/3f/81/3f81f9d3594690a4334f0635f214b758.gif",
        "https://static1.e621.net/data/03/6d/036d19c76726620f74e7e12ab1dc8bb5.gif",
      ],
    },
  };

  if (!images[type]) {
    console.error(`❌ Invalid type: ${type}`);
    return interaction.reply({
      content: "❌ Invalid type selection!",
      ephemeral: true,
    });
  }

  if (!images[type][pose]) {
    console.error(`❌ No images found for pose: ${pose} and type: ${type}`);
    return interaction.reply({
      content: "❌ No images available for this pose!",
      ephemeral: true,
    });
  }

  const randomIndex = Math.floor(Math.random() * images[type][pose].length);
  console.log(`Selected GIF Index for ${type}/${pose}: ${randomIndex}`);
  const image = images[type][pose][randomIndex];

  const embed = new EmbedBuilder()
    .setTitle("🔥 Steamy Interaction!")
    .setDescription(`${sender} is having fun with ${recipient}! 😏`)
    .setImage(image)
    .setColor("#FF007F")
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
// Lick
if (interaction.commandName === "lick") {
  const sender = interaction.user;
  const recipient = interaction.options.getUser("user");
  const customGif = interaction.options.getString("custom_gif");

  if (!recipient) {
    return interaction.reply({
      content: "❌ You must mention a user!",
      flags: 64,
    });
  }

  if (recipient.id === sender.id) {
    return interaction.reply({
      content: "❌ You can't lick yourself!",
      flags: 64,
    });
  }

  // Default lick GIFs
  const lickGifs = [
    "https://static1.e621.net/data/c5/a3/c5a3340470ff9e9f73b3ae1c07688cd8.png",
    "https://static1.e621.net/data/e1/2c/e12cf0ba9e5802cd96f19595b383f902.jpg",
    "https://static1.e621.net/data/0b/f2/0bf2fbb2a5ab72cc3113ceeb97ba05dd.png",
    "https://static1.e621.net/data/2c/da/2cda166ceb134f664164dcced739d6f1.gif",
    "https://static1.e621.net/data/f1/ee/f1eea14bc88ca4a30332c9140c64e1a8.gif",
    "https://static1.e621.net/data/2f/6f/2f6f03e6ec4bbd44be64764a81eca17b.jpg",
    "https://static1.e621.net/data/25/05/2505deaea6668e8247a6b3b9b5168c27.gif",
  ];
  const randomGif = lickGifs[Math.floor(Math.random() * lickGifs.length)];

  let gifToUse = customGif || randomGif;

  const embed = new EmbedBuilder()
    .setTitle("👅 Lick Alert!")
    .setDescription(`${sender} licks ${recipient}!`)
    .setImage(gifToUse)
    .setColor("#FF007F")
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
// Kiss
if (interaction.commandName === "kiss") {
  const sender = interaction.user;
  const recipient = interaction.options.getUser("user");
  const customGif = interaction.options.getString("custom_gif");

  if (!recipient) {
    return interaction.reply({
      content: "❌ You must mention a user!",
      flags: 64,
    });
  }

  const kissGifs = [
    "https://static1.e621.net/data/7d/09/7d094af501ac64ca96105811f613eb2e.gif",
    "https://static1.e621.net/data/6b/5b/6b5b2994c7a98be239f42d2fe199495a.png",
    "https://static1.e621.net/data/1e/a8/1ea85e4c1fa189691345656d32fc380c.jpg",
    "https://static1.e621.net/data/e7/0b/e70b5c9af84ce154e7c7b91900815a63.gif",
    "https://static1.e621.net/data/9a/b6/9ab6c91af0a46a2cbb4486147d608d4d.jpg",
    "https://static1.e621.net/data/e1/aa/e1aa139df3d2bd06fde0d0d1e2ca0236.png",
    "https://static1.e621.net/data/0f/32/0f3277a9b5648b5798ffb5edbe915be8.jpg",
    "https://static1.e621.net/data/35/09/3509727802c7391c9f1c5ff3be8dd99f.jpg",
    "https://static1.e621.net/data/ab/d2/abd20dbaf47352b8407a666213abb246.jpg",
    "https://static1.e621.net/data/7f/91/7f915c94aa1cbf9296b7ca5ee86432c4.png",
    "https://static1.e621.net/data/1b/59/1b5964d9689b9a114eed16fa657d4176.jpg",
    "https://static1.e621.net/data/d6/9e/d69e21e6e0dcbfd436295855037cdf39.jpg",
    "https://static1.e621.net/data/26/c8/26c82e8e25ad4b4c3ba7a98248206696.jpg",
    "https://static1.e621.net/data/e0/f4/e0f4707f5c21fc15bde541e1ef83a40f.png",
    "https://static1.e621.net/data/14/45/1445b98605534ec756ad3b4063926ec0.jpg",
    "https://static1.e621.net/data/97/d8/97d87726964dfb3c14aec58b7c2450a6.gif",
    "https://static1.e621.net/data/16/4a/164ab3550d9bcf0a8e693963a7b64c0c.gif",
  ];
  const randomGif = kissGifs[Math.floor(Math.random() * kissGifs.length)];

  let embedDescription;
  let gifToUse;

  if (customGif) {
    embedDescription = `${sender} sends ${recipient} a special kiss! 💖`;
    gifToUse = customGif;
  } else {
    const kissMessages = [
      `${sender} kisses ${recipient}!`,
      `${sender} gives ${recipient} a sweet and loving kiss! 💞`,
      `${sender} plants a romantic kiss on ${recipient}! 😘`,
      `${sender} kisses ${recipient} passionately!`,
      `${sender} and ${recipient} share a cute kiss! ❤️`,
    ];
    embedDescription =
      kissMessages[Math.floor(Math.random() * kissMessages.length)];
    gifToUse = randomGif;
  }

  const embed = new EmbedBuilder()
    .setTitle("💋 Kiss Alert!")
    .setDescription(embedDescription)
    .setImage(gifToUse)
    .setColor("#FF69B4")
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
// e621
if (interaction.commandName === "e621") {
  const sender = interaction.user;
  const tags = interaction.options.getString("tags")?.split(" ") || [];

  await interaction.deferReply(); // Defer reply to allow time for API fetch

  const postData = await fetchE621Image(tags);
  if (!postData) {
    return interaction.editReply("❌ No results found!");
  }

  // Create embed
  const embed = new EmbedBuilder()
    .setTitle("🔞 e621 Image Result")
    .setDescription(
      `**Artist(s):** ${postData.artists}\n**Characters:** ${postData.characters}`
    )
    .setImage(postData.imageUrl || "https://e621.net/static/logo.png") // Use fallback image if missing
    .setColor("#00549F")
    .setFooter({
      text: `⭐ Score: ${postData.score} | ❤️ Favorites: ${postData.favCount} | 📌 Post ID: ${postData.postId}\nRequested by ${sender.tag}`,
      iconURL: sender.displayAvatarURL(),
    });

  // Create button linking to e621 post
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("🔗 View on e621")
      .setStyle(ButtonStyle.Link)
      .setURL(postData.postUrl)
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}
// Commands
if (interaction.commandName === "cmds") {
  const commands = await client.application.commands.fetch();
  if (!commands.size) {
    return interaction.reply({
      content: "❌ No commands found!",
      ephemeral: true,
    });
  }

  const commandList = commands
    .map((cmd) => `\`/${cmd.name}\` - ${cmd.description}`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("📜 Available Commands")
    .setDescription(commandList)
    .setColor("#FFA500")
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
// Settings
if (interaction.commandName === "settings") {
  try {
    const sex = (await getUserPreference(userId)) || "Random";
    const globalCommands = await getTotalCommandsGlobal();
    const mostUsedCommand = await getMostUsedCommand();
    const mostUsedCommandCount = await getMostUsedCommandCount();
    const topUser = await getTopUser();
    const topUserTotalCommands = await getTotalCommands(
      topUser.replace(/\D/g, "")
    );

    // **Enhanced Embed Formatting**
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📊 User Settings & Bot Statistics")
      .setDescription("Here are your current stats!")
      .addFields(
        { name: "👤 **Your Stats**", value: "\u200b" },
        {
          name: "📌 Total Commands Used",
          value: `**${totalCommands}**`,
          inline: true,
        },
        {
          name: "⭐ Favorite Command",
          value: `**/${favoriteCommand}**`,
          inline: true,
        },
        { name: "💬 Sex Preference", value: `**${sex}**`, inline: true },
        { name: "\u200b", value: "\u200b", inline: false },
        { name: "🌍 **Global Stats**", value: "\u200b" },
        {
          name: "📊 Total Commands Run",
          value: `**${globalCommands}**`,
          inline: true,
        },
        { name: "\u200b", value: "\u200b", inline: true },
        {
          name: "🏆 **Top Users**",
          value: `👑 @${topUser} - **${topUserTotalCommands}** commands`,
          inline: true,
        },
        { name: "\u200b", value: "\u200b", inline: false },
        {
          name: "🔥 **Most Used Command**",
          value: `🔹 /${mostUsedCommand} - **${mostUsedCommandCount}** uses`,
          inline: true,
        }
      )
      .setFooter({
        text: `Requested by ${
          interaction.user.tag
        } • Today at ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("edit_preferences")
        .setLabel("⚙️ Change Preferences")
        .setStyle(ButtonStyle.Primary)
    );

    interaction.reply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error("Error fetching settings:", error);
    interaction.reply({
      content: "❌ An error occurred while fetching your settings.",
      ephemeral: true,
    });
  }
}
// Set Preference Command
if (interaction.commandName === "setpreference") {
  const sender = interaction.user;
  const sex = interaction.options.getString("sex");

  await setUserPreference(sender.id, sex);

  await interaction.reply({
    content: `✅ Your preference has been set to **${sex}**!`,
    ephemeral: true,
  });
}

// Handle button interactions
client.on("interactionCreate", async (interaction) => {
  try {
    // Button Interaction Handling
    if (interaction.isButton()) {
      if (interaction.customId === "edit_preferences") {
        const modal = new ModalBuilder()
          .setCustomId("preference_modal")
          .setTitle("Edit Preferences");

        const sexInput = new TextInputBuilder()
          .setCustomId("sex_input")
          .setLabel("Preferred Sex (male, female, other)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const firstActionRow = new ActionRowBuilder().addComponents(sexInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
      }
    }

    // Modal Submission Handling
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "preference_modal") {
        const userId = interaction.user.id;
        const sex =
          interaction.fields.getTextInputValue("sex_input") || "random";

        try {
          await setUserPreference(userId, sex);
          await interaction.reply({
            content: `✅ Preferences updated! Sex: ${sex}`,
            ephemeral: true, // FIXED: Corrected flag usage
          });
        } catch (error) {
          console.error("❌ Error updating preferences:", error);
          await interaction.reply({
            content: "⚠️ An error occurred while updating preferences.",
            ephemeral: true, // FIXED: Corrected flag usage
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ Unexpected error handling interaction:", error);
  }
});
client.login(token);

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Bot is running 24/7 on port ${port}`);
});
