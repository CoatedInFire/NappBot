const fetch = require("node-fetch");

const WALLTAKER_API_KEY = process.env.WALLTAKERAPIKEY;

/**
 * Fetch the latest image from a Walltaker feed.
 * @param {string} feedId - The Walltaker feed ID.
 * @returns {Promise<Object|null>} Image data or null if none found.
 */
async function fetchWalltakerImage(feedId) {
  const apiUrl = `https://walltaker.joi.how/api/links/${feedId}.json`;

  try {
    console.log(`🔍 Fetching Walltaker feed: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: WALLTAKER_API_KEY,
        "User-Agent": "NappBot/1.0 (by Napp on Discord)",
      },
    });

    console.log(
      `🌐 Response Status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      throw new Error(`Walltaker API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("📥 Received Data:", data);

    if (!data.post_url) {
      console.warn("⚠️ No image found in Walltaker feed.");
      return null;
    }

    return {
      feedId,
      imageUrl: data.post_url, // ✅ Fixed key
      sourceUrl: `https://walltaker.joi.how/links/${feedId}`,
      lastUpdatedBy: data.owner ?? "Unknown User", // ✅ Added wallpaper changer info
    };
  } catch (error) {
    console.error(
      `❌ Error fetching Walltaker image for feed ${feedId}:`,
      error.message
    );
    return null;
  }
}

module.exports = { fetchWalltakerImage };
