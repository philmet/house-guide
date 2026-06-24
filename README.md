# House Guide

A small, mobile-friendly, password-gated static page with house-sitting
instructions, hosted free on GitHub Pages.

## How it's structured

| Path | What it is | Published? |
|------|-----------|------------|
| `src/content.html` | The **editable** guide copy. Edit this. | ❌ Never |
| `build/encrypt.mjs` | Encrypts the copy with your password. | ❌ |
| `docs/` | The actual site GitHub Pages serves. | ✅ Yes |
| `docs/content.enc.json` | The encrypted copy (ciphertext only). | ✅ Yes |
| `docs/images/` | Photos referenced in the guide. | ✅ Yes |

The plaintext copy lives in `src/` and is **never** published — only the
AES-GCM-encrypted `docs/content.enc.json` is. Viewing the page source or the
repo reveals only ciphertext.

> ⚠️ A GitHub Pages site is **publicly reachable by URL** even from a private
> repo. The password gate (AES-GCM + PBKDF2, client-side) is what keeps the
> contents private. Anyone you give the password to can read everything, so
> don't reuse a sensitive password.

## Editing the guide

1. Edit the copy in [`src/content.html`](src/content.html).
2. Add/replace photos in [`docs/images/`](docs/images/).
3. Re-encrypt:
   ```sh
   SITE_PASSWORD='your-password' npm run build
   ```
   (or just `npm run build` and it'll prompt you)
4. Commit and push. GitHub Pages redeploys automatically.

## Preview locally

```sh
SITE_PASSWORD='your-password' npm run serve
```

Then open the printed `localhost` URL.

## Hosting (GitHub Pages)

Repo **Settings → Pages → Source: Deploy from a branch → `main` / `/docs`**.
