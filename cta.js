/**
 * cta.js — Mesure des clics d'intention (réservation, contact, e-mail, offre)
 * HIERODEIIS (JDENIS Consulting) — methodehierodeiis.com
 *
 * Adapté de jaydenis.com/cta.js (implémentation de référence). Même événement
 * et mêmes paramètres, pour que les sites se comparent dans un seul rapport
 * GA4 ; seule la liste des liens d'offre change — ici, la prise de rendez-vous
 * Calendly, la réservation d'une place par e-mail et la plaquette PDF.
 *
 * Envoie un événement GA4 `clic_cta` quand un visiteur clique un lien qui
 * traduit une intention. Sans cette mesure, on connaît les pages vues mais pas
 * la page qui décide un dirigeant à réserver — la seule question qui compte.
 *
 * Consentement : l'événement n'est envoyé que si `window.gtag` existe, ce que
 * /consent.js ne pose qu'après acceptation explicite. Un visiteur qui refuse la
 * mesure d'audience ne déclenche rien. Voir /consent.js.
 *
 * Paramètres envoyés : type_cta (contact | telephone | email | offre), lien, texte.
 */
(function () {
  'use strict';

  /* Liens d'offre : la plaquette (téléchargement = intention réelle) et le
     vérificateur AI Act hébergé sur jaydenis.com. Les ancres de navigation
     interne (#programme, #sessions) sont volontairement exclues : les suivre
     mesurerait de la lecture, pas une décision. */
  var OFFRES = /(plaquette-hierodeiis|ai-act-risk-checker|grille-classification-risques-ai-act)/;

  function typeDuLien(a) {
    var href = a.getAttribute('href') || '';
    if (/^mailto:/i.test(href)) return 'email';
    if (/^tel:/i.test(href)) return 'telephone';
    /* La prise de rendez-vous Calendly est le premier appel à l'action du site. */
    if (/calendly\.com/i.test(href)) return 'contact';
    if (/(^|[#\/])contact\b/i.test(href)) return 'contact';
    if (OFFRES.test(href)) return 'offre';
    return null;
  }

  /* Capture : on écoute avant les gestionnaires de la page, dont certains
     arrêtent la propagation pour gérer le défilement doux des ancres. */
  document.addEventListener('click', function (ev) {
    var cible = ev.target;
    if (!cible || !cible.closest) return;

    var a = cible.closest('a');
    if (!a) return;

    var type = typeDuLien(a);
    if (!type) return;

    try {
      if (window.gtag) {
        window.gtag('event', 'clic_cta', {
          type_cta: type,
          lien: (a.href || '').slice(0, 200),
          texte: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80)
        });
      }
    } catch (e) {
      /* La mesure ne doit jamais casser la navigation. */
    }
  }, true);
})();
