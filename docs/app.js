// Fetches the encrypted guide, decrypts it client-side with the password,
// and renders it. Matches the AES-GCM / PBKDF2 scheme in build/encrypt.mjs.

const els = {
  lock: document.getElementById('lock'),
  guide: document.getElementById('guide'),
  form: document.getElementById('unlock-form'),
  password: document.getElementById('password'),
  button: document.getElementById('unlock-btn'),
  error: document.getElementById('error'),
  content: document.getElementById('content'),
  lockAgain: document.getElementById('lock-again'),
};

// localStorage (not sessionStorage) so a device stays unlocked across visits
// and browser restarts — users only enter the password once. The "Lock"
// button clears it.
const STORE_KEY = 'house-guide-pw';

const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let payloadPromise = null;
function getPayload() {
  if (!payloadPromise) {
    // Cache-bust the URL so a browser/CDN can never serve a stale encrypted
    // file after an update (which would make the correct password look wrong).
    payloadPromise = fetch(`content.enc.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('Could not load guide content.');
        return r.json();
      })
      .catch((err) => {
        // Don't cache a failure — allow the next attempt to retry the fetch.
        payloadPromise = null;
        throw err;
      });
  }
  return payloadPromise;
}

async function decrypt(password) {
  // A load failure must be distinguishable from a wrong password, so the user
  // isn't told "incorrect password" when really the content didn't download.
  let data;
  try {
    data = await getPayload();
  } catch (err) {
    err.code = 'load';
    throw err;
  }

  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(data.salt), iterations: data.iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );

  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(data.iv) },
      key,
      fromB64(data.ct),
    );
    return new TextDecoder().decode(plainBuf);
  } catch (err) {
    // Auth-tag mismatch = wrong password.
    err.code = 'badpw';
    throw err;
  }
}

function reveal(html) {
  els.content.innerHTML = html;
  flagMissingImages();
  els.lock.hidden = true;
  els.guide.hidden = false;
  window.scrollTo(0, 0);
}

// If a photo hasn't been added yet, show a labelled placeholder instead of a
// broken-image icon.
function flagMissingImages() {
  els.content.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => {
      const file = (img.getAttribute('src') || '').split('/').pop();
      img.classList.add('img-missing');
      img.removeAttribute('src');
      img.alt = `📷 Photo coming soon — ${file}`;
    }, { once: true });
  });
}

async function attempt(password, { fromSession = false } = {}) {
  els.error.hidden = true;
  els.button.disabled = true;
  els.button.textContent = 'Unlocking…';
  try {
    const html = await decrypt(password);
    localStorage.setItem(STORE_KEY, password);
    reveal(html);
  } catch (err) {
    if (err.code === 'load') {
      // Content didn't download — not a password problem. Keep any saved
      // password and tell the user it's a connection issue.
      if (!fromSession) {
        els.error.textContent = 'Couldn’t load the guide. Check your connection and try again.';
        els.error.hidden = false;
      }
    } else if (fromSession) {
      // A saved password no longer works (e.g. password was changed) — clear it
      // silently and let the user type the new one.
      localStorage.removeItem(STORE_KEY);
    } else {
      els.error.textContent = 'Incorrect password — please try again.';
      els.error.hidden = false;
      els.password.value = '';
      els.password.focus();
    }
  } finally {
    els.button.disabled = false;
    els.button.textContent = 'Unlock';
  }
}

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const pw = els.password.value.trim();
  if (pw) attempt(pw);
});

els.lockAgain.addEventListener('click', () => {
  localStorage.removeItem(STORE_KEY);
  els.content.innerHTML = '';
  els.guide.hidden = true;
  els.lock.hidden = false;
  els.password.value = '';
  els.password.focus();
});

// Stay unlocked on this device across visits and browser restarts.
const saved = localStorage.getItem(STORE_KEY);
if (saved) attempt(saved, { fromSession: true });
