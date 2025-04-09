const {
  getRedditPostsByKeyword,
  getCommentsFromPosts,
} = require("./apis/reddit");
const {getRedditInsight} = require("./apis/redditSentiment");

async function handleFunctionCall(name, args) {
  switch (name) {
    case "getRedditInsight":
      return await getRedditInsight({
        keyword: args.keyword || args.company,
        type: args.type || "both",
      });
  
    case "getRedditPostsByKeyword":
      return await getRedditPostsByKeyword(args.keyword, args.limit || 50);
  
    case "getCommentsFromPosts":
      return await getCommentsFromPosts(
        args.keyword,
        args.maxPosts || 5,
        args.commentsPerPost || 10
      );
  
    default:
      throw new Error("Unknown function name: " + name);
  }
}

module.exports = { handleFunctionCall };
