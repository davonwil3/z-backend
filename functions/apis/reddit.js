// redditInsights.js – magical & insightful version
// -----------------------------------------------------------------------------------------------
// Provides deeply actionable Reddit intelligence with context-rich insights, post URLs, titles, and real comment content.

const Snoowrap = require("snoowrap");
const Sentiment = require("sentiment");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const reddit = new Snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const sentiment = new Sentiment();

const llm = async (prompt) => (await geminiModel.generateContent(prompt)).response.text().trim();

async function searchPosts(keyword, { limit = 50, sort = "relevance", time = "all" } = {}) {
  const posts = await reddit.search({ query: keyword, limit, sort, time });
  console.log(`🔍 Fetched ${posts.length} posts for keyword: ${keyword}`);
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.selftext,
    score: p.score,
    num_comments: p.num_comments,
    created_utc: p.created_utc,
    subreddit: p.subreddit.display_name,
    author: p.author?.name ?? "unknown",
    url: `https://reddit.com${p.permalink}`,
  }));
}

async function fetchComments(postId, { limit = 100 } = {}) {
  const submission = await reddit.getSubmission(postId).expandReplies({ limit, depth: 1 });
  console.log(`🔍 Fetched ${submission.comments.length} comments for post ID: ${postId}`);
  return submission.comments
    .filter((c) => c.body && !c.body.includes("[deleted]") && !c.body.includes("[removed]"))
    .map((c) => ({
      body: c.body,
      score: c.score,
      created_utc: c.created_utc,
      author: c.author?.name ?? "unknown",
      permalink: `https://reddit.com${c.permalink}`,
    }));
}

const scoreSentiment = (txt) => {
  const { score } = sentiment.analyze(txt);
  return Math.max(0, Math.min(100, Math.round((score + 10) * 5)));
};

async function getQuickPulse(keyword) {
  console.log(`🔍 Getting quick pulse for: ${keyword}`);
  const posts = await searchPosts(keyword, { limit: 20, sort: "new", time: "month" });
  const comments = [];
  const topPosts = posts.slice(0, 10);
  for (const p of topPosts) {
    const c = await fetchComments(p.id, { limit: 5 });
    comments.push(...c);
  }

  const formattedPosts = topPosts.map(p => `🔹 ${p.title}\n${p.body}\n🔗 ${p.url}`).join("\n\n");
  const formattedComments = comments.map(c => `💬 ${c.body}\n👤 u/${c.author} — 🔗 ${c.permalink}`).join("\n\n");

  const geminiPrompt = `You are a Reddit analyst AI. Your job is to summarize discussions around the topic: "${keyword}".

Please provide:
1. Five common discussion themes (praise, complaints, questions, trends, etc.)
2. Emotional tone overall (e.g. hopeful, frustrated, excited)
3. Two comment quotes that capture strong opinions
4. Mention any post titles that are relevant, along with their URLs

Use bullet points. Do NOT provide conclusions or strategic suggestions.`;

  const summaryText = await llm(`${geminiPrompt}\n\nReddit Posts:\n${formattedPosts}\n\nTop Comments:\n${formattedComments}`);

  return {
    keyword,
    summaryData: summaryText,
    relevantPosts: topPosts.map((p) => ({
      title: p.title,
      url: p.url,
      score: p.score,
      subreddit: p.subreddit,
      comments: p.num_comments,
      excerpt: p.body?.slice(0, 200) + "..."
    })),
    relevantComments: comments.slice(0, 5).map(c => ({
      body: c.body,
      author: c.author,
      score: c.score,
      permalink: c.permalink
    }))
  };
}

