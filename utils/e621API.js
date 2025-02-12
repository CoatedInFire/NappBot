const fetch = require("node-fetch"); // Ensure you have node-fetch installed

// Fetch e621 Images
async function fetchE621Images(tags = [], count = 10) {
  const query = tags.join("+");
  const url = `https://e621.net/posts.json?tags=${query}&limit=100`; // Fetches up to 100 posts
  const apiKey = process.env.E621_API_KEY;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NappBot/1.0 (by Napp on e621)",
        Authorization: `Basic ${Buffer.from(`Napp:${apiKey}`).toString("base64")}`,
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
    const shuffledPosts = data.posts.slice();
    for (let i = shuffledPosts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPosts[i], shuffledPosts[j]] = [shuffledPosts[j], shuffledPosts[i]];
    }

    // Select the first `count` shuffled posts (ensures unique images)
    const selectedPosts = shuffledPosts.slice(0, Math.min(count, shuffledPosts.length));

    return selectedPosts.map((post) => ({
      postId: post.id,
      postUrl: `https://e621.net/posts/${post.id}`,
      imageUrl: post.file?.url || "No image available",
      thumbnail: post.preview?.url || "https://e621.net/static/logo.png",
      artists: post.tags.artist.length > 0 ? post.tags.artist.join(", ") : "Unknown",
      characters: post.tags.character.slice(0, 3).join(", ") || "No characters tagged",
      score: post.score.total || 0,
      favCount: post.fav_count || 0,
    }));
  } catch (error) {
    console.error("❌ Error fetching images from e621:", error.message);
    return null;
  }
}

// Fetch e621 User Profile
async function fetchE621User(username) {
  const url = `https://e621.net/users.json?search[name_matches]=${username}`;
  const apiKey = process.env.E621_API_KEY;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NappBot/1.0 (by Napp on e621)",
        Authorization: `Basic ${Buffer.from(`Napp:${apiKey}`).toString("base64")}`,
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
