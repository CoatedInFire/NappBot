const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const commands = [];

// Get the absolute path to the commands directory
const commandsPath = path.join(__dirname, 'commands');

// Read all command files inside the commands directory
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Loop through each command file and push its JSON data to the commands array
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute" property.`);
    }
}

// Initialize the REST API client
const rest = new REST({ version: '10' }).setToken(token);

// Deploy the commands using the REST API
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Register the commands for a specific guild
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
