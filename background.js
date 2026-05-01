const PROXY_URL = 'https://curiosity-pointer-api.vercel.app/api/explain';

async function callProxy(text, retries = 1) {
  const { token } = await chrome.storage.local.get('token');

  if (!token) {
    return { error: 'Not logged in. Open extension options to sign in.' };
  }

  const r = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ text })
  });

  const data = await r.json();

  if (r.status === 401) {
    await chrome.storage.local.remove(['token', 'email']);
    return { error: 'Session expired. Please log in again via extension options.' };
  }

  if (r.status === 503 && retries > 0) {
    await new Promise(res => setTimeout(res, 3000));
    return callProxy(text, retries - 1);
  }

  return data;
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action !== 'explain') return;

  const tabId = sender.tab?.id;
  if (!tabId) return;

  callProxy(message.text)
    .then(data => {
      if (data.result) {
        chrome.tabs.sendMessage(tabId, { action: 'result', result: data.result });
      } else {
        chrome.tabs.sendMessage(tabId, { action: 'result', error: data.error ?? 'No response.' });
      }
    })
    .catch(err => chrome.tabs.sendMessage(tabId, { action: 'result', error: err.message }));
});
