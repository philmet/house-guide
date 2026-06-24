# Guide source (local only)

The actual guide copy lives in `content.html` in this folder. It is the
**plaintext** version of the guide and is deliberately **git-ignored** so it
is never published to the public repo — only the encrypted
`docs/content.enc.json` is committed.

## Workflow

1. Edit `content.html` here.
2. Re-encrypt into the published site:
   ```sh
   SITE_PASSWORD='your-password' npm run build
   ```
3. Commit and push (only `docs/content.enc.json` changes get published).

⚠️ Keep your own backup of `content.html` — because it is git-ignored, it is
not stored in the repo. If you lose it, you'd have to retype the guide (the
encrypted version cannot be edited directly).
