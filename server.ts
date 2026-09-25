import { createServer } from "node:http";
import next from "next";
import { getUser } from "./src/server/auth";
import { closeDb } from "./src/server/db";
import { assertEnv, env } from "./src/server/env";
import { createGateway } from "./src/server/gateway";
import { OpenAIProvider } from "./src/server/llm/openai";
import { Session } from "./src/server/session/Session";
import { getBalanceMicros } from "./src/server/usage/credits";
import { createUsageRecord, saveUsage } from "./src/server/usage/store";

assertEnv();
const prices = env.prices;

const app = next({ dev: !env.isProduction });

app.prepare().then(() => {
  const handleRequest = app.getRequestHandler();
  const handleNextUpgrade = app.getUpgradeHandler();
  const provider = new OpenAIProvider();

  const gateway = createGateway({
    siteUrl: env.siteUrl,
    getUser,
    getBalance: getBalanceMicros,
    createSession: (send) => new Session(provider, send, prices),
    usageStore: { create: createUsageRecord, save: saveUsage },
  });

  const server = createServer((req, res) => handleRequest(req, res));

  server.on("upgrade", (req, socket, head) => {
    if (req.url?.split("?")[0] === "/ws") gateway.handleUpgrade(req, socket, head);
    else handleNextUpgrade(req, socket, head);
  });

  server.listen(env.port, () => {
    console.log(`> Ready on http://localhost:${env.port}`);
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("> Shutting down…");
    server.close();
    await gateway.shutdown();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
