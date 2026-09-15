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

import { readStored, writeStored } from '../kit/web/storage.ts';
import { sanitizeSettings, type Settings } from '../logic/settings.ts';

const SETTINGS_KEY = 'analyseur-q:settings:v1';
const POSITION_KEY = 'analyseur-q:position:v1';
/** Clés d'avant le renommage du projet (rain-man), relues si les nouvelles n'existent pas encore. */
const LEGACY_SETTINGS_KEY = 'rain-man:settings:v1';
const LEGACY_POSITION_KEY = 'rain-man:position:v1';

/**
 * Réglages en cours. Les autres modules lisent ce binding (toujours à jour) et peuvent modifier
 * ses champs, puis appellent storeSettings() pour valider et enregistrer.
 */
export let settings: Settings = sanitizeSettings(readStored(SETTINGS_KEY, LEGACY_SETTINGS_KEY));

/** Valide et enregistre les réglages. Avec `null` : rétablit les réglages par défaut. */
export function storeSettings(next: unknown = settings): void {
	settings = sanitizeSettings(next);
	writeStored(SETTINGS_KEY, settings);
}

/** Slide affichée à la dernière utilisation (à valider avec clampIndex). */
export const loadPosition = (): unknown => readStored(POSITION_KEY, LEGACY_POSITION_KEY);
export const storePosition = (index: number): void => writeStored(POSITION_KEY, index);
