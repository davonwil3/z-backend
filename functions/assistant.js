const functions = [
    {
      name: "getRedditTrendingTopics",
      description: "Fetch trending Reddit discussions on a topic.",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "The topic to search Reddit for."
          }
        },
        required: ["keyword"]
      }
    }
  ];
  