#!/usr/bin/env node
/**
 * Smoke test: builds nothing itself (run `npm run build` first), starts the
 * REAL production server (`next start`), and uploads a real PDF through the
 * actual /api/candidates/parse route.
 *
 * This exists because of a real production bug that unit tests structurally
 * cannot catch: src/lib/parseCv.ts used require.resolve() to locate a font
 * data directory, which works fine in Node directly (including inside
 * vitest) but gets rewritten to a numeric webpack module ID once the file
 * is bundled — breaking only in the actual built/deployed app. Unit tests
 * and `next build`'s type-check both passed while that bug was live; only
 * running the real server and hitting it with a real request caught it.
 * This script is that check, automated.
 */
import { spawn, execSync } from "child_process";
import { readFileSync } from "fs";
import { createHash } from "crypto";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const PASSWORD = process.env.DASHBOARD_PASSWORD || "change-me";

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function waitForServer(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        await fetch(url);
        resolve();
      } catch {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server did not become ready within ${timeoutMs}ms`));
        } else {
          setTimeout(tick, 300);
        }
      }
    };
    tick();
  });
}

async function main() {
  console.log(`Starting production server on port ${PORT}...`);
  // The route this test exercises (/api/candidates/parse) never touches the
  // database or calls Gemini — it only needs DASHBOARD_PASSWORD to pass the
  // auth middleware, so this runs standalone without real secrets.
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    env: { ...process.env, DASHBOARD_PASSWORD: PASSWORD },
    // On POSIX, run in its own process group so cleanup() can kill the
    // whole tree (shell wrapper + the actual next-server it launches) at
    // once instead of just the shell, which wouldn't forward the signal.
    detached: process.platform !== "win32",
  });

  let serverOutput = "";
  server.stdout.on("data", (d) => (serverOutput += d.toString()));
  server.stderr.on("data", (d) => (serverOutput += d.toString()));

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    // `shell: true` spawns `next start` under a cmd.exe/sh wrapper, so
    // server.kill() only kills that wrapper, not the actual next-server
    // process it launches — the real server (and this script) would hang
    // around after exit. Kill the whole process tree instead.
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
      } catch {
        // already exited
      }
    } else {
      try {
        process.kill(-server.pid, "SIGKILL");
      } catch {
        // already exited
      }
    }
  };
  process.on("exit", cleanup);

  try {
    await waitForServer(BASE_URL, 30000);
    console.log("Server is up. Uploading fixture PDF through the real API route...");

    const sessionCookie = sha256(PASSWORD);
    const fileBuffer = readFileSync(new URL("../test-fixtures/sample-resume.pdf", import.meta.url));
    const form = new FormData();
    form.append("file", new Blob([fileBuffer], { type: "application/pdf" }), "sample-resume.pdf");

    const res = await fetch(`${BASE_URL}/api/candidates/parse`, {
      method: "POST",
      headers: { Cookie: `kargo_session=${sessionCookie}` },
      body: form,
    });

    const body = await res.json();

    if (!res.ok) {
      console.error("Server output:\n" + serverOutput);
      throw new Error(`Expected HTTP 200, got ${res.status}: ${JSON.stringify(body)}`);
    }

    if (body.detected?.name !== "Test Candidate" || body.detected?.email !== "test.fixture@example.com") {
      throw new Error(`Unexpected detected fields: ${JSON.stringify(body.detected)}`);
    }

    if (!body.cvText || body.cvText.split("\n").length < 3) {
      throw new Error(
        `Expected multi-line extracted text, got: ${JSON.stringify(body.cvText)} — line reconstruction may be broken.`
      );
    }

    console.log("PASS — real PDF upload through the real production server succeeded:");
    console.log("  detected:", body.detected);
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED:", err.message);
  process.exit(1);
});
