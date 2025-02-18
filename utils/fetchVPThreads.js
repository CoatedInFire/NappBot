const fetch = require("node-fetch");
const { decode } = require("html-entities");

async function fetchVPThreads() {
  const url = "https://a.4cdn.org/vp/catalog.json";
  try {
    console.log(`Fetching threads from: ${url}`);
    const response = await fetch(url);

    if (!response.ok)
      throw new Error(`4chan API error: ${response.statusText}`);

    const data = await response.json();
    if (!data || data.length === 0) return null;
    const allThreads = data.slice(0, 10).flatMap((page) => page.threads);
    if (allThreads.length === 0) return null;

    return allThreads.map((thread) => ({
      threadId: thread.no,
      subject: decode(thread.sub || "No title"),
      comment: decode(
        (thread.com || "No description")
          .replace(/<br\s*\/?>/g, "\n")
          .replace(/<[^>]*>/g, "")
      ),
      threadUrl: `https://boards.4channel.org/vp/thread/${thread.no}`,
      thumbnail: thread.tim ? `https://i.4cdn.org/vp/${thread.tim}s.jpg` : null,
    }));
  } catch (error) {
    console.error("❌ Error fetching /vp/ threads:", error.message);
    return null;
  }
}

module.exports = { fetchVPThreads };
