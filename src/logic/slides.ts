/*
 * Forme d'une slide, mise en valeur dans le texte et vérification du contenu.
 * Fonctions pures, sans DOM : testées sous Node (tests/logic/slides.test.ts).
 * Le contenu lui-même est dans content/slides.ts.
 */

import { LOADING } from './loading.ts';

export interface Slide {
	/** Petite étiquette, toujours au même endroit en haut de l'écran, ex. « Résultat ». */
	etiquette?: string;
	/** Titre, en haut de la slide. */
	titre?: string;
	/** Mot ou nombre affiché en très grand, au centre. */
	grand?: string;
	/**
	 * Texte courant. Un retour à la ligne est conservé, une ligne vide sépare deux paragraphes.
	 * **mots** entre doubles astérisques : mis en valeur.
	 */
	texte?: string;
	/** Image du dossier public/images/, ex. 'images/carte.png'. */
	image?: string;
	/**
	 * Fausse barre de chargement de cette durée, en secondes. À 100 %, passe seule à la slide suivante,
	 * sauf si la slide a un message `termine`.
	 */
	chargement?: number;
	/** Message affiché sous la barre à 100 %, ex. « Analyse quantique terminée » ; la slide reste alors affichée. */
	termine?: string;
	/**
	 * Texte d'un bouton, ex. « Lancer l'analyse ». Avec un chargement, celui-ci ne démarre qu'à l'appui ;
	 * sans chargement, le bouton passe à la slide suivante. Tant qu'il n'est pas appuyé, « slide suivante »
	 * (tap à droite, glissement, télécommande) appuie dessus au lieu de sauter la slide.
	 */
	bouton?: string;
	/** Note pour l'artiste : visible seulement si « Afficher les notes » est activé. */
	note?: string;
}

/** Morceau de texte, mis en valeur ou non. */
export interface Segment {
	text: string;
	strong: boolean;
}

/**
 * Découpe une ligne selon les **mises en valeur**.
 * Un ** sans partenaire est gardé tel quel, pour ne jamais faire disparaître de texte.
 */
export function parseInline(line: string): Segment[] {
	const parts = line.split('**');
	// Nombre impair de ** : le dernier n'a pas de partenaire.
	if (parts.length % 2 === 0) {
		const last = parts.pop() ?? '';
		parts[parts.length - 1] += `**${last}`;
	}
	return parts
		.map((text, i) => ({ text, strong: i % 2 === 1 }))
		.filter((segment) => segment.text !== '');
}

/** Paragraphes d'un texte (séparés par une ligne vide), chacun découpé en lignes. */
export function paragraphs(texte: string): string[][] {
	return texte
		.replace(/\r\n?/g, '\n')
		.trim()
		.split(/\n[ \t]*\n+/)
		.map((paragraph) => paragraph.split('\n').map((line) => line.trim()))
		.filter((lines) => lines.some(Boolean));
}

/** Longueur maximale du titre court d'une slide dans le menu. */
const LABEL_MAX = 60;

/** Titre court d'une slide pour la liste du menu : titre, sinon grand, texte, image ou « Chargement ». */
export function slideLabel(slide: Slide): string {
	const raw = slide.titre || slide.grand || slide.texte || slide.image || (slide.chargement !== undefined ? 'Chargement' : '');
	const flat = raw.replaceAll('**', '').replace(/\s+/g, ' ').trim();
	return flat.length > LABEL_MAX ? `${flat.slice(0, LABEL_MAX - 1)}…` : flat;
}

const FIELDS: readonly (keyof Slide)[] = ['etiquette', 'titre', 'grand', 'texte', 'image', 'chargement', 'termine', 'bouton', 'note'];

/**
 * Erreurs du contenu, une par ligne lisible (liste vide si tout va bien).
 * `imageExists` vérifie qu'un fichier d'image est bien présent.
 */
export function checkSlides(slides: readonly Slide[], imageExists: (path: string) => boolean): string[] {
	const errors: string[] = [];
	if (slides.length === 0) errors.push('aucune slide');
	slides.forEach((slide, i) => {
		const where = `slide ${i + 1}`;
		for (const key of Object.keys(slide)) {
			if (!FIELDS.includes(key as keyof Slide)) errors.push(`${where} : champ inconnu « ${key} » (champs possibles : ${FIELDS.join(', ')})`);
		}
		const visible = [slide.titre, slide.grand, slide.texte, slide.image].some((value) => value?.trim());
		if (!visible && slide.chargement === undefined && !slide.bouton?.trim()) errors.push(`${where} : rien à afficher (titre, grand, texte, image, chargement ou bouton)`);
		if (slide.termine !== undefined) {
			if (typeof slide.termine !== 'string' || !slide.termine.trim()) errors.push(`${where} : message termine vide`);
			if (slide.chargement === undefined) errors.push(`${where} : message termine sans chargement`);
		}
		if (slide.bouton !== undefined) {
			if (typeof slide.bouton !== 'string' || !slide.bouton.trim()) errors.push(`${where} : bouton sans texte`);
			if (i === slides.length - 1 && slide.chargement === undefined) errors.push(`${where} : bouton sur la dernière slide, il n'y a pas de slide suivante`);
		}
		if (slide.chargement !== undefined) {
			const seconds = slide.chargement;
			if (typeof seconds !== 'number' || !(seconds >= LOADING.minSeconds && seconds <= LOADING.maxSeconds)) {
				errors.push(`${where} : chargement en secondes, entre ${LOADING.minSeconds} et ${LOADING.maxSeconds} (reçu « ${String(seconds)} »)`);
			}
			if (i === slides.length - 1 && slide.termine === undefined) errors.push(`${where} : chargement sur la dernière slide, il n'y a pas de slide suivante (ajouter un message termine)`);
		}
		if (slide.image !== undefined) {
			if (!slide.image.startsWith('images/')) errors.push(`${where} : l'image doit être dans images/ (reçu « ${slide.image} »)`);
			else if (!imageExists(slide.image)) errors.push(`${where} : image introuvable public/${slide.image}`);
		}
	});
	return errors;
}
