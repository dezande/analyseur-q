/*
 * LE CONTENU DU DIAPORAMA : une entrée par slide, dans l'ordre.
 *
 * DEUX LANGUES. Chaque champ de texte s'écrit soit une seule fois (le même dans les deux langues :
 * un nombre, le nom de l'app), soit une fois par langue : { fr: '…', en: '…' }. Une traduction
 * oubliée ou vide fait échouer npm test. Le texte du menu, lui, est dans interface.ts.
 * La langue se choisit sur la première slide (boutons FR / EN) et reste enregistrée.
 *
 * Champs (tous facultatifs, au moins un parmi titre, grand, texte, image, chargement, bouton) :
 *   etiquette  petite étiquette orange, toujours au même endroit en haut, ex. 'Résultat'
 *   titre  en haut de la slide ; **titre** entre doubles astérisques : en orange
 *   grand  un mot ou un nombre en très grand
 *   texte  texte courant ; retour à la ligne conservé, ligne vide = nouveau paragraphe,
 *          **mots** entre doubles astérisques = mis en valeur ; plus grand sans titre ni grand
 *   image  fichier placé dans public/images/, ex. 'images/carte.png' ; une image par langue
 *          si elle porte du texte (les figures : R D V en français, K Q J en anglais)
 *   chargement  faux chargement de cette durée en secondes (1 à 120), affiché en cadran ;
 *          à 100 %, passe seule à la slide suivante (sauf avec un message termine)
 *   etapes liste des étapes annoncées sous le cadran, dans l'ordre, ex.
 *          ['Étalonnage du capteur', 'Mesure des états'] : elles se partagent la durée
 *   termine message affiché sous le cadran à 100 %, ex. 'Analyse quantique terminée' ;
 *          la slide reste alors affichée jusqu'au tap suivant
 *   bouton texte d'un bouton, ex. 'Lancer l\'analyse' : passe à la slide suivante à l'appui
 *          (avec un chargement sur la même slide, c'est lui qui démarre)
 *   boutonVers  numéro de la slide où mène le bouton, ex. 1 pour 'Recommencer'
 *          (par défaut la suivante ; un bouton qui ramène en arrière ne réagit qu'à un vrai appui)
 *   note   note pour l'artiste, visible seulement si « Afficher les notes » est activé
 *
 * Le texte s'adapte tout seul à la taille de l'écran. Une erreur (slide vide, image absente,
 * champ mal orthographié, traduction manquante, chargement sur la dernière slide) fait échouer
 * npm test, donc rien de cassé n'est publié.
 *
 * Slides d'exemple ci-dessous : à remplacer par le texte de la routine.
 */

import type { Slide } from '../logic/slides.ts';

export const SLIDES: readonly Slide[] = [
	{
		titre: '**Analyseur Q**',
		image: 'images/logo.svg',
		texte: { fr: 'Modèle AQ-52', en: 'Model AQ-52' },
		note: {
			fr: 'Tap à droite ou glisser vers la gauche pour avancer. La langue se choisit en haut à droite.',
			en: 'Tap the right side or swipe left to advance. The language is chosen at the top right.',
		},
	},
	{
		titre: 'Calibration',
		texte: { fr: 'Posez le téléphone\nsur le jeu.', en: 'Place the phone\non the deck.' },
		bouton: { fr: 'Lancer l\'analyse', en: 'Start the analysis' },
		note: {
			fr: 'Appuyer sur le bouton pour lancer l\'analyse (slide suivante).',
			en: 'Press the button to start the analysis (next slide).',
		},
	},
	{
		titre: { fr: 'Analyse en cours', en: 'Analysis in progress' },
		chargement: 9,
		etapes: [
			{ fr: 'Étalonnage du capteur quantique', en: 'Calibrating the quantum sensor' },
			{ fr: 'Balayage des ondes de spin du paquet', en: 'Scanning the deck\'s spin waves' },
			{ fr: 'Mesure des états superposés', en: 'Measuring the superposed states' },
			{ fr: 'Décohérence contrôlée des cartes face en bas', en: 'Controlled decoherence of the face-down cards' },
			{ fr: 'Corrélation chromatique et indices de parité', en: 'Chromatic correlation and parity indices' },
			{ fr: 'Consolidation du rapport d\'analyse', en: 'Consolidating the analysis report' },
		],
		note: {
			fr: 'Le cadran démarre à l\'arrivée sur la slide ; à 100 %, passe seule à la slide suivante.',
			en: 'The dial starts on arriving at the slide; at 100 %, it moves on by itself.',
		},
	},
	{
		titre: { fr: 'Analyse quantique terminée', en: 'Quantum analysis complete' },
		bouton: { fr: 'Voir les résultats', en: 'See the results' },
		note: {
			fr: 'Appuyer sur le bouton pour afficher les résultats.',
			en: 'Press the button to show the results.',
		},
	},
	{
		etiquette: { fr: 'Résultat', en: 'Result' },
		grand: '24',
		texte: { fr: 'cartes face en bas', en: 'cards face down' },
	},
	{
		etiquette: { fr: 'Résultat', en: 'Result' },
		grand: '13',
		texte: { fr: 'cartes rouges', en: 'red cards' },
	},
	{
		etiquette: { fr: 'Résultat', en: 'Result' },
		image: { fr: 'images/royal-flush-coeur.svg', en: 'images/royal-flush-coeur-en.svg' },
		texte: {
			fr: 'On peut faire un **royal flush à cœur**',
			en: 'You can make a **royal flush in hearts**',
		},
	},
	{
		etiquette: { fr: 'Résultat', en: 'Result' },
		image: 'images/carreau.svg',
		texte: {
			fr: 'Les autres cartes rouges sont des **carreaux**.',
			en: 'The other red cards are **diamonds**.',
		},
	},
	{
		etiquette: { fr: 'Résultat', en: 'Result' },
		image: { fr: 'images/figure-barree.svg', en: 'images/figure-barree-en.svg' },
		texte: {
			fr: 'Les cartes noires sont toutes des **cartes à points** : aucune figure.',
			en: 'The black cards are all **spot cards**: no court cards.',
		},
	},
	{
		etiquette: { fr: 'Résultat', en: 'Result' },
		image: 'images/cartes-paires.svg',
		texte: { fr: 'Ce sont toutes des cartes paires...', en: 'They are all even cards...' },
	},
	{
		etiquette: { fr: 'Résultat', en: 'Result' },
		image: 'images/3-de-pique.svg',
		texte: { fr: 'sauf le **3 de pique**', en: 'except the **3 of spades**' },
	},
	{
		titre: { fr: '**Merci**', en: '**Thank you**' },
		image: 'images/logo.svg',
		texte: { fr: 'd\'avoir utilisé l\'Analyseur Q', en: 'for using the Analyseur Q' },
		bouton: { fr: 'Recommencer', en: 'Start over' },
		boutonVers: 1,
		note: {
			fr: 'Le bouton revient à la première slide (un tap à droite ne le déclenche pas).',
			en: 'The button goes back to the first slide (a tap on the right does not trigger it).',
		},
	},
];
