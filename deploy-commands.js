require("dotenv").config();
const { REST, Routes } = require("discord.js");
const commands = require("./commands");

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("🚨 Deleting old global commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log("✅ Cleared old global commands!");

    console.log("🔄 Registering new global commands...");
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands.map((cmd) => cmd.toJSON()),
    });
    console.log("✅ Successfully registered global commands.");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
