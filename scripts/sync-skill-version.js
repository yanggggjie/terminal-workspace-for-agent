#!/usr/bin/env node
/**
 * Sync skills/tta/SKILL.md frontmatter version from package.json.
 * Runs on npm "version" lifecycle (before the version git commit).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const { version } = require(path.join(root, "package.json"));
const skillPath = path.join(root, "skills/tta/SKILL.md");

let content = fs.readFileSync(skillPath, "utf8");

if (/^version:\s*.+$/m.test(content)) {
  content = content.replace(/^version:\s*.+$/m, `version: ${version}`);
} else {
  content = content.replace(/^---\r?\n/, `---\nversion: ${version}\n`);
}

fs.writeFileSync(skillPath, content);
process.stdout.write(`sync-skill-version: ${version}\n`);
