// Single-Prompt Version – For Maximum Speed
// ------------------------------------------
// This merges posts + comments into ONE large prompt
// so we only call Gemini once.

const snoowrap = require("snoowrap");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getRedditPostsByKeyword, getCommentsFromPosts } = require("./reddit");

// ────────────────────────────────────────────────────────────
//  Reddit client setup
// ────────────────────────────────────────────────────────────
const reddit = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

// ────────────────────────────────────────────────────────────
//  Gemini client setup
// ────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// If you prefer a different model name, update below:
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function generateWithGemini(prompt) {
  const result = await geminiModel.generateContent(prompt);
  return result.response.text().trim();
}

// ────────────────────────────────────────────────────────────
//  Single-Prompt Summaries
// ────────────────────────────────────────────────────────────
async function getRedditInsight({ keyword, type = "both" }) {
  console.log(`🚀 Zorva is scanning Reddit for "${keyword}" [type: ${type}]...`);

  // Always fetch posts first – can reuse them for comments
  const basePosts = await getRedditPostsByKeyword(keyword, 15);

  const results = {
    company: keyword,
    typeAnalyzed: type,
    totalPosts: 0,
    totalComments: 0,
    sentimentReport: "",
  };

  // Gather all text in one place
  let allText = "";
  let typesUsed = [];

  // ── If analyzing posts ──────────────────────────
  if (type === "posts" || type === "both") {
    results.totalPosts = basePosts.length;
    console.log(`✅ Fetched ${basePosts.length} posts for "${keyword}"`);

    if (basePosts.length > 0) {
      typesUsed.push("posts");

      // Build a textual representation of all posts
      const postLines = basePosts.map((post, i) => {
        return `POST #${i + 1} \nTitle: ${post.title}\nBody: ${post.body}\n`;
      });

      allText += `\n\n=== REDDIT POSTS ===\n\n` + postLines.join("\n\n");
    } else {
      console.log("❌ No posts found.");
    }
  }

  // ── If analyzing comments ──────────────────────
  if (type === "comments" || type === "both") {
    const comments = await getCommentsFromPosts(basePosts, 20);
    results.totalComments = comments.length;
    console.log(`✅ Fetched ${comments.length} comments for "${keyword}"`);

    if (comments.length > 0) {
      typesUsed.push("comments");

      // Build a textual representation of all comments
      const commentLines = comments.map((c, i) => {
        return `COMMENT #${i + 1}:\n${c.body}\n`;
      });

      allText += `\n\n=== REDDIT COMMENTS ===\n\n` + commentLines.join("\n\n");
    }
  }

  // If we ended up with zero data, just return
  if (!allText.trim()) {
    return results; // empty
  }

  // ── Construct single prompt with everything ─────────────
  const typesString = typesUsed.join(" and ") || "";
  const finalPrompt = `You are Zorva, an AI that turns social data into business insights.\n\n` +
    `Analyze these Reddit ${typesString} about \"${keyword}\".\n` +
    `1) Provide a ZScore (0–100) for overall sentiment.\n` +
    `2) List bullet points for key insights.\n` +
    `3) Briefly describe the emotional tone of the discussion.\n\n` +
    `Here is the data:\n` + allText;

  // ── Make ONE call to Gemini with entire content ─────────
  results.sentimentReport = await generateWithGemini(finalPrompt);

  console.log("✅ Zorva finished insight generation.");
  return results;
}

module.exports = {
  getRedditInsight,
};
