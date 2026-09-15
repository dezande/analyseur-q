/*
 * Menu, ouvert par un appui de 3 s (ou Échap / M au clavier) :
 * aller à une slide, réglages d'affichage, état de l'écran et version.
 */

import { SLIDES } from '../content/slides.ts';
import { BUILD } from '../kit/web/build.ts';
import { $ } from '../kit/web/dom.ts';
import { requestPersistentStorage } from '../kit/web/storage.ts';
import { appCacheNames } from '../kit/web/updates.ts';
import { describeWake, onWakeChange } from '../kit/web/wake-lock.ts';
import { counterLabel } from '../logic/deck.ts';
import { TRANSITIONS, type Settings } from '../logic/settings.ts';
import { slideLabel } from '../logic/slides.ts';
import { applyDisplaySettings, currentIndex, goTo, slideCount } from '../stage/deck.ts';
import { settings, storeSettings } from './store.ts';

const menu = $('#menu');
const list = $('#slide-list');

type Toggle = 'showCounter' | 'showProgress' | 'showNotes' | 'showHoldRing';
const TOGGLES: Record<Toggle, string> = {
	showCounter: '#show-counter',
	showProgress: '#show-progress',
	showNotes: '#show-notes',
	showHoldRing: '#show-hold-ring',
};

export const isMenuOpen = (): boolean => !menu.hidden;

/* ---------- Liste des slides ---------- */

for (let i = 0; i < slideCount; i++) {
	const button = list.appendChild(document.createElement('button'));
	button.type = 'button';
	button.dataset.index = String(i);
	const number = button.appendChild(document.createElement('span'));
	number.className = 'num';
	number.textContent = String(i + 1);
	button.append(slideLabel(SLIDES[i]));
	button.addEventListener('click', () => {
		goTo(i);
		closeMenu();
	});
}

/* ---------- Affichage du menu ---------- */

/** Recopie les réglages et l'état en cours dans le menu. */
function refresh(): void {
	for (const [key, selector] of Object.entries(TOGGLES) as [Toggle, string][]) {
		$<HTMLInputElement>(selector).checked = settings[key];
	}
	for (const button of menu.querySelectorAll<HTMLButtonElement>('[data-transition]')) {
		button.setAttribute('aria-checked', String(button.dataset.transition === settings.transition));
	}
	const current = currentIndex();
	for (const button of list.querySelectorAll<HTMLButtonElement>('button')) {
		const isCurrent = Number(button.dataset.index) === current;
		button.classList.toggle('current', isCurrent);
		if (isCurrent) button.setAttribute('aria-current', 'true');
		else button.removeAttribute('aria-current');
	}
	$('#menu-position').textContent = counterLabel(current, slideCount);
	$('#menu-version').textContent = `Version ${BUILD.version}`;
	$('#about-version').textContent = `${BUILD.version} (${BUILD.commit})`;
	void showCache();
	void requestPersistentStorage().then((state) => {
		$('#about-storage').textContent = state;
	});
	const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || (navigator as { standalone?: boolean }).standalone === true;
	$('#about-display').textContent = standalone ? 'app installée' : 'navigateur';
}

/**
 * Nom du cache hors-ligne (analyseur-q-<empreinte>). L'empreinte change à chaque nouvelle version :
 * c'est ce qui fait retélécharger l'app aux téléphones où elle est installée.
 */
async function showCache(): Promise<void> {
	const names = await appCacheNames('analyseur-q');
	$('#about-cache').textContent = names.length === 0 ? 'inactif' : names.join(', ');
}

// État du maintien de l'écran allumé (kit/web/wake-lock.ts).
onWakeChange((state) => {
	const wake = describeWake(state);
	$('#wake-dot').className = `dot ${state.lock ? 'lock' : state.video ? 'video' : 'off'}`;
	$('#wake-text').textContent = wake.text;
	$('#wake-detail').textContent = wake.detail;
});

/**
 * Clics ignorés dans le menu jusqu'à cet instant (performance.now()). Le doigt de l'appui long
 * se relève sur le menu qui vient d'apparaître : sans ça, il « cliquerait » sur le bouton
 * placé dessous (aller à une slide, cocher une option) et refermerait le menu.
 */
let ignoreClicksUntil = 0;
/** Délai après le relâchement de l'appui long, pour le clic que le navigateur envoie ensuite. */
const CLICK_GUARD_MS = 400;

menu.addEventListener('click', (event) => {
	if (performance.now() >= ignoreClicksUntil) return;
	event.preventDefault();
	event.stopPropagation();
}, true);

/** Ouvre le menu. `byHold` : ouvert par l'appui long, doigt encore posé (voir holdReleased). */
export function openMenu(byHold = false): void {
	if (byHold) ignoreClicksUntil = Infinity;
	refresh();
	menu.hidden = false;
	list.querySelector('.current')?.scrollIntoView({ block: 'center' });
}

/** Le doigt de l'appui long s'est relevé : les clics seront de nouveau acceptés dans un instant. */
export function holdReleased(): void {
	if (ignoreClicksUntil === Infinity) ignoreClicksUntil = performance.now() + CLICK_GUARD_MS;
}

export function closeMenu(): void {
	menu.hidden = true;
}

/* ---------- Réglages ---------- */

/** Enregistre les réglages (null : réglages par défaut), les applique et met le menu à jour. */
function save(next: Settings | null): void {
	storeSettings(next);
	applyDisplaySettings();
	refresh();
}

const update = (change: Partial<Settings>): void => save({ ...settings, ...change });

for (const [key, selector] of Object.entries(TOGGLES) as [Toggle, string][]) {
	$<HTMLInputElement>(selector).addEventListener('change', (event) => {
		update({ [key]: (event.target as HTMLInputElement).checked });
	});
}

const seg = $('#transition-seg');
for (const transition of TRANSITIONS) {
	const button = seg.appendChild(document.createElement('button'));
	button.type = 'button';
	button.setAttribute('role', 'radio');
	button.dataset.transition = transition;
	button.textContent = transition[0].toUpperCase() + transition.slice(1);
	button.addEventListener('click', () => update({ transition }));
}

$('#restart-btn').addEventListener('click', () => {
	goTo(0);
	closeMenu();
});
$('#close-btn').addEventListener('click', closeMenu);
$('#defaults-btn').addEventListener('click', () => save(null));
