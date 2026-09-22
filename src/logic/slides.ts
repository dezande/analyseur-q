/*
 * Forme d'une slide, mise en valeur dans le texte et vérification du contenu.
 * Fonctions pures, sans DOM : testées sous Node (tests/logic/slides.test.ts).
 * Le contenu lui-même est dans content/slides.ts.
 */

import { ui } from '../content/interface.ts';
import { isTexte, LANGS, t, type Lang, type Texte } from './i18n.ts';
import { LOADING } from './loading.ts';

/*
 * Chaque champ de texte s'écrit soit d'une seule façon (le même mot dans les deux langues,
 * un nombre, le nom de l'app), soit une fois par langue : { fr: '…', en: '…' } (logic/i18n.ts).
 */
export interface Slide {
	/** Petite étiquette, toujours au même endroit en haut de l'écran, ex. « Résultat ». */
	etiquette?: Texte;
	/** Titre, en haut de la slide. */
	titre?: Texte;
	/** Mot ou nombre affiché en très grand, au centre. */
	grand?: Texte;
	/**
	 * Texte courant. Un retour à la ligne est conservé, une ligne vide sépare deux paragraphes.
	 * **mots** entre doubles astérisques : mis en valeur.
	 */
	texte?: Texte;
	/** Image du dossier public/images/, ex. 'images/carte.png' (une par langue si elle porte du texte). */
	image?: Texte;
	/**
	 * Fausse barre de chargement de cette durée, en secondes. À 100 %, passe seule à la slide suivante,
	 * sauf si la slide a un message `termine`.
	 */
	chargement?: number;
	/** Message affiché sous la barre à 100 %, ex. « Analyse quantique terminée » ; la slide reste alors affichée. */
	termine?: Texte;
	/**
	 * Texte d'un bouton, ex. « Lancer l'analyse ». Avec un chargement, celui-ci ne démarre qu'à l'appui ;
	 * sans chargement, le bouton passe à la slide suivante. Tant qu'il n'est pas appuyé, « slide suivante »
	 * (tap à droite, glissement, télécommande) appuie dessus au lieu de sauter la slide.
	 */
	bouton?: Texte;
	/**
	 * Numéro de la slide où mène le bouton (1 = la première), ex. 1 pour « Recommencer ».
	 * Par défaut, la slide suivante. Un bouton qui ramène en arrière n'est actionné que par un appui :
	 * « slide suivante » ne le déclenche pas, pour ne jamais recommencer par erreur.
	 */
	boutonVers?: number;
	/** Note pour l'artiste : visible seulement si « Afficher les notes » est activé. */
	note?: Texte;
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
export function slideLabel(slide: Slide, lang: Lang): string {
	const raw = t(slide.titre, lang) || t(slide.grand, lang) || t(slide.texte, lang) || t(slide.image, lang)
		|| (slide.chargement !== undefined ? ui('slide.chargement', lang) : '');
	const flat = raw.replaceAll('**', '').replace(/\s+/g, ' ').trim();
	return flat.length > LABEL_MAX ? `${flat.slice(0, LABEL_MAX - 1)}…` : flat;
}

const FIELDS: readonly (keyof Slide)[] = ['etiquette', 'titre', 'grand', 'texte', 'image', 'chargement', 'termine', 'bouton', 'boutonVers', 'note'];
/** Champs dont le texte peut être écrit une fois par langue. */
const TRANSLATED: readonly (keyof Slide)[] = ['etiquette', 'titre', 'grand', 'texte', 'image', 'termine', 'bouton', 'note'];

/** Chaque version d'un champ traduit, avec sa langue (une seule version si le texte est commun aux deux). */
function versions(value: Texte): { lang: Lang | null; text: string }[] {
	return typeof value === 'string' ? [{ lang: null, text: value }] : LANGS.map((lang) => ({ lang, text: value[lang] }));
}

/**
 * Erreurs du contenu, une par ligne lisible (liste vide si tout va bien).
 * `imageExists` vérifie qu'un fichier d'image est bien présent.
 * Le contenu est vérifié dans les deux langues : une traduction oubliée ou une image
 * manquante d'un seul côté fait échouer npm test.
 */
export function checkSlides(slides: readonly Slide[], imageExists: (path: string) => boolean): string[] {
	const errors: string[] = [];
	if (slides.length === 0) errors.push('aucune slide');
	slides.forEach((slide, i) => {
		const where = `slide ${i + 1}`;
		const place = (lang: Lang | null): string => (lang === null ? where : `${where} (${lang})`);
		for (const key of Object.keys(slide)) {
			if (!FIELDS.includes(key as keyof Slide)) errors.push(`${where} : champ inconnu « ${key} » (champs possibles : ${FIELDS.join(', ')})`);
		}

		// Forme des champs traduisibles : un texte, ou un texte par langue, aucune langue vide.
		const malformed = new Set<keyof Slide>();
		for (const key of TRANSLATED) {
			const value = slide[key];
			if (value !== undefined && !isTexte(value)) {
				malformed.add(key);
				errors.push(`${where} : champ « ${key} » : un texte, ou un texte par langue { fr: '…', en: '…' } (reçu « ${JSON.stringify(value)} »)`);
			}
		}
		const field = (key: keyof Slide): Texte | undefined => (malformed.has(key) ? undefined : (slide[key] as Texte | undefined));
		const etiquette = field('etiquette');
		const titre = field('titre');
		const grand = field('grand');
		const texte = field('texte');
		const image = field('image');
		const termine = field('termine');
		const bouton = field('bouton');

		// Un champ présent mais vide ou mal écrit est signalé champ par champ : ici, seule compte l'absence.
		const visible = ([slide.titre, slide.grand, slide.texte, slide.image]).some((value) => value !== undefined);
		if (!visible && slide.chargement === undefined && slide.bouton === undefined) errors.push(`${where} : rien à afficher (titre, grand, texte, image, chargement ou bouton)`);

		for (const [key, value] of [['etiquette', etiquette], ['titre', titre], ['grand', grand], ['texte', texte], ['termine', termine], ['bouton', bouton]] as const) {
			if (value === undefined) continue;
			for (const { lang, text } of versions(value)) {
				if (!text.trim()) errors.push(`${place(lang)} : champ « ${key} » vide`);
			}
		}

		if (termine !== undefined && slide.chargement === undefined) errors.push(`${where} : message termine sans chargement`);
		if (bouton !== undefined && i === slides.length - 1 && slide.chargement === undefined && slide.boutonVers === undefined) {
			errors.push(`${where} : bouton sur la dernière slide, il n'y a pas de slide suivante (indiquer boutonVers)`);
		}
		if (slide.boutonVers !== undefined) {
			const target = slide.boutonVers;
			if (bouton === undefined) errors.push(`${where} : boutonVers sans bouton`);
			if (typeof target !== 'number' || !Number.isInteger(target) || target < 1 || target > slides.length) {
				errors.push(`${where} : boutonVers doit être un numéro de slide entre 1 et ${slides.length} (reçu « ${String(target)} »)`);
			}
		}
		if (slide.chargement !== undefined) {
			const seconds = slide.chargement;
			if (typeof seconds !== 'number' || !(seconds >= LOADING.minSeconds && seconds <= LOADING.maxSeconds)) {
				errors.push(`${where} : chargement en secondes, entre ${LOADING.minSeconds} et ${LOADING.maxSeconds} (reçu « ${String(seconds)} »)`);
			}
			if (i === slides.length - 1 && termine === undefined) errors.push(`${where} : chargement sur la dernière slide, il n'y a pas de slide suivante (ajouter un message termine)`);
		}
		if (image !== undefined) {
			for (const { lang, text } of versions(image)) {
				if (!text.startsWith('images/')) errors.push(`${place(lang)} : l'image doit être dans images/ (reçu « ${text} »)`);
				else if (!imageExists(text)) errors.push(`${place(lang)} : image introuvable public/${text}`);
			}
		}
	});
	return errors;
}
