const { SlashCommandBuilder } = require("discord.js");

module.exports = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Pings the bot and shows the latency"),

  new SlashCommandBuilder()
    .setName("hug")
    .setDescription("🤗 Hug someone!")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to hug").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("custom_gif")
        .setDescription("Custom Img / GIF (Optional)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("fuck")
    .setDescription("😏 Have some fun with someone.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to have fun with")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("pose")
        .setDescription(
          "Choose which position the recipient gets penetrated in"
        )
        .setRequired(false)
        .addChoices(
          { name: "Behind", value: "behind" },
          { name: "Front", value: "front" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("sex")
        .setDescription("Choose if the recipient is male or female")
        .setRequired(false)
        .addChoices(
          { name: "Female", value: "female" },
          { name: "Male", value: "male" }
        )
    ),

  new SlashCommandBuilder()
    .setName("lick")
    .setDescription("👅 Lick someone!")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to lick").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("custom_gif")
        .setDescription("Custom Img / GIF (Optional)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kiss")
    .setDescription("😘 Kiss someone!")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to kiss").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("custom_gif")
        .setDescription("Custom Img / GIF (Optional)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("e621")
    .setDescription("🔞 Search for an image on e621.net")
    .addStringOption(
      (option) =>
        option
          .setName("tags")
          .setDescription("Enter tags (separated by spaces, e.g., 'wolf male')")
          .setRequired(false) // Tags are now optional
    ),

  new SlashCommandBuilder()
    .setName("e621profile")
    .setDescription("📊 Get statistics of an e621 user")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Enter the username to fetch profile stats")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("cmds")
    .setDescription("📜 View a list of all available commands!"),

  new SlashCommandBuilder()
    .setName("settings")
    .setDescription("View your preferences and usage statistics."),

  new SlashCommandBuilder()
    .setName("setpreference")
    .setDescription("Set your preferred sex for the /fuck command.")
    .addStringOption((option) =>
      option
        .setName("sex")
        .setDescription("Choose your preference")
        .setRequired(true)
        .addChoices(
          { name: "Female", value: "female" },
          { name: "Male", value: "male" },
          { name: "Random", value: "random" }
        )
    ),

  new SlashCommandBuilder()
    .setName("vp")
    .setDescription("🧵 Fetch a random thread from 4chan's /vp/ board"),

  new SlashCommandBuilder()
    .setName("walltaker")
    .setDescription("🖼️ Fetch the latest image from a Walltaker feed")
    .addIntegerOption((option) =>
      option
        .setName("feed_id")
        .setDescription("The Walltaker feed ID to fetch images from")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setwalltaker")
    .setDescription("⚙️ Configure Walltaker auto-posting for this server")
    .addIntegerOption((option) =>
      option
        .setName("feed_id")
        .setDescription("The Walltaker feed ID to pull images from")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Select the channel to post Walltaker images")
        .setRequired(true)
    ),
];