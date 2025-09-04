(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const log = $('#log');
  const input = $('#msg');
  const form = $('#chatForm');
  const closeBtn = $('#closeBtn');

  const EMAILJS_PUBLIC_KEY = 'REPLACE_ME_PUBLIC_KEY';
  const EMAILJS_SERVICE_ID = 'REPLACE_ME_SERVICE_ID';
  const EMAILJS_TEMPLATE_ID = 'REPLACE_ME_TEMPLATE_ID';

  if (window.emailjs && EMAILJS_PUBLIC_KEY.startsWith('REPLACE_ME') === false) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  let FAQ = [];
  let BIZ = {};
  let fuse = null;

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
      b.onclick = () => { input.value = t; form.requestSubmit(); };
      wrap.appendChild(b);
    });
    return wrap.outerHTML;
  };

  const formatHours = (hours) =>
    Object.entries(hours).map(([d, h]) => `${d[0].toUpperCase() + d.slice(1)}: ${h}`).join('<br>');

  const greet = () => {
    addMsg(`<b>Ciao! Sono l’assistente di ${BIZ.name || 'questa attività'}.</b><br/>
    Puoi chiedere <i>orari, indirizzo, resi, consegna</i> o altro.${suggestions([
      'Quali sono gli orari?','Dove siete?','Fate consegna?'
    ])}`);
  };

  const route = async (text) => {
    const q = text.toLowerCase();

    if (/\b(orari|apertura|chius|open|close|oggi|time)\b/.test(q)) {
      return { a: `Orari:<br>${formatHours(BIZ.hours)}`, tag: 'orari' };
    }
    if (/\b(dove|indirizzo|sede|location|mappa|arrivare)\b/.test(q)) {
      return { a: `Indirizzo: ${BIZ.address}<br>Telefono: ${BIZ.phone}`, tag: 'indirizzo' };
    }
    if (/\b(telefono|chiama|email|contatti|contatto)\b/.test(q)) {
      return { a: `Contatti: ${BIZ.phone} · ${BIZ.email}`, tag: 'contatti' };
    }

    const res = fuse.search(q, { limit: 3 });
    if (res.length && res[0].score <= 0.45) {
      const hit = res[0].item;
      return { a: hit.a, tag: hit.tag || 'faq' };
    }

    return { a: needHumanHTML(), tag: 'handoff', html: true };
  };

  const needHumanHTML = () => `Non sono sicuro al 100%. Vuoi essere ricontattato?
<div class="divider"></div>
<form class="form" id="leadForm">
  <input name="name" placeholder="Il tuo nome" required>
  <input name="email" placeholder="Email" type="email" required>
  <textarea name="message" placeholder="Di cosa hai bisogno?" rows="3" required></textarea>
  <label style="font-size:12px;color:#666">
    <input type="checkbox" name="consent" required> Acconsento a essere contattato riguardo alla mia richiesta.
  </label>
  <button type="submit">Invia richiesta</button>
</form>`;

  log.addEventListener('submit', async (e) => {
    if (!(e.target && e.target.id === 'leadForm')) return;
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name');
    const email = fd.get('email');
    const message = fd.get('message');

    const button = e.target.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Invio…';

    try {
      if (!window.emailjs || EMAILJS_PUBLIC_KEY.startsWith('REPLACE_ME')) {
        throw new Error('Email non configurata. Inserisci le chiavi EmailJS in chat.js');
      }
      const params = {
        business_name: BIZ.name || 'La Tua Attività',
        user_name: name,
        user_email: email,
        user_message: message,
        page_url: document.referrer || location.href
      };
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
      addMsg('✅ Grazie! Ti risponderemo al più presto.');
    } catch (err) {
      console.error(err);
      addMsg('⚠️ Invio non riuscito. Scrivici a ' + (BIZ.email || '') );
    } finally {
      button.disabled = false;
      button.textContent = 'Invia richiesta';
    }
  });

  closeBtn.addEventListener('click', () => { try { parent.postMessage('fsb.close', '*'); } catch (_) {} });

  const boot = async () => {
    try {
      const [faqRes, bizRes] = await Promise.all([ fetch('faq.json'), fetch('business.json') ]);
      FAQ = await faqRes.json(); BIZ = await bizRes.json();

      fuse = new Fuse(FAQ, { includeScore: true, threshold: 0.4, ignoreLocation: true, keys: ['q','a','tag'] });
      greet();
    } catch (e) { console.error(e); addMsg('Errore nel caricamento dei dati. Riprova.'); }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'me'); input.value = '';
    const { a } = await route(text);
    addMsg(a, 'bot');
  });

  boot();
})();