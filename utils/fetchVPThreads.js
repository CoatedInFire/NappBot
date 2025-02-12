const fetch = require("node-fetch");
const { decode } = require("html-entities");

async function fetchVPThreads() {
  const pagesToFetch = 10;
  const allThreads = [];

  try {
    for (let i = 0; i < pagesToFetch; i++) {
      const response = await fetch(`https://a.4cdn.org/vp/${i}.json`);
      if (!response.ok)
        throw new Error(`4chan API error: ${response.statusText}`);

      const data = await response.json();
      allThreads.push(...data.threads);
    }

    if (allThreads.length === 0) return null;

    return allThreads.map((thread) => ({
      threadId: thread.no,
      subject: decode(thread.sub || "No title"),
      comment: decode(
        thread.com ? thread.com.replace(/<br\s*\/?>/g, "\n") : "No description"
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
