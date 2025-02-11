require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    EmbedBuilder,
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Get token and client ID from environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID || "765387268557897799";

const fetch = require("node-fetch");

async function fetchE621Image(tags = []) {
    const query = tags.join("+");
    const url = `https://e621.net/posts.json?tags=${query}&limit=1`;
    const apiKey = process.env.E621_API_KEY;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": "NappBot/1.0 (by Napp on e621)",
                "Authorization": `Basic ${Buffer.from(`Napp:${apiKey}`).toString("base64")}`,
            },
        });

        const data = await response.json();
        if (!data.posts || data.posts.length === 0) {
            return null;
        }

        return data.posts[0].file.url;
    } catch (error) {
        console.error("Error fetching image from e621:", error);
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
        description: "Hug someone!",
        options: [
            { name: "user", type: 6, description: "User to hug", required: true },
            { name: "custom_gif", type: 3, description: "Custom Img / GIF (Optional)", required: false },
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
            { name: "custom_gif", type: 3, description: "Custom Img / GIF (Optional)", required: false },
        ],
    },

    // Kiss
    {
        name: "kiss",
        description: "😘 Kiss someone!",
        options: [
            { name: "user", type: 6, description: "User to kiss", required: true },
            { name: "custom_gif", type: 3, description: "Custom Img / GIF (Optional)", required: false },
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
    }
];


