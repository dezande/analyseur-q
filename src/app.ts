/*
 * Analyseur Q (analyseur d'ondes quantiques des cartes à jouer) : point d'entrée de l'app.
 * Accessoire de la routine Rain Man.
 *
 * Un diaporama plein écran, 100 % hors-ligne, pour accompagner la routine.
 *   tap à droite, glisser vers la gauche, → ou télécommande : slide suivante
 *   tap sur le tiers gauche, glisser vers la droite, ←        : slide précédente
 *   appui de 3 s n'importe où, Échap ou M                     : menu
 *   B ou « . » (bouton écran noir des télécommandes)          : écran noir
 *
 * Organisation de src/ :
 *   app.ts       ce fichier : démarrage et mises à jour automatiques
 *   content/     LE TEXTE : slides.ts (les slides, en français et en anglais) et interface.ts (le menu)
 *   stage/       la scène
 *     deck.ts      construction et affichage des slides, ajustement du texte
 *     input.ts     gestes et clavier
 *   settings/    menu et réglages
 *     store.ts     réglages enregistrés sur l'appareil, slide en cours gardée le temps de la session
 *     langue.ts    français ou anglais : textes de l'interface, changement depuis la première slide
 *     panel.ts     menu : aller à une slide, réglages
 *   kit/         code commun des accessoires de scène (sous-module kit-scene, voir son README) :
 *                écran allumé, portrait, hors-ligne et mises à jour, stockage, version
 *   logic/       logique pure, sans DOM, testée sous Node (tests/logic/)
 *     slides.ts      forme d'une slide, mise en valeur, vérification du contenu
 *     deck.ts        position dans le diaporama
 *     gestures.ts    décision de chaque geste
 *     keys.ts        touches du clavier
 *     settings.ts    forme et validation des réglages
 *     i18n.ts        les deux langues : textes traduits, langue du téléphone
 *   sw/          compilation du service worker du kit (kit/sw/sw.ts)
 *   styles/      styles Sass
 *
 * Importer un module installe ses écouteurs : ce fichier ne fait que le démarrage.
 */

import { requestPersistentStorage } from './kit/web/storage.ts';
import { setupUpdates } from './kit/web/updates.ts';
import { keepScreenAwake } from './kit/web/wake-lock.ts';
import { isMenuOpen } from './settings/panel.ts';
import { forgetTouches, wasTouchedSinceShown } from './stage/input.ts';

void keepScreenAwake();
void requestPersistentStorage();

// Mises à jour : rechargement automatique seulement si personne n'a touché l'écran depuis
// l'ouverture (ou le retour au premier plan) et que le menu est fermé, jamais en pleine routine.
// Le rechargement reprend la slide en cours (gardée le temps de la session).
setupUpdates({
	canReload: () => !wasTouchedSinceShown() && !isMenuOpen(),
	onVisible: forgetTouches,
});
