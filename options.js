const SUPABASE_URL  = 'https://krirwdkqjezbzyythioq.supabase.co';
const SUPABASE_ANON = 'sb_publishable_FjoiQluqAIe3hl3ufdWfaA_BJGr7e5b';

const status    = document.getElementById('status');
const loggedIn  = document.getElementById('logged-in');
const loggedOut = document.getElementById('logged-out');
const userEmail = document.getElementById('user-email');

function showStatus(msg, isError = false) {
  status.textContent = msg;
  status.className = isError ? 'err' : 'ok';
}

async function supabaseFetch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function checkSession() {
  const { token, email } = await chrome.storage.local.get(['token', 'email']);
  if (token) {
    loggedOut.style.display = 'none';
    loggedIn.style.display = 'block';
    userEmail.textContent = email ?? '';
  } else {
    loggedOut.style.display = 'block';
    loggedIn.style.display = 'none';
  }
}

function injectContent() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});
          chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['styles.css'] }).catch(() => {});
        }
      });
    });
  });
}

document.getElementById('btn-continue').addEventListener('click', async () => {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return showStatus('Email and password required.', true);
  if (password.length < 8) return showStatus('Password must be 8+ characters.', true);

  showStatus('Signing in…');
  const login = await supabaseFetch('token?grant_type=password', { email, password });

  if (login.access_token) {
    await chrome.storage.local.set({ token: login.access_token, refreshToken: login.refresh_token, email });
    showStatus('Logged in.');
    checkSession();
    injectContent();
    return;
  }

  // New user — auto-create account
  showStatus('Creating account…');
  const signup = await supabaseFetch('signup', { email, password });

  if (signup.access_token) {
    await chrome.storage.local.set({ token: signup.access_token, refreshToken: signup.refresh_token, email });
    showStatus('Account created. Logged in.');
    checkSession();
    injectContent();
  } else {
    const err = signup.error_description ?? signup.msg ?? signup.message ?? login.error_description ?? login.msg ?? login.message ?? 'Sign in failed.';
    showStatus(err, true);
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await chrome.storage.local.remove(['token', 'email', 'refreshToken']);
  showStatus('Logged out.');
  checkSession();
});

checkSession();
