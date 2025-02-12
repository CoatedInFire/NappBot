const express = require("express");
const cors = require("cors");

const app = express();

app.disable("x-powered-by");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => res.send("Bot is alive!"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Web server running on port ${port}`))
  .on("error", (err) => {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  });

module.exports = app;
