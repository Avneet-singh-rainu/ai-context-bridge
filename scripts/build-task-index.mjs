// Rebuilds the task table in docs/README.md from every docs/issue-*/ticket.yaml.
//
// Usage:
//   node scripts/build-task-index.mjs           rewrite docs/README.md
//   node scripts/build-task-index.mjs --check   exit 1 if docs/README.md is out of date
//
// No dependencies: ticket.yaml files are flat "key: value" lines, so a full YAML parser is not
// needed. As in YAML, " #" starts a comment, so a title must not contain " #".

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const indexPath = join(docsDir, 'README.md');

function readTicket(ticketPath) {
  const ticket = {};
  for (const line of readFileSync(ticketPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([a-z_]+):(.*)$/);
    if (!match) continue;
    const value = match[2].replace(/\s+#.*$/, '').trim();
    ticket[match[1]] = value.replace(/^(['"])(.*)\1$/, '$2');
  }
  return ticket;
}

function issueNumber(folderName) {
  return Number(folderName.match(/^issue-(\d+)/)[1]);
}

function cell(value) {
  return (value || '-').replace(/\|/g, '\\|');
}

const ticketFolders = readdirSync(docsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^issue-\d+/.test(entry.name))
  .map((entry) => entry.name)
  .filter((folderName) => existsSync(join(docsDir, folderName, 'ticket.yaml')))
  .sort((a, b) => issueNumber(a) - issueNumber(b));

const rows = ticketFolders.map((folderName) => {
  const ticket = readTicket(join(docsDir, folderName, 'ticket.yaml'));
  const task = `[${cell(ticket.ticket || folderName)}](./${folderName}/)`;
  return `| ${task} | ${cell(ticket.title)} | ${cell(ticket.status)} | ${cell(ticket.tier)} | ${cell(ticket.updated)} |`;
});

const index = [
  '# Task Documentation',
  '',
  'This index is generated from the ticket.yaml file in each task folder by',
  '`node scripts/build-task-index.mjs`. Do not hand-edit the table. Run the script after changing a',
  'ticket.yaml.',
  '',
  '| Task | Title | Status | Tier | Updated |',
  '|---|---|---|---|---|',
  ...rows,
  '',
].join('\n');

if (process.argv.includes('--check')) {
  const current = existsSync(indexPath)
    ? readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n')
    : '';
  if (current !== index) {
    console.error('docs/README.md is out of date. Run: node scripts/build-task-index.mjs');
    process.exit(1);
  }
  console.log(`docs/README.md is up to date (${rows.length} tasks).`);
} else {
  writeFileSync(indexPath, index);
  console.log(`Wrote docs/README.md (${rows.length} tasks).`);
}
