import express from "express";
import { createServer } from "http";
import path from "path";
import bodyParser from "body-parser";
import dotenv from "dotenv";

import { setupWebSocketServer } from "./services/webSocketService.js";
import { renderLogin, renderRoom, handleNameSubmission } from "./routes/routes.js";

dotenv.config();

const app = express();
const server = createServer(app);
const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(path.resolve(), "views"));

setupWebSocketServer(server);

app.get("/", renderLogin);
app.get("/room/:code", renderRoom);
app.post("/submit-name", handleNameSubmission);

// Render's load balancer has a 75s idle timeout; keep-alive must be shorter
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Listening on port ${port}`));

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down`);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});
