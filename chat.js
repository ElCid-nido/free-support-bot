(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const log = $('#log');
  const input = $('#msg');
  const form = $('#chatForm');
  const closeBtn = $('#closeBtn');

  // ===== Configure EmailJS (Step 3) =====
  // Replace these 3 values after you create your EmailJS account/template
  const EMAILJS_PUBLIC_KEY = 'REPLACE_ME_PUBLIC_KEY';
  const EMAILJS_SERVICE_ID = 'REPLACE_ME_SERVICE_ID';
  const EMAILJS_TEMPLATE_ID = 'REPLACE_ME_TEMPLATE_ID';

  if (window.emailjs && EMAILJS_PUBLIC_KEY.startsWith('REPLACE_ME') === false) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  let FAQ = [];
  let BIZ = {};
  let fuse = null;

  // UI helpers
  const addMsg = (html, who = 'bot', small = '') => {
    const el = document.createElement('div');
    el.className = `msg ${who}`;
    el.innerHTML = html + (small ? `<small>${small}</small>` : '');
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  };

  const suggestions = (items) => {
    const wrap = document.createElement('div');
    items.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'suggestion';
      b.textContent = t;
      b.onclick = () => {
        input.value = t;
        form.requestSubmit();
      };
      wrap.appendChild(b);
    });
    return wrap.outerHTML;
  };

  const formatHours = (hours) =>
    Object.entries(hours)
      .map(([d, h]) => `${d[0].toUpperCase() + d.slice(1)}: ${h}`)
      .join('<br>');

  const greet = () => {
    addMsg(
      `<b>Hi! I’m the assistant for ${BIZ.name || 'our shop'}.</b><br/>Ask about <i>hours, address, returns, delivery</i> — or anything else.${suggestions([
        'What are your hours?',
        'Where are you located?',
        'Do you deliver?'
      ])}`
    );
  };

  // Router
  const route = async (text) => {
    const q = text.toLowerCase();

    // Quick intents
    if (/\b(hour|hours|open|close|closing|time|today)\b/.test(q)) {
      return { a: `Our hours:<br>${formatHours(BIZ.hours)}`, tag: 'hours' };
    }
    if (/\b(where|address|located|location|directions|map)\b/.test(q)) {
      return { a: `Address: ${BIZ.address}<br>Phone: ${BIZ.phone}`, tag: 'address' };
    }
    if (/\b(phone|call|email|contact)\b/.test(q)) {
      return { a: `Contact us: ${BIZ.phone} · ${BIZ.email}`, tag: 'contact' };
    }

    // Fuzzy search FAQ
    const res = fuse.search(q, { limit: 3 });
    if (res.length && res[0].score <= 0.45) {
      const hit = res[0].item;
      return { a: hit.a, tag: hit.tag || 'faq' };
    }

    // Fallback → handoff to human
    return { a: needHumanHTML(), tag: 'handoff', html: true };
  };

  // Handoff form HTML (lead capture)
  const needHumanHTML = () => `I’m not fully sure about that. Want a human to follow up?
<div class="divider"></div>
<form class="form" id="leadForm">
  <input name="name" placeholder="Your name" required>
  <input name="email" placeholder="Email" type="email" required>
  <textarea name="message" placeholder="What do you need?" rows="3" required></textarea>
  <label style="font-size:12px;color:#666">
    <input type="checkbox" name="consent" required> I agree to be contacted about my request.
  </label>
  <button type="submit">Send to a human</button>
</form>`;

  // Event delegation for dynamic form
  log.addEventListener('submit', async (e) => {
    if (!(e.target && e.target.id === 'leadForm')) return;
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name');
    const email = fd.get('email');
    const message = fd.get('message');

    const button = e.target.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Sending…';

    try {
      if (!window.emailjs || EMAILJS_PUBLIC_KEY.startsWith('REPLACE_ME')) {
        throw new Error('Email not configured yet. Add your EmailJS keys in chat.js');
      }

      const params = {
        business_name: BIZ.name || 'Our Business',
        user_name: name,
        user_email: email,
        user_message: message,
        page_url: document.referrer || location.href
      };

      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
      addMsg('✅ Thanks! A teammate will get back to you shortly.');
    } catch (err) {
      console.error(err);
      addMsg('⚠️ Couldn’t send that right now. You can email us at ' + (BIZ.email || '')); 
    } finally {
      button.disabled = false;
      button.textContent = 'Send to a human';
    }
  });

  // Close button → signal parent to collapse
  closeBtn.addEventListener('click', () => {
    try { parent.postMessage('fsb.close', '*'); } catch (_) {}
  });

  // Boot
  const boot = async () => {
    try {
      const [faqRes, bizRes] = await Promise.all([
        fetch('faq.json'),
        fetch('business.json')
      ]);
      FAQ = await faqRes.json();
      BIZ = await bizRes.json();

      fuse = new Fuse(FAQ, {
        includeScore: true,
        threshold: 0.4,
        ignoreLocation: true,
        keys: ['q', 'a', 'tag']
      });

      greet();
    } catch (e) {
      console.error(e);
      addMsg('Error loading data. Please reload.');
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'me');
    input.value = '';

    const { a } = await route(text);
    addMsg(a, 'bot');
  });

  boot();
})();