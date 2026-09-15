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
 *          à 100 %, passe seule à la slide suivante
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
		titre: 'Titre et texte',
		texte: 'Un premier paragraphe.\n\nUn second paragraphe, avec un **mot mis en valeur**.',
		note: 'Tap sur le tiers gauche de l\'écran pour revenir en arrière.',
	},
	{
		grand: '52',
		texte: 'Un mot ou un nombre en très grand',
		note: 'Appui de 3 s n\'importe où : menu (aller à une slide, réglages).',
	},
	{
		texte: 'Une slide avec seulement du texte, plus long, pour vérifier que la taille des caractères s\'adapte à l\'écran. '
			+ 'Tant que tout tient, le texte reste grand ; quand il y en a beaucoup, il rétrécit pour ne jamais sortir de l\'écran.\n\n'
			+ 'Le texte est centré.\nLes retours à la ligne sont conservés.',
	},
	{
		titre: 'Analyse en cours…',
		chargement: 6,
		note: 'Passe seule à la slide suivante à 100 %. Pause pendant que le menu est ouvert.',
	},
	{
		titre: 'Fin',
		note: 'Dernière slide : un tap de plus ne revient pas au début.',
	},
];
