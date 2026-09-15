/*
 * Menu, ouvert par un appui de 3 s (ou Échap / M au clavier) :
 * aller à une slide, réglages d'affichage, état de l'écran et version.
 */

import { TRANSITIONS, type Settings } from '../logic/settings.ts';
import { counterLabel } from '../logic/deck.ts';
import { applyDisplaySettings, currentIndex, goTo, slideCount, slideLabel } from '../stage/deck.ts';
import { BUILD } from '../system/build.ts';
import { $ } from '../system/dom.ts';
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
	button.append(slideLabel(i));
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
	const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || (navigator as { standalone?: boolean }).standalone === true;
	$('#about-display').textContent = standalone ? 'app installée' : 'navigateur';
}

/**
 * Nom du cache hors-ligne (rain-man-<empreinte>). L'empreinte change à chaque nouvelle version :
 * c'est ce qui fait retélécharger l'app aux téléphones où elle est installée.
 */
async function showCache(): Promise<void> {
	const cell = $('#about-cache');
	const controlled = 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);
	const names = 'caches' in window ? (await caches.keys().catch(() => [])).filter((name) => name.startsWith('rain-man-')) : [];
	cell.textContent = !controlled || names.length === 0 ? 'inactif' : names.join(', ');
}

export function openMenu(): void {
	refresh();
	menu.hidden = false;
	list.querySelector('.current')?.scrollIntoView({ block: 'center' });
}

export function closeMenu(): void {
	menu.hidden = true;
}

/* ---------- Réglages ---------- */

function update(change: Partial<Settings>): void {
	storeSettings({ ...settings, ...change });
	applyDisplaySettings();
	refresh();
}

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
$('#defaults-btn').addEventListener('click', () => {
	storeSettings(null);
	applyDisplaySettings();
	refresh();
});
