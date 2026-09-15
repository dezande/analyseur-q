/*
 * Rain Man : point d'entrée de l'app.
 *
 * Un diaporama plein écran, 100 % hors-ligne, pour accompagner la routine.
 *   tap à droite, glisser vers la gauche, → ou télécommande : slide suivante
 *   tap sur le tiers gauche, glisser vers la droite, ←        : slide précédente
 *   appui de 3 s n'importe où, Échap ou M                     : menu
 *   B ou « . » (bouton écran noir des télécommandes)          : écran noir
 *
 * Organisation de src/ :
 *   app.ts       ce fichier : démarrage et mises à jour automatiques
 *   content/     LE TEXTE DES SLIDES (slides.ts)
 *   stage/       la scène
 *     deck.ts      construction et affichage des slides, ajustement du texte
 *     input.ts     gestes et clavier
 *   settings/    menu
 *     store.ts     réglages et position, enregistrés sur l'appareil
 *     panel.ts     menu : aller à une slide, réglages
 *   system/      services du navigateur
 *     dom.ts         accès au DOM
 *     wake-lock.ts   écran toujours allumé
 *     build.ts       numéro de version
 *   logic/       logique pure, sans DOM, testée sous Node (tests/logic/)
 *     slides.ts      forme d'une slide, mise en valeur, vérification du contenu
 *     deck.ts        position dans le diaporama
 *     gestures.ts    décision de chaque geste
 *     keys.ts        touches du clavier
 *     settings.ts    forme et validation des réglages
 *   sw/          service worker (cache hors-ligne)
 *   styles/      styles Sass
 *
 * Importer un module installe ses écouteurs : ce fichier ne fait que le démarrage.
 */

import { isMenuOpen } from './settings/panel.ts';
import { forgetTouches, wasTouchedSinceShown } from './stage/input.ts';
import { keepScreenAwake } from './system/wake-lock.ts';

void keepScreenAwake();

/* ---------- Mises à jour ---------- */

document.addEventListener('visibilitychange', () => {
	if (document.visibilityState !== 'visible') return;
	forgetTouches();
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => {});
	}
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
	// Nouvelle version installée : on recharge pour l'afficher, mais seulement si personne n'a
	// touché l'écran depuis l'ouverture (ou le retour au premier plan) : jamais en pleine routine.
	// La slide en cours est enregistrée, elle serait de toute façon reprise.
	// Au tout premier chargement, la prise en main par le premier service worker n'est pas une
	// nouvelle version : rien à recharger. Les suivantes, si.
	let hadController = Boolean(navigator.serviceWorker.controller);
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		if (hadController && !wasTouchedSinceShown() && !isMenuOpen()) location.reload();
		hadController = true;
	});
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('sw.js').catch(() => {});
	});
}
