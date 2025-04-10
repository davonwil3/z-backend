const { get } = require('mongoose');
const OpenAI = require('openai');
const openai = new OpenAI(process.env.OPENAI_API_KEY)
const User = require('../models/User').User;
const Thread = require('../models/Thread');
const Message = require('../models/Message');
const { handleFunctionCall } = require("../functions/dispatcher");
const marked = require("marked");

// ---------------------------------------------------------------------------
// Helper – waits for a run to finish, servicing tool‑calls along the way
// ---------------------------------------------------------------------------

async function waitForRun(threadID, runID, handleFunctionCall) {
  let finalToolOutputs = [];

  while (true) {
    const run = await openai.beta.threads.runs.retrieve(threadID, runID);

    // ── 1. TOOL CALL ROUND ────────────────────────────────────────────────
    if (
      run.status === "requires_action" &&
      run.required_action?.type === "submit_tool_outputs"
    ) {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;

      const tool_outputs = await Promise.all(
        toolCalls.map(async (call) => {
          const fnName = call.function.name;
          const args = JSON.parse(call.function.arguments || "{}");
          const result = await handleFunctionCall(fnName, args);
          return {
            tool_call_id: call.id,
            output: JSON.stringify(result ?? {})
          };
        })
      );

      // Store the most recent tool outputs
      finalToolOutputs = tool_outputs;

      await openai.beta.threads.runs.submitToolOutputs(threadID, runID, {
        tool_outputs
      });

      // … same run continues; loop again
    }

    // ── 2. TERMINAL STATES ───────────────────────────────────────────────
    if (["completed", "failed", "cancelled", "expired"].includes(run.status)) {
      return {
        status: run.status,
        toolOutputs: finalToolOutputs
      };
    }

    // polite polling delay to stay under rate limits
    await new Promise((r) => setTimeout(r, 800));
  }
}


// ---------------------------------------------------------------------------
// Main Express handler
// ---------------------------------------------------------------------------
exports.sendMessage = async (req, res) => {
  const { threadID, text } = req.body;
  const userId = req.user._id;

  if (!text?.trim()) return res.status(400).send("Text is required");

  // ── 0. SSE HEADERS ──────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    // ── 1. GET / CREATE THREAD ───────────────────────────────────────────
    let thread;
    if (threadID) {
      thread = await Thread.findOne({ threadID, user: userId });
    } else {
      const openaiThread = await openai.beta.threads.create();
      thread = await Thread.create({
        threadID: openaiThread.id,
        title: text.slice(0, 40),
        user: userId
      });
    }
    if (!thread) throw new Error("Thread not found");

    // ── 2. CANCEL ANY LINGERING RUNS (defensive) ─────────────────────────
    const runs = await openai.beta.threads.runs.list(thread.threadID);
    const activeRuns = runs.data.filter((r) =>
      ["queued", "in_progress"].includes(r.status)
    );

    // Cancel all active runs in parallel
    await Promise.all(
      activeRuns.map((r) =>
        openai.beta.threads.runs.cancel(thread.threadID, r.id)
      )
    );

    // Poll each run until it's truly done or timeout hits (10s safety net)
    for (const r of activeRuns) {
      let status = r.status;
      const timeout = Date.now() + 10000; // 10 seconds max per run
      let attempts = 0;

      while (
        !["cancelled", "failed", "completed", "expired"].includes(status) &&
        Date.now() < timeout
      ) {
        await new Promise((res) => setTimeout(res, 500)); // polling interval
        const updatedRun = await openai.beta.threads.runs.retrieve(thread.threadID, r.id);
        status = updatedRun.status;
        attempts++;
      }

      if (!["cancelled", "failed", "completed", "expired"].includes(status)) {
        console.warn(`⚠️ Run ${r.id} did not cancel in time (attempts: ${attempts})`);
      } else {
        console.log(`✅ Run ${r.id} finished with status: ${status}`);
      }
    }


    // Cancel all active runs
    await Promise.all(
      activeRuns.map((r) =>
        openai.beta.threads.runs.cancel(thread.threadID, r.id)
      )
    );

    // Poll until all are fully cancelled
    for (const r of activeRuns) {
      let status = r.status;
      while (!["cancelled", "failed", "completed", "expired"].includes(status)) {
        await new Promise((res) => setTimeout(res, 500));
        const updatedRun = await openai.beta.threads.runs.retrieve(thread.threadID, r.id);
        status = updatedRun.status;
      }
    }

    // ── 3. SAVE USER MESSAGE LOCALLY ─────────────────────────────────────
    await Message.create({
      threadID: thread.threadID,
      text,
      sender: "user",
      user: userId
    });

    // ── 4. PUSH USER MESSAGE TO OPENAI THREAD ────────────────────────────
    await openai.beta.threads.messages.create(thread.threadID, {
      role: "user",
      content: text
    });

    // ── 5. CREATE RUN & WAIT UNTIL IT FINISHES (handles tool‑calls) ─────
    const run = await openai.beta.threads.runs.create(thread.threadID, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID
    });

    const { status, toolOutputs } = await waitForRun(thread.threadID, run.id, handleFunctionCall);


    // ── 6. FETCH ASSISTANT REPLY ─────────────────────────────────────────
    const msgs = await openai.beta.threads.messages.list(thread.threadID, { limit: 20 });
    const assistantMsg = msgs.data.find((m) => m.role === "assistant");
    const raw = assistantMsg?.content?.[0]?.text?.value || "";

    if (!raw.trim()) {
      res.write("event:error\ndata:No assistant response\n\n");
      return res.end();
    }

    // 7.5. Send structured data
    const structuredData = toolOutputs?.[0]?.output ? JSON.parse(toolOutputs[0].output) : null;
    if (structuredData) {
      res.write(`event:data\n`);
      res.write(`data: ${JSON.stringify({ structured: structuredData })}\n\n`);
    }
    // ── 7. STREAM TOKENS TO CLIENT (simulated) ───────────────────────────
    const tokens = raw.split(/(\s+)/); // keep whitespace
    for (const t of tokens) {
      if (t) res.write(`data: ${t}\n\n`);
      await new Promise((r) => setTimeout(r, 5)); // small delay for UX
    }

    

    // ── 8. PERSIST ASSISTANT MESSAGE LOCALLY ─────────────────────────────
    await Message.create({
      threadID: thread.threadID,
      text: marked.parse(raw),
      sender: "assistant",
      followUpQuestions: [],
      citations: [],
      user: userId
    });

    // ── 9. DONE ──────────────────────────────────────────────────────────
    res.write("event:done\ndata:[DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("sendMessage error:", err);
    res.write("event:error\ndata:Internal server error\n\n");
    res.end();
  }
};
