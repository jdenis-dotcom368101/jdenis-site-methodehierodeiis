/*!
 * consent.js — Consentement préalable aux cookies de mesure d'audience
 * HIERODEIIS (JDENIS Consulting) — methodehierodeiis.com
 *
 * Adapté de jaydenis.com/consent.js (implémentation de référence), avec la
 * palette du site (navy, crème, or) et sa propre clé de stockage.
 *
 * Principe : Google Analytics n'est PAS chargé tant que l'utilisateur n'a pas
 * fait un choix explicite. Aucune requête vers googletagmanager.com ou
 * google-analytics.com n'est émise avant un clic sur « Accepter ».
 *
 * Contraintes respectées :
 *  - vanilla JS, zéro dépendance externe, zéro requête réseau propre ;
 *  - refuser est aussi simple qu'accepter (même bandeau, même clic, même style) ;
 *  - le choix est mémorisé (localStorage) et révocable à tout moment ;
 *  - position fixed : aucun décalage de mise en page (pas de CLS).
 *
 * API publique : window.jdConsent.open() / .status() / .grant() / .deny()
 *
 * Une page peut déclarer ses propres dimensions GA4 en posant window.jdAnalytics
 * (objet plat) avant de charger ce script — les articles du blog s'en servent
 * pour transmettre leur slug et leur verticale. Voir configParams().
 */
