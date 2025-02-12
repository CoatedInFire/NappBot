module.exports = {
  name: "ready",
  once: true, // Ensures it only runs once
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
  },
};
