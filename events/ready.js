const { REST, Routes } = require("discord.js");
const { applyInterest } = require("../utils/interest");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🌐 Serving ${client.guilds.cache.size} guilds`);
    console.log(
      `📋 Number of commands: ${client.commands ? client.commands.size : 0}`
    );

    if (!client.commands || client.commands.size === 0) {
      console.warn("⚠️ No commands found. Skipping registration.");
      return;
    }

    if (process.env.DISABLE_READY_COMMANDS === "true") {
      console.log(
        "⏭️ Skipping command registration (DISABLE_READY_COMMANDS is enabled)."
      );
      return;
    }

    console.log(`🔑 CLIENT_ID: ${process.env.CLIENT_ID}`);
    console.log(`🔑 TOKEN: ${process.env.TOKEN ? "Provided" : "Not Provided"}`);

    console.log("💰 Starting hourly bank interest system...");
    setInterval(applyInterest, 60 * 60 * 1000);

    async function registerCommands() {
      const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
      const commands = [];
      const commandFiles = getCommandFiles(path.join(__dirname, "commands"));
    
      for (const file of commandFiles) {
        try {
          const command = require(file);
          if (command?.data?.name && command?.execute) {
            command.filePath = file;
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command: ${command.data.name}`);
          } else {
            console.warn(`⚠️ Skipping invalid command file: ${file}`);
            if (!command?.data?.name) {
              console.warn(`   ❌ Missing data.name`);
            }
            if (!command?.execute) {
              console.warn(`   ❌ Missing execute function`);
            }
            if (command?.data && !command.data.toJSON) {
              console.warn(`   ❌ data object missing toJSON method`);
            }
          }
        } catch (error) {
          console.error(`❌ Error loading command file: ${file}`, error);
        }
      }
    
      console.log(`📜 Loaded ${client.commands.size} commands.`);
    
      try {
        console.log(`📜 Registering ${client.commands.size} commands...`);
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log(
          `✅ Successfully registered ${client.commands.size} global commands.`
        );
      } catch (error) {
        console.error("❌ Error registering commands:", error);
      }
    }

    // Call registerCommands here, after the bot is ready
    await registerCommands();

    setInterval(monitorWalltakerChanges, 30 * 1000);
  },
};
