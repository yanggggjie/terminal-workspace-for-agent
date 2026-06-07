#!/usr/bin/env node
/**
 * Sync skill frontmatter versions from package.json.
 * Runs on npm "version" lifecycle (before the version git commit).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const { version } = require(path.join(root, "package.json"));
const skillPaths = [
  path.join(root, "skills/tta/SKILL.md"),
  path.join(root, "skills/tta/tta-agents-skill.md"),
];

for (const skillPath of skillPaths) {
  let content = fs.readFileSync(skillPath, "utf8");

  if (/^version:\s*.+$/m.test(content)) {
    content = content.replace(/^version:\s*.+$/m, `version: ${version}`);
  } else {
    content = content.replace(/^---\r?\n/, `---\nversion: ${version}\n`);
  }

  fs.writeFileSync(skillPath, content);
}

process.stdout.write(`sync-skill-version: ${version} (${skillPaths.length} skills)\n`);
