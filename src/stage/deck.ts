/*
 * Le diaporama affiché : construction des slides, passage de l'une à l'autre,
 * ajustement du texte à l'écran, fausse barre de chargement, note et écran noir.
 */

import { ui } from '../content/interface.ts';
import { SLIDES } from '../content/slides.ts';
import { applyMove, clampIndex, counterLabel, type Move } from '../logic/deck.ts';
import { LANGS, t } from '../logic/i18n.ts';
import { paragraphs, parseInline, type Slide } from '../logic/slides.ts';
import { langue, onLangChange, setLangue } from '../settings/langue.ts';
import { loadPosition, settings, storePosition } from '../settings/store.ts';
import { $ } from '../kit/web/dom.ts';
// Rotation calculée avant le premier ajustement du texte.
import '../kit/web/orientation.ts';
import { isPointerDown } from './input.ts';
import { startLoading, stopLoading } from './loading.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

const deckEl = $('#deck');
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
	const lang = langue();
	const section = document.createElement('section');
	// Hors de la fenêtre d'affichage tant que render() ne l'y a pas mise.
	section.className = 'slide far';
	section.dataset.index = String(i);
	section.setAttribute('aria-roledescription', 'slide');
	section.setAttribute('aria-label', counterLabel(i, slideCount));
	const body = section.appendChild(document.createElement('div'));
	body.className = 'slide-body';

	const etiquette = t(slide.etiquette, lang);
	if (etiquette) {
		const label = body.appendChild(document.createElement('p'));
		label.className = 'etiquette';
		appendLine(label, etiquette);
	}
	const titre = t(slide.titre, lang);
	if (titre) {
		const h = body.appendChild(document.createElement('h1'));
		h.className = 'titre';
		appendLine(h, titre);
	}
	const image = t(slide.image, lang);
	if (image) {
		const img = body.appendChild(document.createElement('img'));
		img.className = 'image';
		img.src = image;
		img.alt = '';
		img.decoding = 'async';
		img.addEventListener('load', () => {
			if (section.classList.contains('far')) fitted.delete(section);
			else refitSection(section);
		});
	}
	const grand = t(slide.grand, lang);
	if (grand) {
		const big = body.appendChild(document.createElement('p'));
		big.className = 'grand';
		appendLine(big, grand);
	}
	const texte = t(slide.texte, lang);
	if (texte) {
		const text = body.appendChild(document.createElement('div'));
		text.className = 'texte';
		for (const lines of paragraphs(texte)) {
			const p = text.appendChild(document.createElement('p'));
			lines.forEach((line, n) => {
				if (n > 0) p.append(document.createElement('br'));
				appendLine(p, line);
			});
		}
	}
	const bouton = t(slide.bouton, lang);
	if (bouton) {
		const button = body.appendChild(document.createElement('button'));
		button.type = 'button';
		button.className = 'bouton';
		button.textContent = bouton;
		button.addEventListener('click', () => {
			if (Number(section.dataset.index) === index) pressButton();
		});
	}
	if (slide.chargement !== undefined) {
		const loading = body.appendChild(document.createElement('div'));
		loading.className = 'chargement';
		// Avec un bouton, le cadran n'apparaît qu'à l'appui.
		loading.hidden = Boolean(bouton);
		loading.append(buildCadran());
		if (slide.etapes?.length) {
			const step = loading.appendChild(document.createElement('p'));
			step.className = 'chargement-etape';
			// Remplie par stage/loading.ts au fil de la progression ; la place est réservée dès
			// maintenant (ajustement du texte) avec l'étape la plus longue.
			step.textContent = slide.etapes.map((etape) => t(etape, lang) ?? '').reduce((a, b) => (b.length > a.length ? b : a), '');
		}
		const termine = t(slide.termine, lang);
		if (termine) {
			const done = loading.appendChild(document.createElement('p'));
			done.className = 'chargement-termine';
			done.hidden = true;
			appendLine(done, termine);
		}
	}
	// Choix de la langue : sur la première slide seulement, hors du corps de la slide pour ne pas
	// entrer dans l'ajustement du texte (comme l'étiquette).
	if (i === 0) section.appendChild(buildLangues());
	return section;
}

/**
 * Deux petits boutons FR / EN au bas de la première slide : la langue des slides et du menu
 * se choisit là, avant de commencer, et le choix est enregistré (settings/langue.ts).
 * Les touchers sur ces boutons ne sont pas des gestes du diaporama (stage/input.ts).
 */
function buildLangues(): HTMLElement {
	const lang = langue();
	const box = document.createElement('div');
	box.className = 'langues';
	box.setAttribute('role', 'radiogroup');
	box.setAttribute('aria-label', ui('menu.langue', lang));
	for (const choix of LANGS) {
		const button = box.appendChild(document.createElement('button'));
		button.type = 'button';
		button.setAttribute('role', 'radio');
		button.setAttribute('aria-checked', String(choix === lang));
		button.dataset.langue = choix;
		button.textContent = choix.toUpperCase();
		button.addEventListener('click', () => setLangue(choix));
	}
	return box;
}

/** Les slides construites, dans l'ordre. Reconstruites en bloc à chaque changement de langue. */
let slideEls: HTMLElement[] = [];

