const fetch = require("node-fetch");

const WALLTAKER_API_KEY = process.env.WALLTAKERAPIKEY;

/**
 * Fetch the latest image from a Walltaker feed.
 * @param {string} feedId - The Walltaker feed ID.
 * @returns {Promise<Object|null>} Image data or null if none found.
 */
async function fetchWalltakerImage(feedId) {
  const apiUrl = `https://walltaker.joi.how/api/links/${feedId}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: WALLTAKER_API_KEY,
        "User-Agent": "NappBot/1.0 (by Napp on Discord)",
      },
    });

    if (!response.ok) {
      throw new Error(`Walltaker API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.image_url) return null; // No image found

    return {
      feedId,
      imageUrl: data.image_url,
      sourceUrl: `https://walltaker.joi.how/${feedId}`,
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
