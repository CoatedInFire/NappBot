require("dotenv").config();

const { URL } = require("node:url");

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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const fetch = require("node-fetch");
const express = require("express");
const mysql = require("mysql2/promise");
const app = express();
const { parse } = require("url");

const dbUrl = process.env.MYSQL_PUBLIC_URL;
const { hostname, pathname, auth, port: dbPort } = new URL(dbUrl); // Renamed `port` to `dbPort`
const [user, password] = auth.split(":");

const database = mysql.createPool({
    host: hostname,
    port: dbPort,  // Use `dbPort` instead of `port`
    user: user,
    password: password,
    database: pathname.substring(1), // Remove leading '/'
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Create the table if it doesn't exist
async function setupDatabase() {
    try {
        await database.execute(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id VARCHAR(50) PRIMARY KEY,
                preference ENUM('male', 'female', 'random') DEFAULT 'random'
            )
        `);
        console.log("✅ MySQL Table 'user_preferences' is ready!");
    } catch (error) {
        console.error("❌ Error creating MySQL table:", error);
    }
}

// Run the setup function
setupDatabase();

module.exports = database;

// MySQL Functions
async function getUserPreference(userId) {
  try {
    const query = `SELECT preference FROM user_preferences WHERE user_id = ?`;
    const [rows] = await database.execute(query, [userId]);

    return rows.length > 0 ? rows[0].preference : "random"; // Default to random
  } catch (error) {
    console.error("MySQL Error (getUserPreference):", error);
    return "random";
  }
}

async function setUserPreference(userId, preference) {
  if (!["male", "female", "random"].includes(preference)) return false;

  try {
    const query = `
          INSERT INTO user_preferences (user_id, preference) 
          VALUES (?, ?) 
          ON DUPLICATE KEY UPDATE preference = VALUES(preference);
      `;
    await database.execute(query, [userId, preference]);
    return true;
  } catch (error) {
    console.error("MySQL Error (setUserPreference):", error);
    return false;
  }
}

// Fetch e621
async function fetchE621Image(tags = []) {
  const query = tags.join("+");
  const url = `https://e621.net/posts.json?tags=${query}&limit=100`;
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

    if (!response.ok) {
      throw new Error(`e621 API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.posts || data.posts.length === 0) {
      return null;
    }

    const post = data.posts[Math.floor(Math.random() * data.posts.length)];

    return {
      imageUrl: post.file?.url || "No image available",
      artists:
        post.tags.artist.length > 0 ? post.tags.artist.join(", ") : "Unknown",
      characters:
        post.tags.character.slice(0, 3).join(", ") || "No characters tagged",
      score: post.score.total || 0,
      favCount: post.fav_count || 0,
      postId: post.id || "Unknown",
      postUrl: `https://e621.net/posts/${post.id}`,
    };
  } catch (error) {
    console.error("❌ Error fetching image from e621:", error.message);
    return null;
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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    // Handle Slash Commands
    if (interaction.isCommand()) {
      const commandName = interaction.commandName;
      console.log(`Processing command: ${commandName}`);
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

      if (recipient.id === sender.id) {
        return interaction.reply({
          content: "❌ You can't do this to yourself...",
          ephemeral: true,
        });
      }

      // Fetch user preference for recipient
      let type = await getUserPreference(recipient.id);

      // If no preference is set, pick randomly
      if (!type || !["male", "female"].includes(type)) {
        const options = ["male", "female"];
        type = options[Math.floor(Math.random() * options.length)];
      }

      let pose = interaction.options.getString("pose");
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

      if (!images[type] || !images[type][pose]) {
        console.error(`❌ Invalid type or pose: ${type}, ${pose}`);
        return interaction.reply({
          content: "❌ Invalid selection!",
          ephemeral: true,
        });
      }

      const randomIndex = Math.floor(Math.random() * images[type][pose].length);
      const image = images[type][pose][randomIndex];

      const embed = new EmbedBuilder()
        .setTitle("🔥 Steamy Interaction!")
        .setDescription(`${sender} is having fun with ${recipient}! 😏`)
        .setImage(image)
        .setColor("#FF007F")
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // Ping Command
    if (interaction.commandName === "ping") {
      await interaction.reply({
        content: `🏓 Pong! Latency: ${
          Date.now() - interaction.createdTimestamp
        }ms`,
        flags: [MessageFlags.Ephemeral],
      });
    }

    // Hug Command
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
        const randomGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];

        const embed = new EmbedBuilder()
          .setTitle("🤗 Hug Alert!")
          .setDescription(`${sender} wraps ${recipient} in a big warm hug! 🤗`)
          .setImage(customGif || randomGif)
          .setColor("#FFC0CB")
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }
    }

    // Lick Command
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

      const embed = new EmbedBuilder()
        .setTitle("👅 Lick Alert!")
        .setDescription(`${sender} licks ${recipient}!`)
        .setImage(customGif || randomGif)
        .setColor("#FF007F")
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // Kiss Command
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

      const embed = new EmbedBuilder()
        .setTitle("💋 Kiss Alert!")
        .setDescription(
          `${sender} gives ${recipient} a sweet and loving kiss! 💞`
        )
        .setImage(customGif || randomGif)
        .setColor("#FF69B4")
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // e621 Command
    if (interaction.commandName === "e621") {
      const sender = interaction.user;
      const tags = interaction.options.getString("tags")?.split(" ") || [];

      await interaction.deferReply(); // Defer reply to allow time for API fetch

      const postData = await fetchE621Image(tags);
      if (!postData) {
        return interaction.editReply("❌ No results found!");
      }

      const embed = new EmbedBuilder()
        .setTitle("🔞 e621 Image Result")
        .setDescription(
          `**Artist(s):** ${postData.artists}\n**Characters:** ${postData.characters}`
        )
        .setColor("#00549F")
        .setFooter({
          text: `⭐ Score: ${postData.score} | ❤️ Favorites: ${postData.favCount} | 📌 Post ID: ${postData.postId}\nRequested by ${sender.tag}`,
          iconURL: sender.displayAvatarURL(),
        });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("🔗 View on e621")
          .setStyle(ButtonStyle.Link)
          .setURL(postData.postUrl)
      );

      // Check if the media is a .webm
      if (postData.imageUrl.endsWith(".webm")) {
        await interaction.editReply({
          content: `🎥 **WebM File:** [Click here to view](${postData.imageUrl})`,
          embeds: [embed],
          components: [row],
        });
      } else {
        embed.setImage(postData.imageUrl || "https://e621.net/static/logo.png");
        await interaction.editReply({ embeds: [embed], components: [row] });
      }
    }

    // Settings
    if (interaction.commandName === "settings") {
      const userId = interaction.user.id;

      // Fetch user preference
      const [rows] = await database.execute(
        "SELECT preference FROM user_preferences WHERE user_id = ?",
        [userId]
      );

      const preference = rows.length > 0 ? rows[0].preference : "random"; // Default to random

      const embed = new EmbedBuilder()
        .setTitle("⚙️ Your Settings")
        .setDescription(`**Sex Preference:** ${preference}`)
        .setColor("#3498db")
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Set Preference
    if (interaction.commandName === "setpreference") {
      const userId = interaction.user.id;
      const preference = interaction.options.getString("sex");

      if (!["male", "female"].includes(preference)) {
        return interaction.reply({
          content: "❌ Invalid preference!",
          ephemeral: true,
        });
      }

      // Insert or update the user preference
      await database.execute(
        "INSERT INTO user_preferences (user_id, preference) VALUES (?, ?) ON DUPLICATE KEY UPDATE preference = VALUES(preference)",
        [userId, preference]
      );

      await interaction.reply({
        content: `✅ Your preference has been set to **${preference}**!`,
        ephemeral: true,
      });
    }
    // Commands List
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

    // Set Preference Command
    if (interaction.commandName === "setpreference") {
      const sender = interaction.user;
      const sex = interaction.options.getString("sex");

      await interaction.reply({
        content: `✅ Your preference has been set to **${sex}**!`,
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("Error handling interaction:", error);
  }
});

client.login(token);

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

database.query("SELECT 1").then(() => console.log("✅ Connected to MySQL!"));

// Hosting Service that requires a Web Server (Replit, Heroku)
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Bot is running 24/7 on port ${port}`);
});
