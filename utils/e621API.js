const fetch = require("node-fetch");

// e621 Default Blacklist
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

/**
 * Fetch e621 images based on search tags.
 * If no tags are given, pulls from top 100 latest images with a score >= 100.
 * @param {Array} tags - Search tags.
 * @param {number} count - Number of images to return.
 * @returns {Array} - Array of image data objects.
 */
async function fetchE621Images(tags = [], count = 10) {
  // If no tags, default to high-rated images
  if (tags.length === 0) {
    tags.push("score:>=100");
  }

  // Apply blacklist filtering
  const query = [...tags, ...DEFAULT_BLACKLIST.map((tag) => `-${tag}`)].join(
    "+"
  );
  const url = `https://e621.net/posts.json?tags=${query}&limit=100`;
  const apiKey = process.env.E621_API_KEY;

  if (!apiKey) {
    console.error("❌ Missing E621 API Key!");
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NappBot/1.0 (by Napp on e621)",
        Authorization: `Basic ${Buffer.from(`Napp:${apiKey}`).toString(
          "base64"
        )}`,
      },
    });

    if (!response.ok) {
      throw new Error(`e621 API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.posts || data.posts.length === 0) {
      return null;
    }

    // Fisher-Yates shuffle for better randomization
    const shuffledPosts = [...data.posts];
    for (let i = shuffledPosts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPosts[i], shuffledPosts[j]] = [
        shuffledPosts[j],
        shuffledPosts[i],
      ];
    }

    // Select first `count` shuffled posts
    const selectedPosts = shuffledPosts.slice(
      0,
      Math.min(count, shuffledPosts.length)
    );

    return selectedPosts.map((post) => ({
      postId: post.id,
      postUrl: `https://e621.net/posts/${post.id}`,
      imageUrl: post.file?.url || null, // NULL if no image (avoids broken embeds)
      thumbnail: post.preview?.url || null, // NULL instead of placeholder
      artists: post.tags?.artist?.length > 0 ? post.tags.artist : ["Unknown"], // Properly extracts artist
      characters:
        post.tags?.character?.length > 0
          ? post.tags.character.slice(0, 3)
          : ["No characters tagged"], // Limits to 3
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
 * @returns {Object} - User profile data.
 */
async function fetchE621User(username) {
  const url = `https://e621.net/users.json?search[name_matches]=${username}`;
  const apiKey = process.env.E621_API_KEY;

  if (!apiKey) {
    console.error("❌ Missing E621 API Key!");
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NappBot/1.0 (by Napp on e621)",
        Authorization: `Basic ${Buffer.from(`Napp:${apiKey}`).toString(
          "base64"
        )}`,
      },
    });

    if (!response.ok) {
      throw new Error(`e621 API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      return null;
    }

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

// Export functions
module.exports = { fetchE621Images, fetchE621User };
