require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const clientId = process.env.CLIENT_ID;
const token = process.env.TOKEN;

if (!clientId || !token) {
  console.error("❌ Missing CLIENT_ID or TOKEN in environment variables.");
  process.exit(1);
}

console.log(`🔑 CLIENT_ID: ${clientId}`);
console.log(`🔑 TOKEN: ${token ? "Provided" : "Not Provided"}`);
console.log(`🛠️ Deploying commands globally...`);

function getCommandFiles(dir) {
  let files = [];
  console.log(`🔍 Searching for command files in: ${dir}`); // Added log
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    console.log(`🔍 Found entry: ${entry.name}, fullPath: ${fullPath}`); // Added log
    if (entry.isDirectory()) {
      console.log(`📁 Entry is a directory: ${entry.name}`); // Added log
      files = files.concat(getCommandFiles(fullPath));
    } else if (entry.name.endsWith(".js")) {
      console.log(`📄 Entry is a command file: ${entry.name}`); // Added log
      files.push(fullPath);
    } else {
      console.log(` skipping ${entry.name}`);
    }
  });
  return files;
}

const commandFiles = getCommandFiles(path.join(__dirname, "commands"));

console.log(`📂 Found ${commandFiles.length} command files.`);

const allCommands = [];

for (const file of commandFiles) {
  try {
    console.log(`Attempting to load command from: ${file}`); // Added log
    const command = require(file);
    if (command?.data?.toJSON) {
      allCommands.push(command.data.toJSON());
      console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.warn(`⚠️ Skipping invalid command file: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error loading command file: ${file}`, error);
  }
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("🚨 Deleting old global commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log("✅ Cleared old global commands!");

    if (allCommands.length === 0) {
      console.warn("⚠️ No commands found to register. Skipping deployment...");
      return;
    }

    console.log(`🔄 Registering ${allCommands.length} global commands...`);
    await rest.put(Routes.applicationCommands(clientId), { body: allCommands });
    console.log("✅ Successfully registered global commands.");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
