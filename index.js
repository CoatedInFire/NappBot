require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Get token and client ID from environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID || "765387268557897799";

// Slash commands
const commands = [
    {
        name: "ping",
        description: "Pings the bot and shows the latency"
    },
    {
        name: "hug",
        description: "Hug someone!",
        options: [
            {
                name: "user",
                type: 6, // USER type
                description: "User to hug",
                required: true
            },
            {
                name: "custom_gif",
                type: 3, // STRING type
                description: "Custom Img / GIF (Optional)",
                required: false
            }
        ]
    }
];

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    // Auto-refresh slash commands when bot starts
    const rest = new REST({ version: '10' }).setToken(token);
    try {
        console.log("🔄 Refreshing slash commands...");
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log("✅ Successfully updated commands!");
    } catch (error) {
        console.error("❌ Error updating commands:", error);
    }
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "ping") {
        await interaction.reply(`🏓 Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`);
    }

    if (interaction.commandName === "hug") {
        const sender = interaction.user;
        const recipient = interaction.options.getUser("user");
        const customGif = interaction.options.getString("custom_gif");

        if (!recipient) {
            return interaction.reply({ content: "❌ You must mention a user!", ephemeral: true });
        }

        // Default hug GIFs
        const hugGifs = [
            "https://static1.e926.net/data/93/4d/934dd18261556c1fddcd41feacc3b9a8.gif",
            "https://static1.e926.net/data/58/1f/581f2a6acd677c631e1a52b8b5c11be0.gif",
            "https://static1.e926.net/data/ca/28/ca289ba459d138a511f216a31bfa01a2.gif"
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
                `Nothing beats a good hug! ${sender} embraces ${recipient}! 💞`
            ];
            embedDescription = hugMessages[Math.floor(Math.random() * hugMessages.length)];
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
});

// Login bot
client.login(token);
