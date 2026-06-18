import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const dataflowDir = join(root, "projects", "dataflow-control-tower", "frontend");
const lumaDir = join(root, "frontend");
const publishDir = join(root, "netlify-dist");

function run(command, cwd, env = {}) {
  execSync(command, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
}

rmSync(publishDir, { recursive: true, force: true });
mkdirSync(publishDir, { recursive: true });

run("npm ci", dataflowDir);
run("npm run build", dataflowDir, { VITE_STATIC_DEMO: "true" });
cpSync(join(dataflowDir, "dist"), publishDir, { recursive: true });

run("npm ci", lumaDir);
run("npm run build -- --base=/lumaflow/", lumaDir);

const lumaPublishDir = join(publishDir, "lumaflow");
mkdirSync(lumaPublishDir, { recursive: true });
cpSync(join(lumaDir, "dist"), lumaPublishDir, { recursive: true });

if (!existsSync(join(publishDir, "index.html"))) {
  throw new Error("DataFlow build did not produce netlify-dist/index.html");
}

if (!existsSync(join(lumaPublishDir, "index.html"))) {
  throw new Error("Luma Flow build did not produce netlify-dist/lumaflow/index.html");
}
