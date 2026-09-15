/*
 * LE CONTENU DU DIAPORAMA : une entrée par slide, dans l'ordre.
 *
 * Champs (tous facultatifs, au moins un parmi titre, grand, texte, image, chargement, bouton) :
 *   etiquette  petite étiquette orange, toujours au même endroit en haut, ex. 'Résultat'
 *   titre  en haut de la slide ; **titre** entre doubles astérisques : en orange
 *   grand  un mot ou un nombre en très grand
 *   texte  texte courant ; retour à la ligne conservé, ligne vide = nouveau paragraphe,
 *          **mots** entre doubles astérisques = mis en valeur ; plus grand sans titre ni grand
 *   image  fichier placé dans public/images/, ex. 'images/carte.png'
 *   chargement  fausse barre de chargement de cette durée en secondes (1 à 120) ;
 *          à 100 %, passe seule à la slide suivante (sauf avec un message termine)
 *   termine message affiché sous la barre à 100 %, ex. 'Analyse quantique terminée' ;
 *          la slide reste alors affichée jusqu'au tap suivant
 *   bouton texte d'un bouton, ex. 'Lancer l\'analyse' : passe à la slide suivante à l'appui
 *          (avec un chargement sur la même slide, c'est lui qui démarre)
 *   boutonVers  numéro de la slide où mène le bouton, ex. 1 pour 'Recommencer'
 *          (par défaut la suivante ; un bouton qui ramène en arrière ne réagit qu'à un vrai appui)
 *   note   note pour l'artiste, visible seulement si « Afficher les notes » est activé
 *
 * Le texte s'adapte tout seul à la taille de l'écran. Une erreur (slide vide, image absente,
 * champ mal orthographié, chargement sur la dernière slide) fait échouer npm test,
 * donc rien de cassé n'est publié.
 *
 * Slides d'exemple ci-dessous : à remplacer par le texte de la routine.
 */

import type { Slide } from '../logic/slides.ts';

export const SLIDES: readonly Slide[] = [
	{
		titre: '**Analyseur Q**',
		image: 'images/logo.svg',
		texte: 'Modèle AQ-52',
		note: 'Tap à droite ou glisser vers la gauche pour avancer.',
	},
	{
		titre: 'Calibration',
		texte: 'Posez le téléphone\nsur le jeu.',
		bouton: 'Lancer l\'analyse',
		note: 'Appuyer sur le bouton pour lancer l\'analyse (slide suivante).',
	},
	{
		titre: 'Analyse en cours',
		chargement: 6,
		note: 'La barre démarre à l\'arrivée sur la slide ; à 100 %, passe seule à la slide suivante.',
	},
	{
		titre: 'Analyse quantique terminée',
		bouton: 'Voir les résultats',
		note: 'Appuyer sur le bouton pour afficher les résultats.',
	},
	{
		etiquette: 'Résultat',
		grand: '24',
		texte: 'cartes face en bas',
	},
	{
		etiquette: 'Résultat',
		grand: '13',
		texte: 'cartes rouges',
	},
	{
		etiquette: 'Résultat',
		image: 'images/royal-flush-coeur.svg',
		texte: 'On peut faire un **royal flush à cœur**',
	},
	{
		etiquette: 'Résultat',
		image: 'images/carreau.svg',
		texte: 'Les autres cartes rouges sont des **carreaux**.',
	},
	{
		etiquette: 'Résultat',
		image: 'images/figure-barree.svg',
		texte: 'Les cartes noires sont toutes des **cartes numérotées** : aucune figure.',
	},
	{
		etiquette: 'Résultat',
		image: 'images/cartes-paires.svg',
		texte: 'Ce sont toutes des cartes paires...',
	},
	{
		etiquette: 'Résultat',
		image: 'images/3-de-pique.svg',
		texte: 'sauf le **3 de pique**',
	},
	{
		titre: '**Merci**',
		image: 'images/logo.svg',
		texte: 'd\'avoir utilisé l\'Analyseur Q',
		bouton: 'Recommencer',
		boutonVers: 1,
		note: 'Le bouton revient à la première slide (un tap à droite ne le déclenche pas).',
	},
];
