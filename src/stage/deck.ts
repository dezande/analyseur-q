/*
 * Le diaporama affiché : construction des slides, passage de l'une à l'autre,
 * ajustement du texte à l'écran, fausse barre de chargement, compteur, barre de progression,
 * note et écran noir.
 */

import { SLIDES } from '../content/slides.ts';
import { applyMove, clampIndex, counterLabel, type Move } from '../logic/deck.ts';
import { paragraphs, parseInline, type Slide } from '../logic/slides.ts';
import { loadPosition, settings, storePosition } from '../settings/store.ts';
import { $ } from '../system/dom.ts';
import { startLoading, stopLoading } from './loading.ts';

const deckEl = $('#deck');
const counterEl = $('#counter');
const progressEl = $('#progress-bar');
const noteEl = $('#note');
const blackEl = $('#black');

export const slideCount = SLIDES.length;
let index = clampIndex(loadPosition(), slideCount);

/* ---------- Construction ---------- */

/** Ajoute une ligne de texte, avec ses mises en valeur, sans jamais interpréter de HTML. */
function appendLine(parent: HTMLElement, line: string): void {
	for (const segment of parseInline(line)) {
		if (segment.strong) {
			const strong = parent.appendChild(document.createElement('strong'));
			strong.textContent = segment.text;
		} else {
			parent.append(segment.text);
		}
	}
}

function buildSlide(slide: Slide, i: number): HTMLElement {
	const section = document.createElement('section');
	section.className = 'slide';
	section.dataset.index = String(i);
	section.setAttribute('aria-roledescription', 'slide');
	section.setAttribute('aria-label', counterLabel(i, slideCount));
	const body = section.appendChild(document.createElement('div'));
	body.className = 'slide-body';

	if (slide.titre) {
		const h = body.appendChild(document.createElement('h1'));
		h.className = 'titre';
		appendLine(h, slide.titre);
	}
	if (slide.image) {
		const img = body.appendChild(document.createElement('img'));
		img.className = 'image';
		img.src = slide.image;
		img.alt = '';
		img.addEventListener('load', () => fit(section));
	}
	if (slide.grand) {
		const big = body.appendChild(document.createElement('p'));
		big.className = 'grand';
		appendLine(big, slide.grand);
	}
	if (slide.texte) {
		const text = body.appendChild(document.createElement('div'));
		text.className = 'texte';
		for (const lines of paragraphs(slide.texte)) {
			const p = text.appendChild(document.createElement('p'));
			lines.forEach((line, n) => {
				if (n > 0) p.append(document.createElement('br'));
				appendLine(p, line);
			});
		}
	}
	if (slide.chargement !== undefined) {
		const loading = body.appendChild(document.createElement('div'));
		loading.className = 'chargement';
		const track = loading.appendChild(document.createElement('div'));
		track.className = 'chargement-piste';
		track.appendChild(document.createElement('div')).className = 'chargement-bar';
		const percent = loading.appendChild(document.createElement('div'));
		percent.className = 'chargement-pourcent';
		percent.textContent = '0 %';
	}
	return section;
}

const slideEls = SLIDES.map(buildSlide);
deckEl.replaceChildren(...slideEls);

/* ---------- Ajustement du texte ---------- */

/** Plus petite échelle du texte : en dessous, mieux vaut raccourcir la slide. */
const MIN_FIT = 0.25;

/**
 * Plus grande échelle (--fit, entre MIN_FIT et 1) à laquelle le contenu tient dans la slide,
 * sans débordement en hauteur ni mot coupé en largeur. Recherche par dichotomie.
 */
function fit(section: HTMLElement): void {
	const body = section.firstElementChild as HTMLElement;
	const style = getComputedStyle(section);
	const height = section.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
	const fits = (scale: number): boolean => {
		section.style.setProperty('--fit', String(scale));
		return body.scrollHeight <= height + 1 && body.scrollWidth <= body.clientWidth + 1;
	};
	if (fits(1)) return;
	let lo = MIN_FIT;
	let hi = 1;
	for (let step = 0; step < 8; step++) {
		const mid = (lo + hi) / 2;
		if (fits(mid)) lo = mid;
		else hi = mid;
	}
	section.style.setProperty('--fit', String(lo));
}

export function fitAll(): void {
	for (const section of slideEls) fit(section);
}

let resizeFrame = 0;
window.addEventListener('resize', () => {
	cancelAnimationFrame(resizeFrame);
	resizeFrame = requestAnimationFrame(fitAll);
});
void document.fonts?.ready.then(fitAll);

/* ---------- Navigation ---------- */

/** Slide dont le chargement est lancé ; -1 si aucune. Revenir sur une slide relance son chargement. */
let loadingIndex = -1;

/** Lance le chargement de la slide courante si elle en a un et qu'il ne tourne pas déjà. */
function syncLoading(): void {
	if (loadingIndex === index) return;
	stopLoading();
	loadingIndex = -1;
	const seconds = SLIDES[index]?.chargement;
	if (seconds === undefined) return;
	loadingIndex = index;
	const from = index;
	startLoading(slideEls[index], seconds, () => {
		if (index === from) goTo(from + 1);
	});
}

/** Place chaque slide avant, sur ou après la slide courante (les transitions CSS font le reste). */
function render(): void {
	slideEls.forEach((section, i) => {
		section.classList.toggle('before', i < index);
		section.classList.toggle('current', i === index);
		section.classList.toggle('after', i > index);
		section.setAttribute('aria-hidden', String(i !== index));
	});
	counterEl.textContent = counterLabel(index, slideCount);
	progressEl.style.transform = `scaleX(${slideCount > 1 ? index / (slideCount - 1) : 1})`;
	const note = SLIDES[index]?.note ?? '';
	noteEl.textContent = note;
	noteEl.hidden = !settings.showNotes || !note;
	syncLoading();
}

export const currentIndex = (): number => index;

/** Affiche la slide `target` (bornée). L'écran noir, s'il est actif, est levé. */
export function goTo(target: number): void {
	setBlack(false);
	const next = clampIndex(target, slideCount);
	if (next === index) return;
	index = next;
	storePosition(index);
	render();
}

/** Déplacement demandé par un geste ou une touche. Sur écran noir, il ne fait que rallumer. */
export function move(m: Move): void {
	if (isBlack()) setBlack(false);
	else goTo(applyMove(index, m, slideCount));
}

/* ---------- Écran noir ---------- */

export const isBlack = (): boolean => !blackEl.hidden;

export function setBlack(on: boolean): void {
	blackEl.hidden = !on;
}

/* ---------- Réglages d'affichage ---------- */

/** Applique les réglages en cours : transition et aides visuelles. */
export function applyDisplaySettings(): void {
	deckEl.dataset.transition = settings.transition;
	counterEl.hidden = !settings.showCounter;
	$('#progress').hidden = !settings.showProgress;
	render();
}

/** Titre court d'une slide, pour la liste du menu. */
export function slideLabel(i: number): string {
	const slide = SLIDES[i];
	const raw = slide?.titre || slide?.grand || slide?.texte || slide?.image || '';
	const flat = raw.replaceAll('**', '').replace(/\s+/g, ' ').trim();
	return flat.length > 60 ? `${flat.slice(0, 59)}…` : flat;
}

// Sans transition au démarrage : la slide reprise apparaît directement.
deckEl.classList.add('no-anim');
applyDisplaySettings();
fitAll();
requestAnimationFrame(() => requestAnimationFrame(() => deckEl.classList.remove('no-anim')));
