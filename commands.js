// Slash commands
const commands = [
    // Ping
    {
      name: "ping",
      description: "Pings the bot and shows the latency",
    },
  
    // Hug
    {
      name: "hug",
      description: "🤗 Hug someone!",
      options: [
        { name: "user", type: 6, description: "User to hug", required: true },
        {
          name: "custom_gif",
          type: 3,
          description: "Custom Img / GIF (Optional)",
          required: false,
        },
      ],
    },
  
    // Fuck
    {
      name: "fuck",
      description: "😏 Have some fun with someone.",
      options: [
        {
          name: "user",
          type: 6,
          description: "User to have fun with",
          required: true,
        },
        {
          name: "pose",
          type: 3,
          description: "Choose which position the recipient gets penetrated in",
          required: false,
          choices: [
            { name: "Behind", value: "behind" },
            { name: "Front", value: "front" },
          ],
        },
        {
          name: "sex",
          type: 3,
          description: "Choose if the recipient is male or female",
          required: false,
          choices: [
            { name: "Female", value: "Female" },
            { name: "Male", value: "Male" },
          ],
        },
      ],
    },
  
    // Lick
    {
      name: "lick",
      description: "👅 Lick someone!",
      options: [
        { name: "user", type: 6, description: "User to lick", required: true },
        {
          name: "custom_gif",
          type: 3,
          description: "Custom Img / GIF (Optional)",
          required: false,
        },
      ],
    },
  
    // Kiss
    {
      name: "kiss",
      description: "😘 Kiss someone!",
      options: [
        { name: "user", type: 6, description: "User to kiss", required: true },
        {
          name: "custom_gif",
          type: 3,
          description: "Custom Img / GIF (Optional)",
          required: false,
        },
      ],
    },
  
    // e621 pull
    {
      name: "e621",
      description: "🔞 Search for an image on e621.net",
      options: [
        {
          name: "tags",
          type: 3,
          description: "Enter tags (separated by spaces, e.g., 'wolf male')",
          required: true,
        },
      ],
    },
  
    // e621 profile lookup
    {
      name: "e621profile",
      description: "📊 Get statistics of an e621 user",
      options: [
        {
          name: "username",
          type: 3, // STRING
          description: "Enter the username to fetch profile stats",
          required: true,
        },
      ],
    },
  
    // Command list
    {
      name: "cmds",
      description: "📜 View a list of all available commands!",
    },
  
    // Settings
    {
      name: "settings",
      description: "View your preferences and usage statistics.",
    },
  
    // Set Preferences
    {
      name: "setpreference",
      description: "Set your preferred sex for the /fuck command.",
      options: [
        {
          name: "sex",
          type: 3, // STRING
          description: "Choose your preference",
          required: true,
          choices: [
            { name: "Female", value: "female" },
            { name: "Male", value: "male" },
          ],
        },
      ],
    },
  
    // 4chan /vp/ Command
    {
      name: "vp",
      description: "🧵 Fetch a random thread from 4chan's /vp/ board",
      options: [],
    },
  ];

  module.exports = commands;