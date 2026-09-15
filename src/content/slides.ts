/*
 * LE CONTENU DU DIAPORAMA : une entrée par slide, dans l'ordre.
 *
 * Champs (tous facultatifs, au moins un parmi titre, grand, texte, image, chargement) :
 *   titre  en haut de la slide ; **titre** entre doubles astérisques : en orange
 *   grand  un mot ou un nombre en très grand
 *   texte  texte courant ; retour à la ligne conservé, ligne vide = nouveau paragraphe,
 *          **mots** entre doubles astérisques = mis en valeur
 *   image  fichier placé dans public/images/, ex. 'images/carte.png'
 *   chargement  fausse barre de chargement de cette durée en secondes (1 à 120) ;
 *          à 100 %, passe seule à la slide suivante (sauf avec un message termine)
 *   termine message affiché sous la barre à 100 %, ex. 'Analyse quantique terminée' ;
 *          la slide reste alors affichée jusqu'au tap suivant
 *   bouton texte d'un bouton, ex. 'Lancer l\'analyse' : passe à la slide suivante à l'appui
 *          (avec un chargement sur la même slide, c'est lui qui démarre)
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
		grand: '24',
		texte: 'cartes face en bas',
	},
	{
		grand: '13',
		texte: 'cartes rouges',
	},
	{
		image: 'images/royal-flush-coeur.svg',
		texte: 'On peut faire un **royal flush à cœur**',
	},
	{
		texte: 'Les autres cartes rouges\nsont des **carreaux**.',
	},
	{
		texte: 'Les cartes noires sont toutes\ndes **cartes numérotées** :\naucune figure.',
	},
	{
		texte: 'Ce sont toutes\ndes cartes paires...',
	},
	{
		image: 'images/3-de-pique.svg',
		texte: 'sauf le **3 de pique**',
	},
];
