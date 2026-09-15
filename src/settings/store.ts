/*
 * Réglages et position dans le diaporama, enregistrés sur l'appareil (localStorage).
 * Validation : logic/settings.ts et logic/deck.ts.
 */

import { sanitizeSettings, type Settings } from '../logic/settings.ts';

const SETTINGS_KEY = 'rain-man:settings:v1';
const POSITION_KEY = 'rain-man:position:v1';

function read(key: string): unknown {
	try {
		return JSON.parse(localStorage.getItem(key) ?? 'null');
	} catch {
		return null;
	}
}

function write(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Stockage indisponible : gardé pour la session seulement.
	}
}

/**
 * Réglages en cours. Les autres modules lisent ce binding (toujours à jour) et peuvent modifier
 * ses champs, puis appellent storeSettings() pour valider et enregistrer.
 */
export let settings: Settings = sanitizeSettings(read(SETTINGS_KEY));

/** Valide et enregistre les réglages. Avec `null` : rétablit les réglages par défaut. */
export function storeSettings(next: unknown = settings): void {
	settings = sanitizeSettings(next);
	write(SETTINGS_KEY, settings);
}

/** Slide affichée à la dernière utilisation (à valider avec clampIndex). */
export const loadPosition = (): unknown => read(POSITION_KEY);
export const storePosition = (index: number): void => write(POSITION_KEY, index);
