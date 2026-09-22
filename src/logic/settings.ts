/*
 * Réglages : forme, valeurs par défaut et validation.
 * Fonctions pures, sans DOM ni localStorage : testées sous Node (tests/logic/settings.test.ts).
 * Les réglages relus sur l'appareil peuvent venir d'une ancienne version ou être abîmés :
 * tout passe par sanitizeSettings() avant d'être utilisé.
 */

import { isLang, type Lang } from './i18n.ts';

export const TRANSITIONS = ['fondu', 'glisse', 'aucune'] as const;
export type Transition = (typeof TRANSITIONS)[number];

export interface Settings {
	/** Langue des slides et de l'interface, changée depuis la première slide. */
	langue: Lang;
	/** Passage d'une slide à l'autre. */
	transition: Transition;
	/** Aides visuelles, à masquer avant de jouer si le public voit l'écran. */
	showNotes: boolean;
	showHoldRing: boolean;
}

/**
 * Valeurs par défaut. La langue par défaut dépend du téléphone (i18n.ts : deviceLang) :
 * elle est passée à sanitizeSettings, celle inscrite ici n'est qu'un dernier recours.
 */
export const DEFAULTS: Readonly<Settings> = Object.freeze({
	langue: 'fr',
	transition: 'fondu',
	showNotes: true,
	showHoldRing: true,
});

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const isTransition = (v: unknown): v is Transition => TRANSITIONS.includes(v as Transition);

/**
 * Réglages valides à partir de n'importe quelle donnée : chaque champ invalide reprend sa valeur
 * par défaut. `defaultLang` est la langue à prendre quand aucune n'est enregistrée (celle du
 * téléphone, calculée par l'app) ; avec `null`, tout revient aux valeurs par défaut.
 */
export function sanitizeSettings(raw: unknown, defaultLang: Lang = DEFAULTS.langue): Settings {
	const src: Partial<Record<keyof Settings, unknown>> = raw && typeof raw === 'object' ? raw : {};
	return {
		langue: isLang(src.langue) ? src.langue : defaultLang,
		transition: isTransition(src.transition) ? src.transition : DEFAULTS.transition,
		showNotes: bool(src.showNotes, DEFAULTS.showNotes),
		showHoldRing: bool(src.showHoldRing, DEFAULTS.showHoldRing),
	};
}
