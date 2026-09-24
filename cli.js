#!/usr/bin/env node

const { spawn } = require('node:child_process');

const apiUrl = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/+$/, '');

function printHelp() {
  console.log(`Snip CLI

Usage:
  node cli.js add <url>    Create a short link
  node cli.js ls           List all links
  node cli.js open <code>  Open a short link in the browser

Environment:
  SNIP_API                 Backend URL (default: http://localhost:3000)`);
}

async function request(path, options) {
  let response;

  try {
    response = await fetch(`${apiUrl}${path}`, options);
  } catch {
    throw new Error(`Could not reach the Snip API at ${apiUrl}.`);
  }

  let body;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error || `Request failed with status ${response.status}.`);
  }

  return body;
}

function validateUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

async function add(url) {
  if (!url || !validateUrl(url)) {
    throw new Error('Enter a valid URL beginning with http:// or https://.');
  }

  const link = await request('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  console.log(link.shortUrl);
}

async function list() {
  const links = await request('/api/links');

  if (links.length === 0) {
    console.log('No links yet.');
    return;
  }

  console.log('CODE    HITS  URL');
  for (const link of links) {
    console.log(`${link.code.padEnd(8)}${String(link.hits).padEnd(6)}${link.url}`);
  }
}

function openBrowser(url) {
  const commands = {
    darwin: ['open', [url]],
    linux: ['xdg-open', [url]],
    win32: ['cmd.exe', ['/d', '/s', '/c', 'start', '', url]],
  };
  const command = commands[process.platform];

  if (!command) {
    throw new Error(`Opening a browser is not supported on ${process.platform}.`);
  }

  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

async function open(code) {
  if (!code) {
    throw new Error('Provide the short code to open.');
  }

  const links = await request('/api/links');
  const link = links.find((candidate) => candidate.code === code);

  if (!link) {
    throw new Error(`Unknown short code: ${code}`);
  }

  openBrowser(link.shortUrl);
  console.log(link.shortUrl);
}

async function main() {
  const [command, argument] = process.argv.slice(2);

  switch (command) {
    case 'add':
      await add(argument);
      break;
    case 'ls':
      await list();
      break;
    case 'open':
      await open(argument);
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});