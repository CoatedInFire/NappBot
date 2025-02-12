const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.send("Bot is alive!"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Web server running on port ${port}`));

module.exports = app;
