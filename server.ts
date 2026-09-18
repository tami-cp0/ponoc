import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { OpenAIProvider } from "./src/lib/llm/openai";
import { Session } from "./src/lib/session";
import type { ServerEvent } from "./src/lib/types";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const upgrade = app.getUpgradeHandler();
  const server = createServer((req, res) => handle(req, res));
  const wss = new WebSocketServer({ noServer: true });
  const provider = new OpenAIProvider();

  server.on("upgrade", (req, socket, head) => {
    if (req.url === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
    } else {
      upgrade(req, socket, head);
    }
  });

  wss.on("connection", (ws) => {
    const send = (event: ServerEvent) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(event));
    };
    const session = new Session(provider, send);

    session.start().catch(() => send({ type: "status", state: "stopped" }));

    ws.on("message", (data, isBinary) => {
      if (isBinary) session.audio(data as Buffer);
    });
    ws.on("close", () => session.stop());
    ws.on("error", () => session.stop());
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