/** (Re)construit toutes les slides dans la langue en cours et réaffiche la slide courante. */
function buildAll(): void {
	stopLoading();
	slideEls = SLIDES.map(buildSlide);
	deckEl.replaceChildren(...slideEls);
	fitted.clear();
	rendered = [];
	preparedIndex = -1;
	render();
}

// Langue changée depuis la première slide : tout le texte des slides est à refaire.
onLangChange(buildAll);

/**
 * Cadran de chargement : un camembert qui se remplit (--part, posé par stage/loading.ts),
 * l'anneau de progression par-dessus (stroke-dasharray) et le pourcentage au centre.
 */
function buildCadran(): HTMLElement {
	const dial = document.createElement('div');
	dial.className = 'chargement-cadran';
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('viewBox', '0 0 100 100');
	svg.setAttribute('aria-hidden', 'true');
	for (const className of ['chargement-piste', 'chargement-arc']) {
		const circle = document.createElementNS(SVG_NS, 'circle');
		circle.setAttribute('class', className);
		circle.setAttribute('cx', '50');
		circle.setAttribute('cy', '50');
		circle.setAttribute('r', '44');
		// Longueur ramenée à 100 : l'arc se règle en pour-cent, quel que soit le rayon.
		circle.setAttribute('pathLength', '100');
		svg.appendChild(circle);
	}
	dial.appendChild(svg);
	const percent = dial.appendChild(document.createElement('div'));
	percent.className = 'chargement-pourcent';
	percent.textContent = '0 %';
	return dial;
}

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
 * Marge de sécurité de l'ajustement, en pixels : une slide « tout juste » déborderait au moindre
 * écart de police ou d'arrondi (les polices système diffèrent d'un appareil à l'autre).
 */
const FIT_MARGIN_PX = 4;

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
		return body.scrollHeight <= height - FIT_MARGIN_PX && body.scrollWidth <= body.clientWidth;
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

/**
 * Délai avant qu'un bouton devienne actif, en arrivant sur sa slide. Le tap qui amène sur la slide
 * est souvent suivi d'un autre : sans ce délai, la slide serait traversée sans être vue.
 * Le bouton apparaît en fondu pendant ce délai (styles/_deck.scss).
 */
const BUTTON_DELAY_MS = 700;

/** Slide dont le bouton et le chargement sont préparés ; -1 si aucune. */
let preparedIndex = -1;
/** La slide courante a un bouton pas encore appuyé. */
let waitingForButton = false;
/** Instant à partir duquel ce bouton peut être actionné. */
let buttonReadyAt = 0;

/** Slide où mène la slide `i` après son bouton ou son chargement : `boutonVers`, sinon la suivante. */
const destination = (i: number): number => (SLIDES[i]?.boutonVers ?? i + 2) - 1;

/**
 * Lance le chargement de la slide `i`, ou passe directement à sa destination si elle n'en a pas.
 * À 100 % : message `termine` affiché (la slide reste), sinon destination.
 */
function launch(i: number): void {
	const slide = SLIDES[i];
	if (slide?.chargement === undefined) {
		goTo(destination(i));
		return;
	}
	const done = slideEls[i].querySelector<HTMLElement>('.chargement-termine');
	if (done) done.hidden = true;
	const step = slideEls[i].querySelector<HTMLElement>('.chargement-etape');
	if (step) step.hidden = false;
	const steps = (slide.etapes ?? []).map((etape) => t(etape, langue()) ?? '');
	startLoading(slideEls[i], slide.chargement, steps, () => {
		if (index !== i) return;
		if (done) {
			// La slide reste affichée avec son message : les étapes ont fini leur travail.
			if (step) step.hidden = true;
			done.hidden = false;
		} else goTo(destination(i));
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
		buttonReadyAt = performance.now() + BUTTON_DELAY_MS;
		section.querySelector<HTMLElement>('.bouton')!.hidden = false;
		const loading = section.querySelector<HTMLElement>('.chargement');
		if (loading) loading.hidden = true;
		refitSection(section);
	} else if (slide?.chargement !== undefined) {
		launch(index);
	}
}

/**
 * Le bouton de la slide courante attend un appui, son délai d'activation est passé et aucun doigt
 * n'est posé sur l'écran (un doigt encore posé vient du geste qui a amené sur la slide).
 */
const buttonReady = (): boolean => waitingForButton && performance.now() >= buttonReadyAt && !isPointerDown();

/** Appui sur le bouton de la slide courante (doigt, ou « slide suivante » tant qu'il attend). */
export function pressButton(): void {
	if (!buttonReady()) return;
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
	const note = t(SLIDES[index]?.note, langue()) ?? '';
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
	// Bouton qui attend et mène en avant : « suivante » appuie dessus, pour ne jamais sauter l'analyse
	// par erreur. Un bouton qui ramène en arrière (Recommencer) n'est actionné que par un vrai appui.
	// Pendant le délai d'activation, « suivante » ne fait rien : la slide reste affichée.
	else if (m === 'next' && waitingForButton && destination(index) > index) {
		if (buttonReady()) pressButton();
	}
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
	render();
}

// Sans transition au démarrage : la slide reprise apparaît directement.
deckEl.classList.add('no-anim');
buildAll();
applyDisplaySettings();
requestAnimationFrame(() => requestAnimationFrame(() => deckEl.classList.remove('no-anim')));
