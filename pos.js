/* Selling counter */
const POS = (() => {
  const $ = id => document.getElementById(id);
  const esc = SSM.esc, fmt = v => Number(v || 0).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const CACHE = 'ssm_items';
  let items = [], cart = new Map();
  let pay = (document.querySelector('#pay button.on') || {dataset: {}}).dataset.p || 'Cash';

  async function load() {
    try {
      const r = await fetch('/api/items', {credentials: 'same-origin'});
      const d = await r.json();
      if (d.ok) { items = d.items; localStorage.setItem(CACHE, JSON.stringify(items)); }
    } catch (e) {
      items = JSON.parse(localStorage.getItem(CACHE) || '[]');
      if (items.length) SSM.toast('No internet: using the saved item list');
    }
    const cs = [...new Set(items.map(i => i.category).filter(Boolean))].sort();
    $('cat').innerHTML = '<option value="">All categories</option>' + cs.map(c => `<option>${esc(c)}</option>`).join('');
    render();
  }
  function match(q, i) {
    q = q.trim().toLowerCase(); if (!q) return true;
    const hay = (i.name + ' ' + i.category + ' ' + i.barcode).toLowerCase();
    return hay.includes(q) || q.split(/\s+/).map(x => x.replace(/s$/, '')).every(x => hay.includes(x));
  }
  const visible = () => items.filter(i => (!$('cat').value || i.category === $('cat').value) && match($('q').value, i));
  function render() {
    const list = visible().slice(0, 300);
    $('grid').innerHTML = list.map(i => `<button class="prod ${i.qty <= 0 ? 'out' : (i.low ? 'low' : '')}" data-id="${i.id}">
      ${i.img ? `<img src="${i.img}" alt="" loading="lazy">` : ''}<b>${esc(i.name)}</b><span class="p">${fmt(i.price)}</span>
      <span class="q">${i.qty <= 0 ? 'Finished' : i.qty + ' in stock'}</span></button>`).join('') || '<p class="muted">No item found.</p>';
  }
  function add(id, n = 1) {
    const it = items.find(i => i.id == id); if (!it) return;
    const have = (cart.get(it.id) || {qty: 0}).qty;
    if (have + n > it.qty) return SSM.toast(it.qty <= 0 ? `${it.name} is finished` : `Only ${it.qty} of ${it.name} in stock`);
    cart.set(it.id, {...it, qty: have + n}); draw();
  }
  function draw() {
    $('lines').innerHTML = cart.size ? [...cart.values()].map(c => `<div class="cl"><div><b>${esc(c.name)}</b><div class="small muted">${fmt(c.price)} each</div></div>
      <div class="qty"><button data-d="-1" data-id="${c.id}">−</button><span>${c.qty}</span><button data-d="1" data-id="${c.id}">+</button></div>
      <b class="num">${fmt(c.qty * c.price)}</b></div>`).join('') : '<p class="muted">Tap an item to add it.</p>';
    totals();
  }
  function totals() {
    const sub = [...cart.values()].reduce((a, c) => a + c.qty * c.price, 0);
    const disc = $('disc') ? (parseFloat($('disc').value) || 0) : 0;
    const total = Math.max(sub - disc, 0);
    $('sub').textContent = fmt(sub); $('total').textContent = fmt(total);
    const paid = parseFloat($('paid').value), ch = $('change');
    const cashLike = pay === 'Cash' || pay === 'Credit';
    $('paidBox').style.display = cashLike ? '' : 'none';
    $('ref').style.display = pay === 'MoMo' ? '' : 'none';
    $('paidLbl').textContent = pay === 'Credit' ? 'Paid now (optional)' : 'Cash given';
    $('quick').style.display = pay === 'Cash' ? '' : 'none';
    if (pay === 'Cash') {
      if (isNaN(paid)) { ch.textContent = ''; }
      else if (paid < total) { ch.textContent = 'Not enough! Short by ' + fmt(total - paid); ch.style.color = 'var(--red)'; }
      else { ch.textContent = 'Change: ' + SSM.money(paid - total); ch.style.color = 'var(--green)'; }
    } else if (pay === 'Credit') {
      ch.textContent = 'Customer will owe: ' + SSM.money(Math.max(total - (paid || 0), 0)); ch.style.color = 'var(--red)';
    } else { ch.textContent = 'Paid by ' + pay; ch.style.color = 'var(--brand)'; }
    return {sub, disc, total};
  }
  function clear() { cart.clear(); ['paid', 'cust', 'phone', 'ref'].forEach(i => $(i).value = ''); if ($('disc')) $('disc').value = ''; draw(); $('q').focus(); }
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  let busy = false;
  async function complete() {
    if (busy) return;
    if (!cart.size) return SSM.toast('The cart is empty.');
    const {sub, disc, total} = totals();
    if (disc < 0 || disc > sub) return SSM.toast('Discount must be between 0 and the subtotal.');
    const paid = $('paid').value.trim() === '' ? null : parseFloat($('paid').value);
    if (pay === 'Cash' && paid !== null && paid < total) return SSM.toast('Customer gave less than the total.');
    if (pay === 'Credit' && !$('cust').value.trim()) return SSM.toast("Type the customer's name for credit.");
    const body = {client_uid: uid(), lines: [...cart.values()].map(c => ({id: c.id, qty: c.qty})), discount: disc,
      payment: pay, paid, customer: $('cust').value.trim(), phone: $('phone').value.trim(), momo_ref: $('ref').value.trim()};
    busy = true; $('done').disabled = true;
    try {
      if (!navigator.onLine) throw new Error('offline');
      const r = await SSM.post('/api/sale', body);
      if (r.ok) {
        if (r.low && r.low.length) alert('Low stock:\n' + r.low.join('\n'));
        location.href = r.receipt; return;
      }
      if (r.status >= 500) throw new Error('server');
      SSM.toast(r.error || 'Could not save the sale.', 5000);
    } catch (e) {
      body.offline = true; body.offline_ts = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);
      const q = SSM.queue(); q.push(body); SSM.setQueue(q);
      for (const c of cart.values()) { const it = items.find(i => i.id === c.id); if (it) it.qty -= c.qty; }
      localStorage.setItem(CACHE, JSON.stringify(items));
      SSM.toast('No internet: sale SAVED on this device. It will be sent automatically.', 6000);
      clear(); render();
    } finally { busy = false; $('done').disabled = false; }
  }
  function queueInfo() { const n = SSM.queue().length; $('queueInfo').textContent = n ? `${n} sale(s) waiting to send` : ''; }

  /* camera barcode scanning (Chrome Android) */
  let stream = null, timer = null;
  async function startCam() {
    try {
      const det = new BarcodeDetector();
      stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}});
      $('cam').srcObject = stream; await $('cam').play(); $('camDlg').showModal();
      timer = setInterval(async () => {
        const codes = await det.detect($('cam')).catch(() => []);
        if (codes.length) {
          const code = codes[0].rawValue, it = items.find(i => i.barcode && i.barcode === code);
          stopCam(); if (it) { add(it.id); SSM.toast('Added ' + it.name); } else SSM.toast('No item with code ' + code);
        }
      }, 350);
    } catch (e) { SSM.toast('Camera not available: ' + e.message); }
  }
  function stopCam() { clearInterval(timer); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; if ($('camDlg').open) $('camDlg').close(); }

  /* events */
  $('grid').addEventListener('click', e => { const b = e.target.closest('.prod'); if (b) add(+b.dataset.id); });
  $('lines').addEventListener('click', e => {
    const b = e.target.closest('button[data-d]'); if (!b) return;
    const c = cart.get(+b.dataset.id), d = +b.dataset.d;
    if (d > 0) return add(c.id, 1);
    c.qty -= 1; if (c.qty <= 0) cart.delete(c.id); draw();
  });
  $('q').addEventListener('input', render);
  $('cat').addEventListener('change', render);
  $('q').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return; e.preventDefault();
    const v = $('q').value.trim().toLowerCase(); if (!v) return;
    const exact = items.find(i => i.barcode && i.barcode.toLowerCase() === v);
    const vis = visible();
    if (exact) add(exact.id); else if (vis.length === 1) add(vis[0].id); else return;
    $('q').value = ''; render();
  });
  document.querySelectorAll('#pay button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#pay button').forEach(x => x.classList.remove('on')); b.classList.add('on'); pay = b.dataset.p; totals();
  });
  $('quick').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    $('paid').value = b.dataset.a === 'exact' ? totals().total.toFixed(2) : b.dataset.a; totals(); });
  ['paid', 'disc'].forEach(i => $(i) && $(i).addEventListener('input', totals));
  $('clear').onclick = () => { if (!cart.size || confirm('Remove everything from the cart?')) clear(); };
  $('done').onclick = complete;
  addEventListener('keydown', e => { if (e.key === 'F12') { e.preventDefault(); complete(); } });
  if (SSM.SR) { $('voiceBtn').hidden = false; $('voiceBtn').onclick = () => SSM.voice($('q')); }
  if ('BarcodeDetector' in window) { $('camBtn').hidden = false; $('camBtn').onclick = startCam; }
  document.addEventListener('ssm-queue', queueInfo); queueInfo();
  load(); draw();
  return {stopCam, add};
})();
