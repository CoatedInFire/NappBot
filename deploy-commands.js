require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = "1146990138656825415"; // Your Server ID

if (!token || !clientId || !guildId) {
  console.error("❌ Missing required environment variables!");
  process.exit(1);
}

// ✅ Debug: Check if token is loaded
console.log("🔍 Debug: TOKEN is", token ? "✅ Loaded" : "❌ NOT FOUND");

// ✅ Load all command files dynamically
const commands = [];
const commandFiles = fs
  .readdirSync(path.join(__dirname, "../commands")) // 🔥 Corrected Path
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(__dirname, "../commands", file)); // 🔥 Corrected Path
  if (command.data) commands.push(command.data.toJSON());
}

// ✅ Create REST client
const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("🚨 Clearing all guild commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [],
    });
    console.log("✅ Cleared all guild commands!");

    // 🔥 Prevent unnecessary API calls if no commands exist
    if (commands.length === 0) {
      console.log("⚠️ No commands found to register. Skipping deployment.");
      return;
    }

    console.log("🔄 Registering application commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(`✅ Successfully registered ${commands.length} commands.`);
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
