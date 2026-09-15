/*
 * Le diaporama affiché : construction des slides, passage de l'une à l'autre,
 * ajustement du texte à l'écran, fausse barre de chargement, compteur, barre de progression,
 * note et écran noir.
 */

import { SLIDES } from '../content/slides.ts';
import { applyMove, clampIndex, counterLabel, type Move } from '../logic/deck.ts';
import { paragraphs, parseInline, type Slide } from '../logic/slides.ts';
import { loadPosition, settings, storePosition } from '../settings/store.ts';
import { $ } from '../kit/web/dom.ts';
// Rotation calculée avant le premier ajustement du texte.
import '../kit/web/orientation.ts';
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
	// Hors de la fenêtre d'affichage tant que render() ne l'y a pas mise.
	section.className = 'slide far';
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
		img.decoding = 'async';
		img.addEventListener('load', () => {
			if (section.classList.contains('far')) fitted.delete(section);
			else refitSection(section);
		});
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
	if (slide.bouton) {
		const button = body.appendChild(document.createElement('button'));
		button.type = 'button';
		button.className = 'bouton';
		button.textContent = slide.bouton;
		button.addEventListener('click', () => {
			if (Number(section.dataset.index) === index) pressButton();
		});
	}
	if (slide.chargement !== undefined) {
		const loading = body.appendChild(document.createElement('div'));
		loading.className = 'chargement';
		// Avec un bouton, la barre n'apparaît qu'à l'appui.
		loading.hidden = Boolean(slide.bouton);
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

/*
 * Fenêtre d'affichage : seules la slide courante et ses deux voisines sont rendues (les voisines,
 * invisibles, servent aux transitions). Les autres sont en display: none. Avec une routine de
 * dizaines de slides, le démarrage, les rotations d'écran et chaque changement de slide ne
 * coûtent ainsi que le prix de trois slides.
 */

/** Écart maximal avec la slide courante pour qu'une slide soit rendue. */
const WINDOW = 1;
/** Index des slides actuellement rendues. */
let rendered: number[] = [];

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

/** Slides ajustées à la taille d'écran actuelle. Une slide est ajustée la première fois qu'elle est rendue. */
const fitted = new Set<HTMLElement>();

function ensureFit(section: HTMLElement): void {
	if (fitted.has(section)) return;
	fit(section);
	fitted.add(section);
}

/** Contenu de la slide changé (bouton remplacé par la barre…) : réajustée tout de suite. */
function refitSection(section: HTMLElement): void {
	fitted.delete(section);
	ensureFit(section);
}

/** Taille d'écran ou polices changées : tout est à réajuster, les slides rendues tout de suite. */
function refit(): void {
	fitted.clear();
	for (const i of rendered) ensureFit(slideEls[i]);
}

let resizeFrame = 0;
window.addEventListener('resize', () => {
	cancelAnimationFrame(resizeFrame);
	resizeFrame = requestAnimationFrame(refit);
});
void document.fonts?.ready.then(refit);

/* ---------- Navigation ---------- */

/*
 * Bouton et chargement de la slide courante. En arrivant sur une slide, tout repart du début :
 * bouton affiché s'il y en a un (le chargement attend l'appui), sinon chargement lancé tout de suite.
 */

/** Slide dont le bouton et le chargement sont préparés ; -1 si aucune. */
let preparedIndex = -1;
/** La slide courante a un bouton pas encore appuyé. */
let waitingForButton = false;

/** Lance le chargement de la slide `i`, ou passe directement à la suivante si elle n'en a pas. */
function launch(i: number): void {
	const seconds = SLIDES[i]?.chargement;
	if (seconds === undefined) {
		goTo(i + 1);
		return;
	}
	startLoading(slideEls[i], seconds, () => {
		if (index === i) goTo(i + 1);
	});
}

function syncSlideActions(): void {
	if (preparedIndex === index) return;
	stopLoading();
	preparedIndex = index;
	const slide = SLIDES[index];
	const section = slideEls[index];
	waitingForButton = Boolean(slide?.bouton);
	if (waitingForButton) {
		section.querySelector<HTMLElement>('.bouton')!.hidden = false;
		const loading = section.querySelector<HTMLElement>('.chargement');
		if (loading) loading.hidden = true;
		refitSection(section);
	} else if (slide?.chargement !== undefined) {
		launch(index);
	}
}

/** Appui sur le bouton de la slide courante (doigt, ou « slide suivante » tant qu'il attend). */
export function pressButton(): void {
	if (!waitingForButton) return;
	waitingForButton = false;
	setBlack(false);
	const section = slideEls[index];
	section.querySelector<HTMLElement>('.bouton')!.hidden = true;
	const loading = section.querySelector<HTMLElement>('.chargement');
	if (loading) loading.hidden = false;
	refitSection(section);
	launch(index);
}

/**
 * Place les slides de la fenêtre avant, sur ou après la slide courante (les transitions CSS font
 * le reste) et retire celles qui en sortent. Seules les slides qui entrent ou sortent sont touchées.
 */
function render(): void {
	const next: number[] = [];
	for (let i = Math.max(0, index - WINDOW); i <= Math.min(slideCount - 1, index + WINDOW); i++) next.push(i);
	for (const i of new Set([...rendered, ...next])) {
		const section = slideEls[i];
		section.classList.toggle('far', !next.includes(i));
		section.classList.toggle('before', i < index);
		section.classList.toggle('current', i === index);
		section.classList.toggle('after', i > index);
		section.setAttribute('aria-hidden', String(i !== index));
	}
	rendered = next;
	for (const i of next) ensureFit(slideEls[i]);
	counterEl.textContent = counterLabel(index, slideCount);
	progressEl.style.transform = `scaleX(${slideCount > 1 ? index / (slideCount - 1) : 1})`;
	const note = SLIDES[index]?.note ?? '';
	noteEl.textContent = note;
	noteEl.hidden = !settings.showNotes || !note;
	syncSlideActions();
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
	// Bouton qui attend : « suivante » appuie dessus, pour ne jamais sauter l'analyse par erreur.
	else if (m === 'next' && waitingForButton) pressButton();
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

// Sans transition au démarrage : la slide reprise apparaît directement.
deckEl.classList.add('no-anim');
applyDisplaySettings();
requestAnimationFrame(() => requestAnimationFrame(() => deckEl.classList.remove('no-anim')));
