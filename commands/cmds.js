const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cmds")
    .setDescription("📜 View a list of all available commands."),

  async execute(interaction) {
    console.log(
      `⚡ [DEBUG] /cmds used by ${interaction.user.tag} (${interaction.user.id})`
    );

    try {
      await interaction.deferReply();
      console.log("⌛ [DEBUG] Reply deferred");

      const commandList = interaction.client.commands;

      if (!commandList || commandList.size === 0) {
        console.warn("⚠️ [WARN] No commands found in client.commands.");
        return interaction.editReply("⚠️ No commands available.");
      }

      const commandDescriptions = commandList
        .map((cmd) => `\`/${cmd.data.name}\` - ${cmd.data.description}`)
        .join("\n");

      console.log("✅ [DEBUG] Successfully generated command list");

      const embed = new EmbedBuilder()
        .setTitle("📜 Available Commands")
        .setColor("#F1C40F")
        .setDescription(commandDescriptions)
        .setFooter({
          text: `Total Commands: ${commandList.size}`,
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      console.log("✅ [DEBUG] Command list sent successfully");
    } catch (error) {
      console.error("❌ [ERROR] /cmds failed:", error);
      return interaction.editReply(
        "⚠️ An error occurred while retrieving commands."
      );
    }
  },
};
