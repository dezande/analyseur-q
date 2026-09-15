/*
 * Réglages et position dans le diaporama, enregistrés sur l'appareil (localStorage).
 * Validation : logic/settings.ts et logic/deck.ts.
 *
 * Conservés d'une version à l'autre : une mise à jour ne remplace que le cache hors-ligne
 * (sw/sw.ts), jamais le localStorage. Renommer une clé ferait perdre les réglages : garder
 * l'ancienne clé en relecture, comme ci-dessous pour l'ancien nom du projet (rain-man).
 * Un nouveau réglage prend sa valeur par défaut sans toucher aux autres (sanitizeSettings) ;
 * en cas de changement de forme, relire l'ancienne valeur et la convertir.
 */

import { sanitizeSettings, type Settings } from '../logic/settings.ts';

const SETTINGS_KEY = 'analyseur-q:settings:v1';
const POSITION_KEY = 'analyseur-q:position:v1';
/** Clés d'avant le renommage du projet, relues si les nouvelles n'existent pas encore. */
const LEGACY_KEYS: Record<string, string> = {
	[SETTINGS_KEY]: 'rain-man:settings:v1',
	[POSITION_KEY]: 'rain-man:position:v1',
};

function read(key: string): unknown {
	try {
		return JSON.parse(localStorage.getItem(key) ?? localStorage.getItem(LEGACY_KEYS[key]) ?? 'null');
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

export type StorageState = 'persistant' | 'non garanti' | 'inconnu';

/**
 * Demande au navigateur de ne jamais effacer de lui-même les données de l'app (réglages, position,
 * cache hors-ligne), même en manque de place. Renvoie l'état obtenu.
 */
export async function requestPersistentStorage(): Promise<StorageState> {
	try {
		if (!navigator.storage?.persist) return 'inconnu';
		if (await navigator.storage.persisted()) return 'persistant';
		return (await navigator.storage.persist()) ? 'persistant' : 'non garanti';
	} catch {
		return 'inconnu';
	}
}

/** Slide affichée à la dernière utilisation (à valider avec clampIndex). */
export const loadPosition = (): unknown => read(POSITION_KEY);
export const storePosition = (index: number): void => write(POSITION_KEY, index);
