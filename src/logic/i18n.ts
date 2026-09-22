/*
 * Les deux langues de l'app et les textes traduits.
 * Fonctions pures, sans DOM ni localStorage : testées sous Node (tests/logic/i18n.test.ts).
 * Le texte des slides est dans content/slides.ts, celui de l'interface dans content/interface.ts.
 */

export const LANGS = ['fr', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/**
 * Un texte affiché : le même dans les deux langues (une chaîne) ou un texte par langue
 * (`{ fr: '…', en: '…' }`). Le nom de l'app, les nombres et les mots identiques s'écrivent
 * donc une seule fois.
 */
export type Texte = string | Readonly<Record<Lang, string>>;

export const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

/** Texte dans la langue demandée (undefined si le champ est absent). */
export function t(value: Texte | undefined, lang: Lang): string | undefined {
	if (value === undefined) return undefined;
	return typeof value === 'string' ? value : value[lang];
}

/** Le champ est-il un texte utilisable : une chaîne, ou une traduction par langue, sans langue vide ? */
export function isTexte(value: unknown): value is Texte {
	if (typeof value === 'string') return true;
	if (!value || typeof value !== 'object') return false;
	const src = value as Record<string, unknown>;
	const keys = Object.keys(src);
	if (keys.length !== LANGS.length || keys.some((key) => !isLang(key))) return false;
	return LANGS.every((lang) => typeof src[lang] === 'string' && src[lang].trim() !== '');
}

/**
 * Langue de départ d'après les langues réglées sur le téléphone (navigator.languages) :
 * anglais si le téléphone est en anglais, français sinon (langue d'origine de la routine).
 */
export function deviceLang(tags: readonly string[] | undefined): Lang {
	for (const tag of tags ?? []) {
		const base = typeof tag === 'string' ? tag.toLowerCase().split('-')[0] : '';
		if (isLang(base)) return base;
	}
	return 'fr';
}
