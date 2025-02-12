require("dotenv").config();
const { REST, Routes } = require("discord.js");
const commands = require("./commands");

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("🔄 Refreshing application commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("✅ Successfully registered application commands.");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
})();
