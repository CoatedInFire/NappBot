require("dotenv").config();
const { REST, Routes } = require("discord.js");
const commands = require("./commands"); // Your existing command export

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("🚨 Deleting old global commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log("✅ Cleared old global commands!");

    console.log("🔄 Registering new global commands...");

    const allCommands = []; // Array to hold both slash and context menu commands

    commands.forEach((command) => {
      // 1. Add the slash command version:
      allCommands.push(command.data.toJSON()); // This is already in your commands array

      // 2. Add the user context menu command version:
      allCommands.push({
        name: command.data.name, // Same name!
        type: 2, // User Command
      });
    });

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: allCommands } // Use the allCommands array
    );

    console.log("✅ Successfully registered global commands.");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
