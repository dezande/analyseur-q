/*
 * Langue de l'app : français ou anglais, changée depuis la première slide.
 *
 * Le texte de l'interface est écrit une seule fois, dans content/interface.ts : public/index.html
 * ne porte que les clés (`data-texte` pour le contenu, `data-texte-label` pour l'aria-label),
 * remplies ici à l'ouverture puis à chaque changement de langue.
 *
 * Les modules qui construisent du texte (le diaporama, la liste du menu) s'annoncent avec
 * onLangChange() et se reconstruisent : pas d'import croisé entre eux.
 */

import { ui, type CleInterface } from '../content/interface.ts';
import { type Lang } from '../logic/i18n.ts';
import { settings, storeSettings } from './store.ts';

export const langue = (): Lang => settings.langue;

/** Textes de l'interface dans la langue en cours, et langue du document (lecteurs d'écran). */
function applyInterface(): void {
	const lang = settings.langue;
	document.documentElement.lang = lang;
	for (const el of document.querySelectorAll<HTMLElement>('[data-texte]')) {
		el.textContent = ui(el.dataset.texte as CleInterface, lang);
	}
	for (const el of document.querySelectorAll<HTMLElement>('[data-texte-label]')) {
		el.setAttribute('aria-label', ui(el.dataset.texteLabel as CleInterface, lang));
	}
}

const listeners = new Set<() => void>();

/** À rappeler quand la langue change (reconstruction des slides, du menu…). */
export function onLangChange(listener: () => void): void {
	listeners.add(listener);
}

/** Change la langue, l'enregistre et remet à jour tout ce qui porte du texte. */
export function setLangue(lang: Lang): void {
	if (lang === settings.langue) return;
	storeSettings({ ...settings, langue: lang });
	applyInterface();
	for (const listener of listeners) listener();
}

applyInterface();
