require("dotenv").config();
console.log(
  "🔍 Debug: TOKEN is",
  process.env.TOKEN ? "✅ Loaded" : "❌ NOT FOUND"
);
const { REST, Routes } = require("discord.js");
const commands = require("./commands");

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = "1146990138656825415"; // Your Server ID

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("🚨 Clearing all commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log("✅ Cleared all commands!");
  } catch (error) {
    console.error("❌ Failed to clear commands:", error);
  }
})();

(async () => {
  try {
    console.log("🔄 Refreshing application commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("✅ Successfully registered application commands.");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
})();
