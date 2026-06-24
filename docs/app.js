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

const SESSION_KEY = 'house-guide-pw';

const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let payloadPromise = null;
function getPayload() {
  if (!payloadPromise) {
    payloadPromise = fetch('content.enc.json', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('Could not load guide content.');
        return r.json();
      });
  }
  return payloadPromise;
}

async function decrypt(password) {
  const data = await getPayload();
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

  // Throws if the password is wrong (auth tag mismatch).
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(data.iv) },
    key,
    fromB64(data.ct),
  );

  return new TextDecoder().decode(plainBuf);
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
    sessionStorage.setItem(SESSION_KEY, password);
    reveal(html);
  } catch (err) {
    if (fromSession) {
      sessionStorage.removeItem(SESSION_KEY);
    } else {
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
  sessionStorage.removeItem(SESSION_KEY);
  els.content.innerHTML = '';
  els.guide.hidden = true;
  els.lock.hidden = false;
  els.password.value = '';
  els.password.focus();
});

// Stay unlocked across reloads within the same tab session.
const saved = sessionStorage.getItem(SESSION_KEY);
if (saved) attempt(saved, { fromSession: true });
