/*
 * LE TEXTE DE L'INTERFACE (menu, aide, états) dans les deux langues.
 * Le texte des slides, lui, est dans slides.ts.
 *
 * Chaque entrée donne le texte en français et en anglais. Les clés se retrouvent dans
 * public/index.html, sur les attributs `data-texte` (contenu de l'élément) et
 * `data-texte-label` (aria-label) : settings/langue.ts les remplit à l'ouverture de l'app
 * et à chaque changement de langue. Les textes calculés (version, état de l'écran…) sont
 * lus depuis settings/panel.ts.
 *
 * Le nom de l'app (« Analyseur Q », « AQ-52 ») n'est pas traduit.
 */

import type { Lang, Texte } from '../logic/i18n.ts';

export const INTERFACE = {
	// Cadre d'instrument (décor autour des slides).
	'cadre.mesure': { fr: 'Mesure quantique', en: 'Quantum measurement' },

	// Menu
	'menu.titre': { fr: 'Menu', en: 'Menu' },
	'menu.aller': { fr: 'Aller à la slide', en: 'Go to slide' },
	'menu.recommencer': { fr: 'Recommencer au début', en: 'Start over' },
	'menu.fermer': { fr: 'Fermer', en: 'Close' },
	'menu.transition': { fr: 'Transition', en: 'Transition' },
	'menu.langue': { fr: 'Langue', en: 'Language' },
	'menu.aides': {
		fr: 'Aides visuelles : à masquer avant de jouer si le public voit l\'écran.',
		en: 'Visual aids: hide them before performing if the audience can see the screen.',
	},
	'menu.notes': { fr: 'Notes pour l\'artiste', en: 'Performer notes' },
	'menu.jauge': { fr: 'Jauge de l\'appui long', en: 'Long-press gauge' },
	'menu.version': { fr: 'Version', en: 'Version' },
	'menu.cache': { fr: 'Cache hors-ligne', en: 'Offline cache' },
	'menu.stockage': { fr: 'Stockage', en: 'Storage' },
	'menu.affichage': { fr: 'Affichage', en: 'Display' },
	'menu.defauts': { fr: 'Rétablir les réglages par défaut', en: 'Restore default settings' },

	// Aide (gestes et touches)
	'aide.titre': { fr: 'Gestes et touches', en: 'Gestures and keys' },
	'aide.tapDroite': {
		fr: 'Tap sur la droite de l\'écran, ou glisser vers la gauche : slide suivante.',
		en: 'Tap the right of the screen, or swipe left: next slide.',
	},
	'aide.tapGauche': {
		fr: 'Tap sur le tiers gauche, ou glisser vers la droite : slide précédente.',
		en: 'Tap the left third, or swipe right: previous slide.',
	},
	'aide.appui': { fr: 'Appui de 3 s n\'importe où : ce menu.', en: 'Press and hold anywhere for 3 s: this menu.' },
	'aide.clavier': {
		fr: 'Clavier ou télécommande : → espace Page suivante pour avancer, ← Page précédente pour reculer, Échap ou M pour le menu, B pour l\'écran noir.',
		en: 'Keyboard or presenter remote: → space Page Down to advance, ← Page Up to go back, Esc or M for the menu, B for a black screen.',
	},

	// Noms des transitions (la valeur enregistrée, elle, ne change pas : logic/settings.ts).
	'transition.fondu': { fr: 'Fondu', en: 'Fade' },
	'transition.glisse': { fr: 'Glisse', en: 'Slide' },
	'transition.aucune': { fr: 'Aucune', en: 'None' },

	// États affichés en bas du menu.
	'etat.cacheInactif': { fr: 'inactif', en: 'inactive' },
	'etat.installee': { fr: 'app installée', en: 'installed app' },
	'etat.navigateur': { fr: 'navigateur', en: 'browser' },
	'etat.persistant': { fr: 'persistant', en: 'persistent' },
	'etat.nonGaranti': { fr: 'non garanti', en: 'not guaranteed' },
	'etat.inconnu': { fr: 'inconnu', en: 'unknown' },

	// Maintien de l'écran allumé (kit/web/wake-lock.ts donne l'état, le texte est ici).
	'ecran.actif': { fr: 'Écran : verrou actif', en: 'Screen: lock active' },
	'ecran.inactif': { fr: 'Écran : verrou inactif', en: 'Screen: lock inactive' },
	'ecran.lockVideo': { fr: 'Screen Wake Lock API + vidéo muette en boucle', en: 'Screen Wake Lock API + looping muted video' },
	'ecran.lock': 'Screen Wake Lock API',
	'ecran.video': { fr: 'Vidéo muette en boucle', en: 'Looping muted video' },
	'ecran.rien': { fr: 'Touchez l\'écran pour le réactiver', en: 'Touch the screen to turn it back on' },

	// Titre court d'une slide sans texte, dans la liste du menu.
	'slide.chargement': { fr: 'Chargement', en: 'Loading' },
} as const satisfies Record<string, Texte>;

export type CleInterface = keyof typeof INTERFACE;

/** Texte de l'interface dans la langue demandée. */
export function ui(cle: CleInterface, lang: Lang): string {
	const value = INTERFACE[cle];
	return typeof value === 'string' ? value : value[lang];
}
