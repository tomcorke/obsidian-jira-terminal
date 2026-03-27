import esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import http from "http";
import crypto from "crypto";

const isProduction = process.argv.includes("--production");
const isWatch = process.argv.includes("--watch");

const pluginDir = resolve(
  process.env.HOME,
  "working/obsidian/test-vault/Test/.obsidian/plugins/work-terminal"
);

mkdirSync(pluginDir, { recursive: true });

function triggerHotReload() {
  if (!isWatch) return;
  http.get("http://localhost:9222/json", (res) => {
    let data = "";
    res.on("data", (chunk) => { data += chunk; });
    res.on("end", () => {
      try {
        const targets = JSON.parse(data);
        const target = targets.find((t) => t.type === "page");
        if (!target) return;
        const wsUrl = target.webSocketDebuggerUrl;
        if (!wsUrl) return;
        const url = new URL(wsUrl);
        const key = crypto.randomBytes(16).toString("base64");
        const req = http.request({
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: "GET",
          headers: {
            Upgrade: "websocket",
            Connection: "Upgrade",
            "Sec-WebSocket-Key": key,
            "Sec-WebSocket-Version": "13",
          },
        });
        req.on("upgrade", (_res, socket) => {
          const expression = `app.commands.executeCommandById('work-terminal:reload-plugin')`;
          const msg = JSON.stringify({
            id: 1,
            method: "Runtime.evaluate",
            params: { expression, returnByValue: true, awaitPromise: true },
          });
          const payload = Buffer.from(msg);
          const mask = crypto.randomBytes(4);
          let header;
          if (payload.length < 126) {
            header = Buffer.alloc(6);
            header[0] = 0x81;
            header[1] = 0x80 | payload.length;
            mask.copy(header, 2);
          } else {
            header = Buffer.alloc(8);
            header[0] = 0x81;
            header[1] = 0x80 | 126;
            header.writeUInt16BE(payload.length, 2);
            mask.copy(header, 4);
          }
          const masked = Buffer.alloc(payload.length);
          for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
          socket.write(Buffer.concat([header, masked]));
          socket.on("data", () => {
            socket.destroy();
            console.log("Hot reload triggered via CDP");
          });
          setTimeout(() => socket.destroy(), 3000);
        });
        req.on("error", () => {});
        req.end();
        setTimeout(() => req.destroy(), 5000);
      } catch {
        // Obsidian not running - silent
      }
    });
  }).on("error", () => {});
}

let isFirstBuild = true;

const copyPlugin = {
  name: "copy-assets",
  setup(build) {
    build.onEnd(() => {
      copyFileSync("manifest.json", resolve(pluginDir, "manifest.json"));
      copyFileSync("styles.css", resolve(pluginDir, "styles.css"));
      console.log("Copied manifest.json and styles.css to plugin dir");
      if (isWatch && !isFirstBuild) {
        triggerHotReload();
      }
      isFirstBuild = false;
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: resolve(pluginDir, "main.js"),
  format: "cjs",
  platform: "node",
  external: [
    "obsidian",
    "electron",
    "child_process",
    "fs",
    "path",
    "os",
    "string_decoder",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
  ],
  minify: isProduction,
  sourcemap: isProduction ? false : "inline",
  treeShaking: true,
  plugins: [copyPlugin],
});

if (isWatch) {
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
