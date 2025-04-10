[
  {
    "name": "getQuickPulse",
    "description": "Get a one-shot summary of Reddit sentiment, user insights, and emotions for a given keyword.",
    "parameters": {
      "type": "object",
      "properties": {
        "keyword": {
          "type": "string",
          "description": "Topic or brand to analyze on Reddit"
        }
      },
      "required": ["keyword"]
    }
  },
  {
    "name": "getTrendline",
    "description": "Get a day-by-day sentiment trend over time for a Reddit topic.",
    "parameters": {
      "type": "object",
      "properties": {
        "keyword": {
          "type": "string",
          "description": "Topic or brand to analyze"
        },
        "days": {
          "type": "integer",
          "description": "Number of past days to include (default: 30)",
          "default": 30
        }
      },
      "required": ["keyword"]
    }
  },
  {
    "name": "compareBrands",
    "description": "Compare multiple brands or topics based on Reddit sentiment and insights.",
    "parameters": {
      "type": "object",
      "properties": {
        "keywords": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "List of brands or keywords to compare"
        }
      },
      "required": ["keywords"]
    }
  },
  {
    "name": "getInfluencers",
    "description": "Identify top Reddit users frequently posting about a keyword.",
    "parameters": {
      "type": "object",
      "properties": {
        "keyword": {
          "type": "string",
          "description": "Topic or brand to search"
        },
        "limit": {
          "type": "integer",
          "description": "Number of top users to return (default: 10)",
          "default": 10
        }
      },
      "required": ["keyword"]
    }
  },
  {
    "name": "getActiveSubreddits",
    "description": "Find the most active subreddits discussing a given topic.",
    "parameters": {
      "type": "object",
      "properties": {
        "keyword": {
          "type": "string",
          "description": "Topic or keyword to check for subreddit activity"
        },
        "limit": {
          "type": "integer",
          "description": "Number of subreddits to return (default: 10)",
          "default": 10
        }
      },
      "required": ["keyword"]
    }
  },
  {
    "name": "getEngagementOpportunities",
    "description": "Find recent Reddit posts with high visibility and low engagement.",
    "parameters": {
      "type": "object",
      "properties": {
        "keyword": {
          "type": "string",
          "description": "Topic or keyword to find engagement opportunities"
        },
        "maxAgeHours": {
          "type": "integer",
          "description": "Max age of posts in hours (default: 48)",
          "default": 48
        },
        "maxComments": {
          "type": "integer",
          "description": "Max number of comments (default: 3)",
          "default": 3
        },
        "limit": {
          "type": "integer",
          "description": "Number of posts to return (default: 15)",
          "default": 15
        }
      },
      "required": ["keyword"]
    }
  },
  {
    "name": "getContentGaps",
    "description": "Find Reddit questions, requests, or problems that are currently underserved.",
    "parameters": {
      "type": "object",
      "properties": {
        "keyword": {
          "type": "string",
          "description": "Topic or product to analyze for gaps or unmet needs"
        }
      },
      "required": ["keyword"]
    }
  }
]

  