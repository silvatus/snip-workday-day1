import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = join(rootDir, "backend");
const frontendDir = join(rootDir, "frontend");
const cliDir = join(rootDir, "cli");
const bundleDir = join(rootDir, "bundle");
const frontendOutputDir = join(
  frontendDir,
  "dist",
  "snip-frontend",
  "browser",
);
const publicDir = join(bundleDir, "public");
const push = process.argv.includes("--push");
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--push");

if (unknownArguments.length > 0) {
  throw new Error(`Unknown argument: ${unknownArguments[0]}`);
}

function run(command, args, options = {}) {
  const cwd = options.cwd ?? rootDir;
  console.log(`> ${command} ${args.join(" ")}`);

  const result = spawnSync(command, args, {
    cwd,
    shell: options.shell ?? false,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function hasStagedChanges(cwd) {
  const result = spawnSync("git", ["diff", "--cached", "--quiet"], {
    cwd,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status === 0) {
    return false;
  }

  if (result.status === 1) {
    return true;
  }

  throw new Error(`git diff --cached --quiet exited with status ${result.status}`);
}

function writeGeneratedFile(relativePath, contents) {
  writeFileSync(join(bundleDir, relativePath), contents, "utf8");
}

console.log("Updating source submodules...");
run("git", [
  "submodule",
  "update",
  "--init",
  "--remote",
  "backend",
  "frontend",
  "cli",
]);

console.log("Building frontend...");
const useShell = process.platform === "win32";
run("npm", ["install"], { cwd: frontendDir, shell: useShell });
run("npx", ["ng", "build"], { cwd: frontendDir, shell: useShell });

const frontendIndex = join(frontendOutputDir, "index.html");
if (!existsSync(frontendIndex)) {
  throw new Error(`Frontend build output is missing: ${frontendIndex}`);
}

console.log("Assembling bundle...");
copyFileSync(join(backendDir, "server.js"), join(bundleDir, "server.js"));
copyFileSync(join(cliDir, "cli.js"), join(bundleDir, "cli.js"));
rmSync(publicDir, { force: true, recursive: true });
cpSync(frontendOutputDir, publicDir, { recursive: true });

writeGeneratedFile(".env", "PUBLIC_DIR=./public\n");
writeGeneratedFile(
  "package.json",
  `${JSON.stringify(
    {
      name: "snip-bundle",
      private: true,
      scripts: {
        start: "bun server.js",
      },
    },
    null,
    2,
  )}\n`,
);
writeGeneratedFile(
  "Dockerfile",
  `FROM oven/bun:1-alpine
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "server.js"]
`,
);
writeGeneratedFile(
  ".dockerignore",
  `.git
node_modules
npm-debug.log
`,
);
writeGeneratedFile(
  "railway.json",
  `${JSON.stringify(
    {
      $schema: "https://railway.com/railway.schema.json",
      build: {
        builder: "DOCKERFILE",
      },
    },
    null,
    2,
  )}\n`,
);

run("git", ["add", "--all"], { cwd: bundleDir });
if (hasStagedChanges(bundleDir)) {
  run("git", ["commit", "-m", "Regenerate bundle"], { cwd: bundleDir });
} else {
  console.log("Bundle: nothing to commit.");
}

run("git", [
  "add",
  "--",
  ".gitmodules",
  "backend",
  "frontend",
  "cli",
  "bundle",
]);
if (hasStagedChanges(rootDir)) {
  run("git", ["commit", "-m", "Update generated bundle"]);
} else {
  console.log("Superproject: nothing to commit.");
}

if (push) {
  console.log("Pushing generated bundle and superproject...");
  run("git", ["push", "origin", "HEAD:bundle"], { cwd: bundleDir });
  run("git", ["push", "origin", "main"]);
}