// Encrypts src/content.html into docs/content.enc.json using AES-GCM.
// The password derives the key via PBKDF2 — only ciphertext is ever published.
//
// Usage:
//   SITE_PASSWORD='your-password' npm run build
//   npm run build            (will prompt for the password)

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SRC = join(ROOT, 'src', 'content.html');
const OUT = join(ROOT, 'docs', 'content.enc.json');
const ITERATIONS = 250_000;

const b64 = (buf) => Buffer.from(buf).toString('base64');

function promptPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Site password: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const password = process.env.SITE_PASSWORD || (await promptPassword());
  if (!password || password.trim().length < 4) {
    console.error('\n✗ Please provide a password of at least 4 characters.');
    process.exit(1);
  }

  const plaintext = await readFile(SRC, 'utf8');
  const enc = new TextEncoder();

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );

  const payload = {
    v: 1,
    iterations: ITERATIONS,
    salt: b64(salt),
    iv: b64(iv),
    ct: b64(ciphertext),
  };

  await writeFile(OUT, JSON.stringify(payload), 'utf8');
  console.log(`\n✓ Encrypted ${plaintext.length} chars → docs/content.enc.json`);
  console.log('  Remember this password — it is not stored anywhere.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
