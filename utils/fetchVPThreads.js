const fetch = require("node-fetch");

// Fetch all active /vp/ threads and return a random selection
async function fetchVPThreads() {
  const url = "https://a.4cdn.org/vp/catalog.json";

  try {
    console.log("[DEBUG] Fetching /vp/ catalog...");
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`4chan API error: ${response.statusText}`);

    const data = await response.json();
    if (!data || data.length === 0) return null;

    // Flatten all pages (first 10) into one thread list
    const threads = data.flatMap((page) => page.threads);
    if (threads.length === 0) return null;

    // Randomize thread selection
    const shuffledThreads = threads.sort(() => Math.random() - 0.5); // Shuffle array

    // Return a limited number of random threads (e.g., first 20 shuffled ones)
    return shuffledThreads.slice(0, 20).map((thread) => ({
      threadId: thread.no,
      subject: thread.sub || "No title",
      comment: thread.com
        ? thread.com.replace(/<[^>]*>/g, "")
        : "No description",
      threadUrl: `https://boards.4channel.org/vp/thread/${thread.no}`,
      thumbnail: thread.tim ? `https://i.4cdn.org/vp/${thread.tim}s.jpg` : null,
    }));
  } catch (error) {
    console.error("❌ Error fetching /vp/ threads:", error.message);
    return null;
  }
}

module.exports = { fetchVPThreads };
