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

// Slash commands
const commands = [
    {
        name: "ping",
        description: "Pings the bot and shows the latency",
    },
    {
        name: "hug",
        description: "Hug someone!",
        options: [
            {
                name: "user",
                type: 6, // USER type
                description: "User to hug",
                required: true,
            },
            {
                name: "custom_gif",
                type: 3, // STRING type
                description: "Custom Img / GIF (Optional)",
                required: false,
            },
        ],
    },
    {
        name: "fuck",
        description: "😏 Have some fun with someone.",
        options: [
            {
                name: "user",
                type: 6, // USER type
                description: "User to have fun with",
                required: true,
            },
            {
                name: "pose",
                type: 3, // STRING type
                description: "Choose a pose",
                required: false,
                choices: [
                    { name: "placeholder", value: "placeholder" },
                    { name: "placeholder", value: "placeholder" },
                    { name: "placeholder", value: "placeholder" },
                    { name: "placeholder", value: "placeholder" },
                ],
            },
        ],
    },
];


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

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "ping") {
        await interaction.reply(
            `🏓 Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`,
        );
    }

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
        const randomGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];

        let embedDescription;
        let gifToUse;

        if (customGif) {
            // Fixed: Ensure custom GIFs always use a set message
            embedDescription = `${sender} sends a special hug to ${recipient}! 💞`;
            gifToUse = customGif;
        } else {
            // Use random message if no custom GIF is provided
            const hugMessages = [
                `${sender} wraps ${recipient} in a big warm hug! 🤗`,
                `Aww, ${sender} gives ${recipient} a loving hug! 💖`,
                `${sender} tightly hugs ${recipient}! So wholesome! 🥰`,
                `Hug alert! 🚨 ${sender} just sent ${recipient} a super soft hug! 🫂`,
                `Nothing beats a good hug! ${sender} embraces ${recipient}! 💞`,
            ];
            embedDescription =
                hugMessages[Math.floor(Math.random() * hugMessages.length)];
            gifToUse = randomGif;
        }

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle("🤗 Hug Alert!")
            .setDescription(embedDescription)
            .setImage(gifToUse)
            .setColor("#FFC0CB")
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === "fuck") {
        const sender = interaction.user;
        const recipient = interaction.options.getUser("user");
        let pose = interaction.options.getString("pose");
    
        if (recipient.id === sender.id) {
            return interaction.reply({
                content: "❌ You can't do this to yourself...",
                ephemeral: true,
            });
        }
    
        // Pose options
        const poseOptions = ["placeholder", "placeholder", "placeholder", "placeholder"];
    
        // If no pose is specified, pick one at random
        if (!pose) {
            pose = poseOptions[Math.floor(Math.random() * poseOptions.length)];
        }
    
        // Predefined images
        const images = {
            placeholder: [""],
            placeholder: [""],
            placeholder: [""],
            placeholder: [""],
        };
    
        // Predefined text responses
        const messages = {
            placeholder: `${sender} x ${recipient} x`,
            placeholder: `${sender} x ${recipient} x`,
            placeholder: `${sender} x ${recipient} x`,
            placeholder: `${sender} x ${recipient} x`,
        };
    
        // Pick a random image from the chosen pose
        const image = images[pose][Math.floor(Math.random() * images[pose].length)];
        const responseText = messages[pose];
    
        // Create embed
        const embed = new EmbedBuilder()
            .setTitle("🔥 Steamy Interaction!")
            .setDescription(responseText)
            .setImage(image)
            .setColor("#FF007F")
            .setTimestamp();
    
        await interaction.reply({ embeds: [embed] });
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
