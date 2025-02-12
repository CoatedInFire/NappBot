require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Debug: Check if token is loaded
console.log(
  "🔍 Debug: TOKEN is",
  process.env.TOKEN ? "✅ Loaded" : "❌ NOT FOUND"
);

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = "1146990138656825415"; // Your Server ID

// ✅ Load all command files dynamically
const commands = [];
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("🚨 Clearing all guild commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [],
    });
    console.log("✅ Cleared all guild commands!");

    console.log("🔄 Registering application commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log("✅ Successfully registered application commands.");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
