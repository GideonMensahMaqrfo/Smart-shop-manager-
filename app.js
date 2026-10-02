/* Smart Shop Manager - shared browser code */
const SSM = (() => {
  const csrf = (document.querySelector('meta[name=csrf]') || {}).content;
  const vapid = (document.querySelector('meta[name=vapid]') || {}).content;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => ((window.SHOP && SHOP.currency) || document.body.dataset.cur || 'GH₵') + ' ' +
    Number(v || 0).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2});

  async function post(url, data) {
    const r = await fetch(url, {method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type': 'application/json', 'X-CSRF': csrf}, body: JSON.stringify(data)});
    let j = {}; try { j = await r.json(); } catch (e) {}
    j.status = r.status; return j;
  }
  function toast(msg, ms = 3500) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), ms);
  }

  /* ---------- offline sales queue ---------- */
  const QKEY = 'ssm_queue';
  const queue = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch (e) { return []; } };
  const setQueue = q => { localStorage.setItem(QKEY, JSON.stringify(q)); document.dispatchEvent(new Event('ssm-queue')); };
  let syncing = false;
  async function sync() {
    const q = queue();
    if (!q.length || !navigator.onLine || syncing || !csrf) return 0;
    syncing = true; let sent = 0; const left = [];
    for (const s of q) {
      try { const r = await post('/api/sale', s); if (r.ok) sent++; else left.push({...s, error: r.error || 'Not sent'}); }
      catch (e) { left.push(s); }
    }
    setQueue(left); syncing = false;
    if (sent) toast(sent + ' offline sale(s) sent to the shop ✓');
    return sent;
  }
  const net = () => document.body.classList.toggle('is-offline', !navigator.onLine);
  addEventListener('online', () => { net(); sync(); });
  addEventListener('offline', net);
  net(); setInterval(sync, 30000); setTimeout(sync, 1500);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

  /* ---------- phone notifications ---------- */
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
  const pushOK = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  async function enablePush() {
    if (!vapid) return toast('Notifications are not set up on the server yet.');
    if (!pushOK()) return toast('On iPhone: tap Share, then "Add to Home Screen", open the app from there and try again.', 7000);
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return toast('Notifications were blocked. Allow them in your browser settings.', 6000);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64(vapid)});
      const r = await post('/push/subscribe', sub.toJSON());
      if (r.ok) { toast('Notifications are ON for this device ✓'); const c = document.getElementById('pushCard'); if (c) c.remove(); }
    } catch (e) { toast('Could not turn on notifications: ' + e.message, 6000); }
  }
  const card = document.getElementById('pushCard');
  if (card && pushOK() && Notification.permission !== 'granted') card.style.display = 'block';

  /* ---------- live dashboard ---------- */
  function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
  function unread(n) { const b = document.getElementById('unread'); if (b) { b.textContent = n; b.hidden = !n; } }
  function live(full) {
    let maxId = 0, first = true;
    async function tick() {
      try {
        const r = await fetch('/api/live', {credentials: 'same-origin'}); if (!r.ok) return;
        const d = await r.json();
        setText('todayTotal', money(d.today_total)); setText('todayN', d.today_n);
        if ('today_profit' in d) setText('todayProfit', money(d.today_profit));
        unread(d.unread || 0);
        if (!full || !d.sales) return;
        const feed = document.getElementById('feed');
        feed.innerHTML = d.sales.length ? d.sales.map(s => `<li class="${!first && s.id > maxId ? 'new' : ''}" style="${s.voided ? 'opacity:.5;text-decoration:line-through' : ''}">
          <span class="t">${s.time}</span><div><a href="/receipt/${s.id}"><b>#${String(s.number).padStart(5, '0')}</b></a> · ${esc(s.by)} · <span class="muted">${esc(s.pay)}</span>
          <div class="small muted">${esc(s.items)}</div></div><span class="amt">${money(s.total)}</span></li>`).join('')
          : '<li class="muted">No sales yet today.</li>';
        maxId = Math.max(maxId, ...d.sales.map(s => s.id), 0); first = false;
        document.getElementById('staff').innerHTML = d.staff.map(u => `<div style="padding:6px 0;border-top:1px dashed var(--line)">
          <span class="dot ${u.online ? 'on' : ''}"></span><b>${esc(u.name)}</b> <span class="muted">· ${esc(u.title)}</span>
          <span style="float:right" class="num">${money(u.sold)}</span><div class="small muted" style="margin-left:15px">${u.online ? 'Online now' : 'Last seen ' + esc(u.seen)}</div></div>`).join('');
        const hrs = []; for (let h = 6; h <= 21; h++) hrs.push(h);
        const mx = Math.max(1, ...hrs.map(h => d.hours[h] || 0));
        document.getElementById('bars').innerHTML = hrs.map(h => `<div title="${h}:00 · ${money(d.hours[h] || 0)}" style="height:${Math.round((d.hours[h] || 0) / mx * 100)}%"><span>${h}</span></div>`).join('');
      } catch (e) {}
    }
    tick(); setInterval(tick, 10000);
  }
  if (!document.getElementById('feed') && document.getElementById('unread')) {
    setInterval(async () => { try { const r = await fetch('/api/live', {credentials: 'same-origin'}); if (r.ok) unread((await r.json()).unread || 0); } catch (e) {} }, 30000);
  }

  /* ---------- voice search (Chrome / Android) ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function voice(input, done) {
    if (!SR) return toast('Voice search works in Chrome.');
    const r = new SR(); r.lang = 'en-GB'; r.interimResults = false;
    r.onresult = e => { input.value = e.results[0][0].transcript.replace(/[.?!]$/, ''); input.dispatchEvent(new Event('input')); done && done(); };
    r.onerror = () => toast('I did not hear that. Try again.');
    r.start(); toast('Listening… say the item name', 2500);
  }
  document.querySelectorAll('[data-voice]').forEach(b => {
    if (!SR) return; b.hidden = false;
    b.onclick = () => voice(document.getElementById(b.dataset.voice), () => b.form && b.form.submit());
  });
  document.querySelectorAll('.side nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('nav-open')));

  return {post, toast, money, esc, queue, setQueue, sync, enablePush, live, voice, SR};
})();
