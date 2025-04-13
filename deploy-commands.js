require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

// Load from your existing environment variables
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // <- You didn't list this in your env — I'll explain below.
const token = process.env.DISCORD_TOKEN;

if (!clientId || !token) {
    console.error('Missing CLIENT_ID or DISCORD_TOKEN in environment variables.');
    process.exit(1);
}

// Note: guildId is optional only if you intend to deploy global commands — otherwise you need this set.
if (!guildId) {
    console.warn('No GUILD_ID provided — commands will not deploy without a target guild.');
    process.exit(1);
}

const commands = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute" property.`);
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