async function getTrendline(keyword, days = 30) {
  console.log(`🔍 Getting trendline for: ${keyword} over ${days} days`);
  const ONE_DAY = 86400;
  const now = Math.floor(Date.now() / 1000);
  const buckets = Array.from({ length: days }, () => []);
  const posts = await searchPosts(keyword, { limit: 300, sort: "new", time: "year" });
  posts.forEach((p) => {
    const age = Math.floor((now - p.created_utc) / ONE_DAY);
    if (age < days) buckets[age].push(p.title + " " + p.body);
  });
  const trend = buckets.map((texts, idx) => ({
    dayAgo: days - idx,
    sentiment: texts.length ? Math.round(texts.reduce((a, t) => a + scoreSentiment(t), 0) / texts.length) : null,
  }));
  return { keyword, trend };
}

async function compareBrands(keywords) {
  console.log(`🔍 Comparing brands: ${keywords.join(", ")}`);
  const pulses = await Promise.all(keywords.map(getQuickPulse));

  const comparePrompt = `You are Zorva, a strategist. Compare user sentiment around these brands:\n` +
    pulses.map((p) => `• ${p.keyword}`).join("\n") +
    `\nGive individual summaries. Do not rank them.`

  const summary = await llm(comparePrompt);

  return {
    summary,
    brands: pulses.map(p => ({
      keyword: p.keyword,
      zScore: p.ZScore,
      posts: p.relevantPosts,
      comments: p.relevantComments
    }))
  };
}


async function getInfluencers(keyword, limit = 10) {
  console.log(`🔍 Finding top influencers for: ${keyword}`);
  const posts = await searchPosts(keyword, { limit: 100, sort: "comments", time: "month" });
  const counts = {};
  posts.forEach((p) => { counts[p.author] = (counts[p.author] || 0) + 1; });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([user, count]) => ({ user, posts: count }));
}

async function getActiveSubreddits(keyword, limit = 10) {
  console.log(`🔍 Finding active subreddits for: ${keyword}`);
  const posts = await searchPosts(keyword, { limit: 300, sort: "new", time: "month" });

  const tally = {};
  posts.forEach((p) => { tally[p.subreddit] = (tally[p.subreddit] || 0) + 1; });

  const topSubs = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([sub, count]) => ({
      subreddit: sub,
      recentMentions: count,
      url: `https://reddit.com/r/${sub}`
    }));

  const summary = await llm(`Which subreddits are most active for "${keyword}" and what are people discussing there?\n\n${topSubs.map(s => `r/${s.subreddit}: ${s.recentMentions} mentions`).join("\n")}`);

  return {
    summary,
    subreddits: topSubs
  };
}


async function getEngagementOpportunities(keyword, { maxAgeHours = 48, maxComments = 3, limit = 15 } = {}) {
  console.log(`🔍 Finding engagement opportunities for: ${keyword}`);
  const posts = await searchPosts(keyword, { limit: 200, sort: "new", time: "week" });
  const cutoff = Date.now() / 1000 - maxAgeHours * 3600;

  const filtered = posts
    .filter((p) => p.created_utc >= cutoff && p.num_comments <= maxComments)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const summary = await llm(`You're a growth strategist. Here are posts about "${keyword}" with high score but low comments:\n\n${filtered.map(p => `${p.title} (${p.score} pts, ${p.num_comments} comments)`).join("\n")}\n\nWhat are good engagement opportunities here?`);

  return {
    summary,
    opportunities: filtered
  };
}


async function getContentGaps(keyword) {
  console.log(`🔍 Finding content gaps for: ${keyword}`);
  const posts = await searchPosts(keyword, { limit: 40, sort: "relevance", time: "year" });
  const postSnippets = posts.map((p) => `• ${p.title}\n${p.body}`).join("\n\n");

  const prompt = `You are Zorva. Based on Reddit posts about "${keyword}", list:
- Unanswered user questions
- Missing features or unmet needs
- Common frustrations

Limit to 5–10 bullet points.\n\n${postSnippets}`;

  const summary = await llm(prompt);

  return {
    summary,
    posts
  };
}

module.exports = {
  searchPosts,
  fetchComments,
  getQuickPulse,
  getTrendline,
  compareBrands,
  getInfluencers,
  getActiveSubreddits,
  getEngagementOpportunities,
  getContentGaps,
};
