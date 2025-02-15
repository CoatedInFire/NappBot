const fetch = require("node-fetch");

// e621 Default Blacklist (Excluded tags)
const DEFAULT_BLACKLIST = [
  "cub",
  "toddlercon",
  "shota",
  "loli",
  "gore",
  "scat",
  "watersports",
  "vore",
];

// e621 API Headers
const API_HEADERS = {
  "User-Agent": "NappBot/1.0 (by Napp on e621)",
};

/**
 * Fetch e621 images based on search tags.
 * If no tags are given, pulls from top 100 latest images with a score >= 100.
 * @param {Array} tags - Search tags.
 * @param {number} count - Number of images to return.
 * @returns {Array} - Array of image data objects.
 */
async function fetchE621Images(tags = [], count = 10) {
  const apiKey = process.env.E621_API_KEY;
  if (!apiKey) {
    console.error("❌ Missing E621 API Key!");
    return null;
  }

  // Default to high-rated posts if no tags provided
  if (tags.length === 0) {
    tags.push("score:>=100");
  }

  // Apply blacklist filtering
  const query = [...tags, ...DEFAULT_BLACKLIST.map((tag) => `-${tag}`)].join(
    "+"
  );
  const url = `https://e621.net/posts.json?tags=${query}&limit=100`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...API_HEADERS,
        Authorization: `Basic ${Buffer.from(`Napp:${apiKey}`).toString(
          "base64"
        )}`,
      },
    });

    if (!response.ok) throw new Error(`e621 API error: ${response.statusText}`);

    const data = await response.json();
    if (!data.posts || data.posts.length === 0) return null;

    // Fisher-Yates shuffle for better randomization
    const shuffledPosts = [...data.posts].sort(() => Math.random() - 0.5);

    return shuffledPosts
      .slice(0, Math.min(count, shuffledPosts.length))
      .map((post) => ({
        postId: post.id,
        postUrl: `https://e621.net/posts/${post.id}`,
        imageUrl: post.file?.url || null,
        thumbnail: post.preview?.url || null,
        artists: post.tags?.artist?.length ? post.tags.artist : ["Unknown"],
        characters: post.tags?.character?.length
          ? post.tags.character.slice(0, 3)
          : ["No characters tagged"],
        score: post.score?.total || 0,
        favCount: post.fav_count || 0,
      }));
  } catch (error) {
    console.error("❌ Error fetching images from e621:", error.message);
    return null;
  }
}

/**
 * Fetch e621 user profile data.
 * @param {string} username - e621 username.
 * @returns {Object|null} - User profile data or null if not found.
 */
async function fetchE621User(username) {
  const apiKey = process.env.E621_API_KEY;
  if (!apiKey) {
    console.error("❌ Missing E621 API Key!");
    return null;
  }

  const url = `https://e621.net/users.json?search[name_matches]=${username}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...API_HEADERS,
        Authorization: `Basic ${Buffer.from(`Napp:${apiKey}`).toString(
          "base64"
        )}`,
      },
    });

    if (!response.ok) throw new Error(`e621 API error: ${response.statusText}`);

    const data = await response.json();
    if (!data || data.length === 0) return null;

    const user = data[0];

    return {
      id: user.id,
      username: user.name,
      joined: new Date(user.created_at).toDateString(),
      uploads: user.post_upload_count || 0,
      tagEdits: user.tag_edit_count || 0,
      favorites: user.favorite_count || 0,
      notes: user.note_update_count || 0,
    };
  } catch (error) {
    console.error("❌ Error fetching e621 user data:", error.message);
    return null;
  }
}

/**
 * Fetch the e621 post ID based on an image URL.
 * @param {string} imageUrl - The full e621 image URL.
 * @returns {number|null} - The e621 post ID or null if not found.
 */
async function getE621PostId(imageUrl) {
  if (!imageUrl.includes("e621.net")) return null; // Only process e621 images

  const apiKey = process.env.E621_API_KEY;
  if (!apiKey) {
    console.error("❌ Missing E621 API Key!");
    return null;
  }

  // Extract MD5 hash from the URL
  const md5Hash = imageUrl.split("/").pop().split(".")[0];
  const url = `https://e621.net/posts.json?tags=md5:${md5Hash}&limit=1`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...API_HEADERS,
        Authorization: `Basic ${Buffer.from(`Napp:${apiKey}`).toString(
          "base64"
        )}`,
      },
    });

    if (!response.ok) throw new Error(`e621 API error: ${response.statusText}`);

    const data = await response.json();
    if (data.posts && data.posts.length > 0) {
      return data.posts[0].id; // ✅ Return the post ID if found
    }
  } catch (error) {
    console.error("❌ Error fetching e621 post ID:", error.message);
  }

  return null; // ❌ No match found
}

// ✅ Export functions
module.exports = { fetchE621Images, fetchE621User, getE621PostId };
