import cors from "cors";
import express, { type Request, type Response } from "express";
import { Codex } from "@openai/codex-sdk";
import path from "path";
import { randomUUID } from "crypto";

type ThreadRecord = {
  thread: any;
};

type RunRecord = {
  id: string;
  threadId: string;
  prompt: string;
  buffer: string[];
  subscribers: Set<express.Response>;
  status: "running" | "completed" | "error";
};

const PORT = Number(process.env.PORT || "8081");
const WORKSPACES_ROOT = process.env.WORKSPACES_ROOT || "/workspaces";

const codex = new Codex();

const threads = new Map<string, ThreadRecord>();
const runs = new Map<string, RunRecord>();

function mustResolveWorkspace(p: string): string {
  const root = path.resolve(WORKSPACES_ROOT);
  const resolved = path.resolve(p);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("workingDirectory must be under WORKSPACES_ROOT");
  }
  return resolved;
}

function sseSend(res: express.Response, dataObj: unknown) {
  res.write(`data: ${JSON.stringify(dataObj)}\n\n`);
}

function publish(run: RunRecord, dataObj: unknown) {
  const line = `data: ${JSON.stringify(dataObj)}\n\n`;
  run.buffer.push(line);
  for (const sub of run.subscribers) {
    sub.write(line);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.post("/threads", async (req: Request, res: Response) => {
  try {
    const workingDirectory = mustResolveWorkspace(String(req.body?.workingDirectory || WORKSPACES_ROOT));
    const skipGitRepoCheck = Boolean(req.body?.skipGitRepoCheck ?? false);

    const thread = codex.startThread({ workingDirectory, skipGitRepoCheck });
    const threadId = randomUUID();
    threads.set(threadId, { thread });

    res.json({ threadId });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "error" });
  }
});

app.post("/runs", async (req: Request, res: Response) => {
  const threadId = String(req.body?.threadId || "");
  const prompt = req.body?.prompt;

  if (!threadId || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "threadId and prompt are required" });
    return;
  }

  const threadRecord = threads.get(threadId);
  if (!threadRecord) {
    res.status(404).json({ error: "thread not found" });
    return;
  }

  const runId = randomUUID();
  const run: RunRecord = {
    id: runId,
    threadId,
    prompt,
    buffer: [],
    subscribers: new Set(),
    status: "running",
  };
  runs.set(runId, run);

  res.json({ runId });

  (async () => {
    try {
      publish(run, { type: "run.started", runId, threadId });
      const { events } = await threadRecord.thread.runStreamed(prompt);
      for await (const event of events) {
        publish(run, event);
      }
      run.status = "completed";
      publish(run, { type: "run.completed", runId, threadId });
      for (const sub of run.subscribers) {
        sub.end();
      }
      run.subscribers.clear();
    } catch (err: any) {
      run.status = "error";
      publish(run, { type: "error", message: err?.message || "error" });
      for (const sub of run.subscribers) {
        sub.end();
      }
      run.subscribers.clear();
    }
  })();
});

app.get("/runs/:runId/events", (req: Request, res: Response) => {
  const runId = req.params.runId;
  const run = runs.get(runId);
  if (!run) {
    res.status(404).json({ error: "run not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders?.();
  res.write(`: connected\n\n`);

  for (const line of run.buffer) {
    res.write(line);
  }

  if (run.status !== "running") {
    sseSend(res, { type: "stream.closed", runId, status: run.status });
    res.end();
    return;
  }

  run.subscribers.add(res);

  req.on("close", () => {
    run.subscribers.delete(res);
  });
});

app.listen(PORT, () => {
  console.log(`runner listening on ${PORT}`);
});