// Handle slash commands
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    // Ping
    if (interaction.commandName === "ping") {
        await interaction.reply(
            `🏓 Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`,
        );
    }
    // Hug
    if (interaction.commandName === "hug") {
        const sender = interaction.user;
        const recipient = interaction.options.getUser("user");
        const customGif = interaction.options.getString("custom_gif");

        if (!recipient) {
            return interaction.reply({
                content: "❌ You must mention a user!",
                ephemeral: true,
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
        let pose = interaction.options.getString("pose");
        let type = interaction.options.getString("type");
    
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
                behind: ["https://static1.e621.net/data/e1/a1/e1a1be581602c5171be271c9a970c78d.gif", "https://static1.e621.net/data/1f/e1/1fe11f06141f5bcdc002a90ff4c3d80f.gif", "https://static1.e621.net/data/d7/b4/d7b42c559f7505d66bc69c4714a354e5.gif", "https://static1.e621.net/data/ba/05/ba0553f7459b3a4023860047ca8b24c2.gif", "https://static1.e621.net/data/ba/05/ba0553f7459b3a4023860047ca8b24c2.gif", "https://static1.e621.net/data/f6/41/f6411b4e47be198de2b07c0ab517b4f7.gif", "https://static1.e621.net/data/a4/6a/a46a2b7c85a626e801cb3ea1caac3a75.gif", "https://static1.e621.net/data/e0/21/e021e41d356a69925cee2405a794c296.gif"],
                front: ["https://static1.e621.net/data/c5/30/c5305191eb41530fd8d3527a969527b3.gif", "https://static1.e621.net/data/2f/26/2f26fa4a23068a99e9ec9c2d1ed9a8e0.gif", "https://static1.e621.net/data/61/48/61482f946c4558d0f019772834164377.gif", "https://static1.e621.net/data/f7/b9/f7b9f8a757b40d88c18bdc0c3fc4af6f.gif", "https://static1.e621.net/data/2c/30/2c304532a4678c0310ae249b8dffa919.gif", "https://static1.e621.net/data/0a/bd/0abd48dda3e8a492b5c8418cd4c036cf.gif", "https://static1.e621.net/data/9b/c8/9bc80f868254e23f56acdfc9422d0f68.gif", "https://static1.e621.net/data/f5/58/f558f5e8928b5b0745a168145bbadef5.gif", "https://static1.e621.net/data/bf/f7/bff7f1f5f9cc8fdfef851c7297e317ff.gif", "https://static1.e621.net/data/b4/3e/b43e0cce74d6762ed2cb7509c4a0e43c.gif", "https://static1.e621.net/data/87/0d/870d9bb6129cd09e09671b0072a4b16e.gif", "https://static1.e621.net/data/70/c9/70c971f2014ebd9c55a63b85fa6ab689.gif", "https://static1.e621.net/data/5e/ea/5eeabd6bb56a6374ca8f237e76b1b319.png"],
            },
            male: {
                behind: ["https://static1.e621.net/data/8d/6c/8d6c97b9b1f6ad1ce11a33e95aa3320f.gif", "https://static1.e621.net/data/27/15/27159b7051e706017e50520e5d8259be.gif", "https://static1.e621.net/data/58/2c/582c18a2337dc10f400d2f1806648e03.gif", "https://static1.e621.net/data/79/b7/79b7491d38ccc9b549d61a7484bb3229.gif", "https://static1.e621.net/data/6c/e8/6ce819f62b6d7d115c3b881129198eeb.gif", "https://static1.e621.net/data/d4/01/d401d2fa019876715db77f7606cdaeac.gif", "https://static1.e621.net/data/f4/92/f4929ae1d9100e7bcaa55d653fc1fbae.gif", "https://static1.e621.net/data/82/87/8287c98315dbfe1d497bd5b598e2bfc8.gif", "https://static1.e621.net/data/71/9f/719fb226f899f9dfe18fcb46d86f5c46.gif", "https://static1.e621.net/data/1f/75/1f755c945e0f6eafedd12209859f4c89.gif", "https://static1.e621.net/data/84/d3/84d364f4a107716b73ea95f0156c5860.gif", "https://static1.e621.net/data/23/1e/231e564fd4dcb183490b9e804b8f5353.gif", "https://static1.e621.net/data/f3/44/f3442925f778399b1fb1b3d3141ef2cd.gif", "https://static1.e621.net/data/66/13/6613282438444bf6ad871fe880e17da5.gif", "https://static1.e621.net/data/a2/95/a295fc91f6b9f366f803b2b37f82538d.gif", "https://static1.e621.net/data/c1/f2/c1f2056014f7330b6641c77d79645380.gif", "https://static1.e621.net/data/5d/99/5d99fb3ae454864b932bdee9f68bb75a.gif", "https://static1.e621.net/data/03/3a/033a1899a93547b88e97ed4465f13251.gif", "https://static1.e621.net/data/92/0e/920e3c8d0127829ea23ea0368d4033a1.png", "https://static1.e621.net/data/8f/e9/8fe9c133e3451ffa7934101f1d4d83b6.gif", "https://static1.e621.net/data/d0/e1/d0e1af0aef3471a8dbc7ad1dcf69739e.gif", "https://static1.e621.net/data/43/0c/430ce4951c7ef7612bfb1cd8b411d561.gif"],
                front: ["https://static1.e621.net/data/00/ee/00eee273dc572ab71b23aa78dbbf5663.gif", "https://static1.e621.net/data/cb/a7/cba75d5c73b30b25a05aa48e0d883786.gif", "https://static1.e621.net/data/78/e8/78e888f5ab8155658d09b9d9818897f9.gif", "https://static1.e621.net/data/1b/91/1b9107b9d991e97b18a54e7acc34a770.gif", "https://static1.e621.net/data/69/08/690804c63fff076a218060a6ea586f76.gif", "https://static1.e621.net/data/03/62/03628379efa53089ffb58c45050be32c.gif", "https://static1.e621.net/data/89/c0/89c06489dfdb2b1442e0c780d1c701fe.gif", "https://static1.e621.net/data/56/b7/56b7dfc17a9346a47582398e01771d53.gif", "https://static1.e621.net/data/e2/0d/e20d2e81c752c2e5d8f0895d644099d1.gif", "https://static1.e621.net/data/3f/81/3f81f9d3594690a4334f0635f214b758.gif", "https://static1.e621.net/data/03/6d/036d19c76726620f74e7e12ab1dc8bb5.gif"],
            },
        };
    
        if (!type) {
            type = Math.random() < 0.5 ? "female" : "male";
        }
    
        if (!images[type][pose]) {
            console.error(`❌ No images found for pose: ${pose} and type: ${type}`);
            return interaction.reply({ content: "❌ No images available!", ephemeral: true });
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
                ephemeral: true,
            });
        }
    
        if (recipient.id === sender.id) {
            return interaction.reply({
                content: "❌ You can't lick yourself!",
                ephemeral: true,
            });
        }
    
        // Default lick GIFs
        const lickGifs = [
            "https://static1.e621.net/data/3a/be/3abef53aef46061042c4811bd579453b.png",
            "https://static1.e621.net/data/c5/a3/c5a3340470ff9e9f73b3ae1c07688cd8.png",
            "https://static1.e621.net/data/e1/2c/e12cf0ba9e5802cd96f19595b383f902.jpg",
            "https://static1.e621.net/data/0b/f2/0bf2fbb2a5ab72cc3113ceeb97ba05dd.png",
            "https://static1.e621.net/data/2c/da/2cda166ceb134f664164dcced739d6f1.gif",
            "https://static1.e621.net/data/f1/ee/f1eea14bc88ca4a30332c9140c64e1a8.gif",
            "https://static1.e621.net/data/2f/6f/2f6f03e6ec4bbd44be64764a81eca17b.jpg",
            "https://static1.e621.net/data/25/05/2505deaea6668e8247a6b3b9b5168c27.gif"
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
                ephemeral: true,
            });
        }
    
        const kissGifs = [
            "https://static1.e621.net/data/7d/09/7d094af501ac64ca96105811f613eb2e.gif",
            "https://static1.e621.net/data/6b/5b/6b5b2994c7a98be239f42d2fe199495a.png",
            "",
            "",
            "",
            ""
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
            embedDescription = kissMessages[Math.floor(Math.random() * kissMessages.length)];
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

    if (interaction.commandName === "e621") {
        await interaction.deferReply(); // Prevents timeout issues
    
        const tags = interaction.options.getString("tags")?.split(" ") || [];
        const imageUrl = await fetchE621Image(tags);
    
        if (!imageUrl) {
            return interaction.editReply("❌ No results found for those tags!");
        }
    
        const embed = new EmbedBuilder()
            .setTitle("🔞 e621 Image")
            .setImage(imageUrl)
            .setColor("#00549F")
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
});

client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    // Auto-refresh slash commands when bot starts
    const rest = new REST({ version: "10" }).setToken(token);
    try {
        console.log("🔄 Refreshing slash commands...");
        await rest.put(Routes.applicationCommands(clientId), {
            body: commands,
        });
        console.log("✅ Successfully updated commands!");
    } catch (error) {
        console.error("❌ Error updating commands:", error);
    }
});

// Login bot
client.login(token);

const express = require("express");
const app = express();
app.get("/", (req, res) => {
    res.send("Bot is alive!");
});
app.listen(3000, () => {
    console.log("✅ Bot is running 24/7");
});
