const snoowrap = require("snoowrap");

const reddit = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

/**
 * Search Reddit posts by keyword
 * @param {string} keyword
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getRedditPostsByKeyword(keyword, limit = 15) {
  try {
    const posts = await reddit.search({
      query: keyword,
      sort: "relevance",
      time: "week",
      limit,
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      body: post.selftext,
      score: post.score,
      subreddit: post.subreddit.display_name,
      url: `https://reddit.com${post.permalink}`,
    }));
  } catch (err) {
    console.error("Reddit API error (posts):", err);
    return [];
  }
}


// ✅ New function: fetch top-level comments from found posts
async function getCommentsFromPosts(posts, commentsPerPost = 20) {
  const MAX_COMMENTS = 300;
  const allComments = [];

  for (const post of posts) {
    // Stop completely if we've already reached 300
    if (allComments.length >= MAX_COMMENTS) break;

    try {
      // Expand replies with a per-post limit (defaults to 20)
      const submission = await reddit.getSubmission(post.id).expandReplies({
        limit: commentsPerPost,
        depth: 1,
      });

      // Filter out removed or deleted comments
      let comments = submission.comments
        .filter(
          (c) => c.body && !c.body.includes("[deleted]") && !c.body.includes("[removed]")
        )
        .map((c) => ({
          body: c.body,
          score: c.score,
          subreddit: post.subreddit,
          permalink: `https://reddit.com${c.permalink || post.url}`,
        }));

      // Only take as many as we still need up to 300 total
      const availableSlots = MAX_COMMENTS - allComments.length;
      comments = comments.slice(0, availableSlots);

      allComments.push(...comments);
    } catch (err) {
      console.error(`Comments failed for post ${post.id}:`, err.message);
    }
  }

  return allComments;
}

module.exports = {
  getRedditPostsByKeyword,
  getCommentsFromPosts,
};
