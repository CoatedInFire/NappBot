require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Get the token and client ID from environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID || "765387268557897799";

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
});

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
                name: "User",
                type: 6, // USER type
                description: "The user you want to hug",
                required: true
            },
            {
                name: "Custom Image/Gif",
                type: 3, // STRING type
                description: "Optional: Custom Image / GIF URL",
                required: false
            }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log("🔄 Refreshing slash commands...");
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log("✅ Successfully updated commands!");
    } catch (error) {
        console.error("❌ Error updating commands:", error);
    }
})();

// Handle commands
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

        // List of hug GIFs
        const hugGifs = [
            "https://static1.e926.net/data/93/4d/934dd18261556c1fddcd41feacc3b9a8.gif",
            "https://static1.e926.net/data/58/1f/581f2a6acd677c631e1a52b8b5c11be0.gif",
            "https://static1.e926.net/data/ca/28/ca289ba459d138a511f216a31bfa01a2.gif"
        ];
        const randomGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];
        const gifToUse = customGif || randomGif;

        // List of random hug messages
        const hugMessages = [
            `${sender} wraps ${recipient} in a big warm hug! 🤗`,
            `Aww, ${sender} gives ${recipient} a loving hug! 💖`,
            `${sender} tightly hugs ${recipient}! So wholesome! 🥰`,
            `Hug alert! 🚨 ${sender} just sent ${recipient} a super soft hug! 🫂`,
            `Nothing beats a good hug! ${sender} embraces ${recipient}! 💞`
        ];
        const randomMessage = hugMessages[Math.floor(Math.random() * hugMessages.length)];

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle("🤗 Hug Alert!")
            .setDescription(randomMessage)
            .setImage(gifToUse)
            .setColor("#FFC0CB") // Pink color
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
});

client.login(token);