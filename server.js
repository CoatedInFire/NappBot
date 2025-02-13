require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const querystring = require("querystring");

const app = express();

app.disable("x-powered-by");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => res.send("Bot is alive!"));

// Discord OAuth2 Configuration
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI =
  process.env.REDIRECT_URI ||
  "https://web-production-c3a9.up.railway.app/oauth/callback";
const DISCORD_API = "https://discord.com/api";

// OAuth2 Callback Endpoint
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("No code provided.");
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      `${DISCORD_API}/oauth2/token`,
      querystring.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        scope: "identify guilds",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch user data
    const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.send(
      `Welcome, ${userResponse.data.username}! You have successfully authorized NappBot.`
    );
  } catch (error) {
    console.error("OAuth2 Error:", error.response?.data || error.message);
    res.status(500).send("Authentication failed.");
  }
});

const port = process.env.PORT || 3000;
app
  .listen(port, () => console.log(`✅ Web server running on port ${port}`))
  .on("error", (err) => {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  });

module.exports = app;
