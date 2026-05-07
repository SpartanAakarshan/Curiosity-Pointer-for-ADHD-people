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

document.getElementById('show-signup').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('signup-view').style.display = 'block';
  status.textContent = '';
});

document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signup-view').style.display = 'none';
  document.getElementById('login-view').style.display = 'block';
  status.textContent = '';
});

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

document.getElementById('btn-login').addEventListener('click', async () => {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return showStatus('Email and password required.', true);

  showStatus('Logging in…');
  const data = await supabaseFetch('token?grant_type=password', { email, password });

  if (data.access_token) {
    await chrome.storage.local.set({ token: data.access_token, refreshToken: data.refresh_token, email });
    showStatus('Logged in.');
    checkSession();
  } else {
    showStatus(data.error_description ?? 'Login failed.', true);
  }
});

document.getElementById('btn-signup').addEventListener('click', async () => {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return showStatus('Email and password required.', true);
  if (password.length < 8) return showStatus('Password must be 8+ characters.', true);

  showStatus('Creating account…');
  const data = await supabaseFetch('signup', { email, password });

  if (data.id) {
    showStatus('Account created. Check your email for a confirmation link, then come back and log in.');
    document.getElementById('signup-view').style.display = 'none';
    document.getElementById('login-view').style.display = 'block';
  } else {
    showStatus(data.error_description ?? 'Signup failed.', true);
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await chrome.storage.local.remove(['token', 'email', 'refreshToken']);
  showStatus('Logged out.');
  checkSession();
});

checkSession();
