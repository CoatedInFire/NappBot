const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cmds")
    .setDescription("List all available commands."),

  async execute(interaction) {
    console.log(
      `[DEBUG] /cmds used by ${interaction.user.tag} (${interaction.user.id})`
    );

    try {
      await interaction.deferReply({ ephemeral: false });
      console.log("[DEBUG] Reply deferred");

      // Get commands from client.commands
      const commandList = interaction.client.commands
        .map((cmd) => `\`/${cmd.data.name}\` - ${cmd.data.description}`)
        .join("\n");

      if (!commandList) {
        console.warn("[WARN] No commands found in client.commands.");
        return interaction.editReply("⚠️ No commands found.");
      }

      console.log("[DEBUG] Generated command list");

      const embed = new EmbedBuilder()
        .setTitle("📜 Available Commands")
        .setColor("#F1C40F")
        .setDescription(commandList)
        .setFooter({
          text: `Total Commands: ${interaction.client.commands.size}`,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      console.log("[DEBUG] Successfully sent command list");
    } catch (error) {
      console.error("[ERROR] /cmds failed:", error);
      try {
        await interaction.editReply(
          "⚠️ An error occurred while retrieving commands."
        );
      } catch (editError) {
        console.error("[ERROR] Failed to send error response:", editError);
      }
    }
  },
};
