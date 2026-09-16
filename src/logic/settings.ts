/*
 * Réglages : forme, valeurs par défaut et validation.
 * Fonctions pures, sans DOM ni localStorage : testées sous Node (tests/logic/settings.test.ts).
 * Les réglages relus sur l'appareil peuvent venir d'une ancienne version ou être abîmés :
 * tout passe par sanitizeSettings() avant d'être utilisé.
 */

export const TRANSITIONS = ['fondu', 'glisse', 'aucune'] as const;
export type Transition = (typeof TRANSITIONS)[number];

export interface Settings {
	/** Passage d'une slide à l'autre. */
	transition: Transition;
	/** Aides visuelles, à masquer avant de jouer si le public voit l'écran. */
	showNotes: boolean;
	showHoldRing: boolean;
}

export const DEFAULTS: Readonly<Settings> = Object.freeze({
	transition: 'fondu',
	showNotes: true,
	showHoldRing: true,
});

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const isTransition = (v: unknown): v is Transition => TRANSITIONS.includes(v as Transition);

/** Réglages valides à partir de n'importe quelle donnée : chaque champ invalide reprend sa valeur par défaut. */
export function sanitizeSettings(raw: unknown): Settings {
	const src: Partial<Record<keyof Settings, unknown>> = raw && typeof raw === 'object' ? raw : {};
	return {
		transition: isTransition(src.transition) ? src.transition : DEFAULTS.transition,
		showNotes: bool(src.showNotes, DEFAULTS.showNotes),
		showHoldRing: bool(src.showHoldRing, DEFAULTS.showHoldRing),
	};
}
