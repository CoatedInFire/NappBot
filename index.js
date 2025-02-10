const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!hello') {
        message.channel.send('Hello, Dave!');
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ping') {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        interaction.editReply(`Pong! Latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms, API Latency: ${Math.round(client.ws.ping)}ms`);
    }
});

client.login(process.env.TOKEN);