(function () {
  'use strict';

  var GA_ID = 'G-KQR2HQXM2L';            // propriété partagée : les sites se distinguent par le nom d'hôte
  var KEY = 'hierodeiis_consent_analytics';      // 'granted' | 'denied'
  var KEY_DATE = 'hierodeiis_consent_analytics_at';
  var MAX_AGE_MS = 183 * 24 * 60 * 60 * 1000; // 6 mois : le consentement est redemandé (recommandation CNIL)

  var T = {
    title: 'Mesure d’audience',
    body: 'Nous aimerions utiliser Google Analytics pour compter les visites et savoir quelles pages sont utiles. Rien n’est envoyé, et aucun cookie de mesure n’est déposé, tant que vous n’avez pas accepté. Le site fonctionne à l’identique dans les deux cas.',
    more: 'Mentions légales',
    moreHref: '/mentions-legales.html#cookies',
    accept: 'Accepter',
    refuse: 'Refuser',
    manage: 'Gérer les cookies',
    aria: 'Consentement aux cookies',
    granted: 'Mesure d’audience activée.',
    denied: 'Mesure d’audience désactivée.'
  };

  /* ---------------------------------------------------------------- stockage */

  function read(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function drop(k) { try { window.localStorage.removeItem(k); } catch (e) {} }

  function status() {
    var v = read(KEY);
    if (v !== 'granted' && v !== 'denied') return null;
    var at = parseInt(read(KEY_DATE) || '0', 10);
    if (!at || (Date.now() - at) > MAX_AGE_MS) return null; // expiré : on redemande
    return v;
  }

  /* Purge des cookies déposés par une précédente visite consentie, en cas de refus. */
  function clearAnalyticsCookies() {
    var host = location.hostname.replace(/^www\./, '');
    var domains = [host, '.' + host];
    var names = document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); })
      .filter(function (n) { return /^_ga/.test(n) || n === '_gid' || /^_gat/.test(n); });
    names.forEach(function (n) {
      domains.forEach(function (d) {
        document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/; domain=' + d;
      });
      document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
    });
  }

  /* --------------------------------------------------------- Google Analytics */

  var gaLoaded = false;

  /* Dimensions déclarées par la page dans window.jdAnalytics — les articles du
     Studio y placent leur groupe de contenu, leur slug, leur verticale et leur
     site. C'est un simple objet JavaScript : le déclarer n'émet aucune requête
     et ne dépose aucun cookie. Il n'est lu qu'ici, donc après acceptation.
     Une fois passé à config, GA4 l'attache à tous les événements de la page,
     clic_cta compris. */
  function configParams() {
    var p = { allow_google_signals: false, allow_ad_personalization_signals: false };
    var extra = window.jdAnalytics;
    if (extra && typeof extra === 'object') {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) p[k] = extra[k];
      }
    }
    return p;
  }

  function loadGA() {
    if (gaLoaded || !GA_ID) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // GA4 anonymise l'adresse IP par défaut ; on désactive en plus la
    // personnalisation publicitaire et les signaux Google.
    window.gtag('config', GA_ID, configParams());
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------------ styles */

  /* Palette du site : navy #0E1626 / #16223A, crème #F4EEE3, or #C49A45. */
  var CSS = [
    '.jdc-banner{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;',
    'background:#16223A;color:#F4EEE3;',
    'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    'box-shadow:0 -6px 24px rgba(0,0,0,.34);padding:18px 22px;}',
    '.jdc-banner[hidden]{display:none!important;}',
    '.jdc-in{max-width:1160px;margin:0 auto;display:flex;align-items:center;gap:22px;flex-wrap:wrap;}',
    '.jdc-txt{flex:1 1 320px;min-width:260px;}',
    '.jdc-txt strong{display:block;font-size:14px;font-weight:600;margin-bottom:4px;color:#fff;}',
    '.jdc-txt p{margin:0;font-size:13.5px;line-height:1.55;color:rgba(244,238,227,.86);}',
    '.jdc-txt a{color:#C49A45;text-decoration:underline;}',
    '.jdc-acts{display:flex;gap:10px;flex:0 0 auto;flex-wrap:wrap;}',
    '.jdc-acts button{font:inherit;font-size:13.5px;font-weight:600;line-height:1;',
    'padding:12px 26px;border-radius:4px;cursor:pointer;border:1px solid #C49A45;',
    'background:transparent;color:#F4EEE3;min-width:130px;transition:background .18s,color .18s;}',
    '.jdc-acts button:hover{background:#C49A45;color:#0E1626;}',
    '.jdc-acts button:focus-visible{outline:2px solid #fff;outline-offset:2px;}',
    '.jdc-manage{cursor:pointer;background:none;border:0;padding:0;font:inherit;',
    'color:inherit;text-decoration:underline;opacity:.85;}',
    '.jdc-manage:hover{opacity:1;}',
    '.jdc-float{position:fixed;left:14px;bottom:14px;z-index:2147482000;font-size:12px;',
    'padding:7px 12px;border-radius:999px;border:1px solid rgba(244,238,227,.28);',
    'background:rgba(14,22,38,.94);color:#F4EEE3;box-shadow:0 2px 10px rgba(0,0,0,.24);}',
    '@media(max-width:640px){.jdc-banner{padding:16px 14px;}',
    '.jdc-in{gap:14px;}.jdc-acts{width:100%;}.jdc-acts button{flex:1 1 0;min-width:0;padding:12px 10px;}}',
    '@media(prefers-reduced-motion:reduce){.jdc-acts button{transition:none;}}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('jdc-style')) return;
    var st = document.createElement('style');
    st.id = 'jdc-style';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ------------------------------------------------------------------ bandeau */

  var banner = null;

  function buildBanner() {
    if (banner) return banner;
    injectCSS();
    banner = document.createElement('div');
    banner.className = 'jdc-banner';
    banner.id = 'jdc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', T.aria);
    banner.hidden = true;

    var inner = document.createElement('div');
    inner.className = 'jdc-in';

    var txt = document.createElement('div');
    txt.className = 'jdc-txt';
    var h = document.createElement('strong');
    h.textContent = T.title;
    var p = document.createElement('p');
    p.appendChild(document.createTextNode(T.body + ' '));
    var a = document.createElement('a');
    a.href = T.moreHref;
    a.textContent = T.more;
    p.appendChild(a);
    txt.appendChild(h);
    txt.appendChild(p);

    var acts = document.createElement('div');
    acts.className = 'jdc-acts';
    // Refuser en premier, strictement au même niveau visuel qu'Accepter (exigence CNIL).
    var bRef = document.createElement('button');
    bRef.type = 'button';
    bRef.textContent = T.refuse;
    bRef.addEventListener('click', function () { decide('denied'); });
    var bAcc = document.createElement('button');
    bAcc.type = 'button';
    bAcc.textContent = T.accept;
    bAcc.addEventListener('click', function () { decide('granted'); });
    acts.appendChild(bRef);
    acts.appendChild(bAcc);

    inner.appendChild(txt);
    inner.appendChild(acts);
    banner.appendChild(inner);
    document.body.appendChild(banner);
    return banner;
  }

  function showBanner() {
    buildBanner().hidden = false;
  }

  function hideBanner() {
    if (banner) banner.hidden = true;
  }

  function decide(value) {
    write(KEY, value);
    write(KEY_DATE, String(Date.now()));
    hideBanner();
    if (value === 'granted') {
      loadGA();
    } else {
      clearAnalyticsCookies();
    }
    announce(value === 'granted' ? T.granted : T.denied);
    try {
      document.dispatchEvent(new CustomEvent('jdconsent', { detail: { analytics: value } }));
    } catch (e) {}
  }

  function announce(msg) {
    var live = document.getElementById('jdc-live');
    if (!live) {
      live = document.createElement('div');
      live.id = 'jdc-live';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;';
      document.body.appendChild(live);
    }
    live.textContent = msg;
  }

  /* ------------------------------------------------- point d'entrée révocation */

  /* Câble tout élément explicitement marqué dans le HTML, puis ajoute un lien
     dans le pied de page. Aucun élément existant n'est déplacé ni restylé. */
  function wireManageLinks() {
    var explicit = document.querySelectorAll('[data-consent-settings], a[href="#cookies-settings"]');
    Array.prototype.forEach.call(explicit, function (el) {
      el.addEventListener('click', function (ev) { ev.preventDefault(); showBanner(); });
    });
    if (explicit.length) return;

    var host =
      (function () {
        var legal = document.querySelector('footer a[href*="mentions-legales"]');
        return legal ? legal.parentNode : null;
      })() ||
      document.querySelector('footer');

    var link = document.createElement('button');
    link.type = 'button';
    link.className = 'jdc-manage';
    link.textContent = T.manage;
    link.addEventListener('click', showBanner);

    if (host) {
      injectCSS();
      if (host.tagName === 'UL') {
        var li = document.createElement('li');
        li.appendChild(link);
        host.appendChild(li);
      } else {
        host.appendChild(document.createTextNode(' · '));
        host.appendChild(link);
      }
    } else {
      // Aucun pied de page : pastille discrète, en position fixed (pas de décalage).
      injectCSS();
      link.className = 'jdc-manage jdc-float';
      document.body.appendChild(link);
    }
  }

  /* ------------------------------------------------------------------- départ */

  function start() {
    var s = status();
    if (s === 'granted') {
      loadGA();
    } else if (s === null) {
      showBanner();
    }
    wireManageLinks();
  }

  window.jdConsent = {
    status: status,
    open: showBanner,
    grant: function () { decide('granted'); },
    deny: function () { decide('denied'); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
