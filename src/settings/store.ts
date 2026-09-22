/*
 * Réglages enregistrés sur l'appareil (localStorage) et slide en cours gardée le temps de la
 * session (sessionStorage). Validation : logic/settings.ts et logic/deck.ts.
 *
 * Les réglages sont conservés d'une version à l'autre : une mise à jour ne remplace que le cache
 * hors-ligne (sw/sw.ts), jamais le localStorage. Renommer une clé ferait perdre les réglages : garder
 * l'ancienne clé en relecture, comme ci-dessous pour l'ancien nom du projet (rain-man).
 * Un nouveau réglage prend sa valeur par défaut sans toucher aux autres (sanitizeSettings) ;
 * en cas de changement de forme, relire l'ancienne valeur et la convertir.
 */

import { readStored, writeStored } from '../kit/web/storage.ts';
import { deviceLang } from '../logic/i18n.ts';
import { sanitizeSettings, type Settings } from '../logic/settings.ts';

const SETTINGS_KEY = 'analyseur-q:settings:v1';
const POSITION_KEY = 'analyseur-q:position:v1';
/** Clé d'avant le renommage du projet (rain-man), relue si la nouvelle n'existe pas encore. */
const LEGACY_SETTINGS_KEY = 'rain-man:settings:v1';

/**
 * Langue de départ, tant qu'aucune n'a été choisie : celle du téléphone (anglais s'il est en
 * anglais, français sinon). Le choix fait dans l'app est ensuite enregistré comme les autres
 * réglages, et « Rétablir les réglages par défaut » revient à la langue du téléphone.
 */
const DEFAULT_LANG = deviceLang(navigator.languages);

/**
 * Réglages en cours. Les autres modules lisent ce binding (toujours à jour) et peuvent modifier
 * ses champs, puis appellent storeSettings() pour valider et enregistrer.
 */
export let settings: Settings = sanitizeSettings(readStored(SETTINGS_KEY, LEGACY_SETTINGS_KEY), DEFAULT_LANG);

/** Valide et enregistre les réglages. Avec `null` : rétablit les réglages par défaut. */
export function storeSettings(next: unknown = settings): void {
	settings = sanitizeSettings(next, DEFAULT_LANG);
	writeStored(SETTINGS_KEY, settings);
}

/*
 * La slide en cours ne dure que la session de la page (sessionStorage), pas comme les réglages :
 * chaque ouverture de l'app repart de la première slide, prête à jouer, alors qu'un rechargement
 * de la page (mise à jour installée, onglet rouvert par le système) reprend la slide en cours,
 * pour ne jamais retomber au début en pleine routine.
 */

/** Slide affichée avant le dernier rechargement de la page (à valider avec clampIndex). */
export function loadPosition(): unknown {
	try {
		const raw = sessionStorage.getItem(POSITION_KEY);
		if (raw !== null) return JSON.parse(raw);
	} catch {
		// Données abîmées ou stockage indisponible.
	}
	return null;
}

/** Retient la slide affichée pour un éventuel rechargement de la page. */
export function storePosition(index: number): void {
	try {
		sessionStorage.setItem(POSITION_KEY, JSON.stringify(index));
	} catch {
		// Mode privé, stockage plein…
	}
}
