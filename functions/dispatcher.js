const {
  getQuickPulse,
  getTrendline,
  compareBrands,
  getInfluencers,
  getActiveSubreddits,
  getEngagementOpportunities,
  getContentGaps,
  searchPosts,
  fetchComments
} = require("./apis/reddit");

async function handleFunctionCall(name, args) {
  switch (name) {
    case "getQuickPulse":
      return await getQuickPulse(args.keyword);

    case "getTrendline":
      return await getTrendline(args.keyword, args.days || 30);

    case "compareBrands":
      return await compareBrands(args.keywords);

    case "getInfluencers":
      return await getInfluencers(args.keyword, args.limit || 10);

    case "getActiveSubreddits":
      return await getActiveSubreddits(args.keyword, args.limit || 10);

    case "getEngagementOpportunities":
      return await getEngagementOpportunities(args.keyword, {
        maxAgeHours: args.maxAgeHours || 48,
        maxComments: args.maxComments || 3,
        limit: args.limit || 15,
      });

    case "getContentGaps":
      return await getContentGaps(args.keyword);

    case "searchPosts":
      return await searchPosts(args.keyword, {
        limit: args.limit || 50,
        sort: args.sort || "relevance",
        time: args.time || "all"
      });

    case "fetchComments":
      return await fetchComments(args.postId, {
        limit: args.limit || 100
      });

    default:
      throw new Error("Unknown function name: " + name);
  }
}

module.exports = { handleFunctionCall };
