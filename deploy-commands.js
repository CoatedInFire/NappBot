require("dotenv").config();
const { REST, Routes } = require("discord.js");
const commands = require("./commands");

const clientId = process.env.CLIENT_ID;
const token = process.env.TOKEN;

if (!clientId || !token) {
  console.error("❌ Missing CLIENT_ID or TOKEN in environment variables.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("🚨 Deleting old global commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log("✅ Cleared old global commands!");

    if (!commands || commands.length === 0) {
      console.warn("⚠️ No commands found to register. Skipping...");
      return;
    }

    console.log(`🔄 Registering ${commands.length} global commands...`);

    const allCommands = commands.map((cmd) => cmd.data.toJSON());

    await rest.put(Routes.applicationCommands(clientId), { body: allCommands });

    console.log("✅ Successfully registered global commands.");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
