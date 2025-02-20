const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const os = require("os");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("ℹ️ Get information about NappBot."),
  async execute(interaction) {
    const client = interaction.client;

    const totalSeconds = Math.floor(client.uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("ℹ️ NappBot Information")
      .setDescription(
        "NappBot is a multipurpose bot for various utilities and fun commands."
      )
      .addFields(
        { name: "📌 Bot Name", value: client.user.username, inline: true },
        { name: "🆔 Bot ID", value: client.user.id, inline: true },
        {
          name: "🖥️ Servers",
          value: `${client.guilds.cache.size}`,
          inline: true,
        },
        { name: "⏳ Uptime", value: uptime, inline: true },
        { name: "⚙️ Node.js Version", value: process.version, inline: true },
        { name: "🖥️ OS", value: `${os.type()} ${os.arch()}`, inline: true }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: "NappBot • Made with ❤️ by n4ppstar" });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("GitHub Repository")
        .setStyle(ButtonStyle.Link)
        .setURL("https://github.com/AetCloud/NappBot"),
      new ButtonBuilder()
        .setLabel("Support Server")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/7xFAdhG7Tx")
    );

    await interaction.reply({
      embeds: [embed],
      components: [buttons],
      ephemeral: true,
    });
  },
};
