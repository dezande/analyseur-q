/*
 * Écran toujours allumé pendant le spectacle, par deux moyens actifs en même temps :
 * - Screen Wake Lock API ;
 * - une vidéo muette invisible jouée en boucle (les navigateurs ne mettent pas l'écran en veille
 *   pendant une lecture vidéo).
 * La vidéo n'est pas qu'un repli : sur iPhone avant iOS 18.4, dans l'app installée sur l'écran
 * d'accueil, l'API accepte la demande mais ne garde pas l'écran allumé (bug WebKit 254545).
 * Le système relâche le verrou quand l'app passe en arrière-plan : il est redemandé
 * à chaque toucher et à chaque retour au premier plan.
 */

import { $ } from './dom.ts';

type WakeMode = 'off' | 'lock' | 'video';

const video = $<HTMLVideoElement>('#keep-awake');
const dot = $('#wake-dot');
const text = $('#wake-text');
const detail = $('#wake-detail');

let sentinel: WakeLockSentinel | null = null;
/** Une demande de verrou est en cours : évite les demandes en double. */
let requesting = false;

/** Texte affiché dans le menu pour chaque mode. */
const MODE_LABELS: Record<WakeMode, { text: string; detail: string }> = {
	lock: { text: 'Écran : verrou actif', detail: 'Screen Wake Lock API' },
	video: { text: 'Écran : verrou actif', detail: 'Vidéo muette en boucle' },
	off: { text: 'Écran : verrou inactif', detail: 'Touchez la scène pour le réactiver' },
};

/** Change de mode et met à jour l'état affiché dans le menu. */
function setMode(next: WakeMode): void {
	dot.className = `dot ${next}`;
	text.textContent = MODE_LABELS[next].text;
	detail.textContent = next === 'lock' && !video.paused ? 'Screen Wake Lock API + vidéo muette en boucle' : MODE_LABELS[next].detail;
}

function playVideo(): void {
	if (!video.paused) return;
	video.play().catch(() => {
		if (!sentinel) setMode('off');
	});
}

/** Active le maintien de l'écran s'il ne l'est pas déjà. Sans effet si l'app n'est pas visible. */
export async function keepScreenAwake(): Promise<void> {
	if (document.visibilityState !== 'visible' || requesting) return;
	playVideo();
	if (sentinel && !sentinel.released) return;
	if ('wakeLock' in navigator && navigator.wakeLock) {
		requesting = true;
		try {
			const s = await navigator.wakeLock.request('screen');
			sentinel = s;
			s.addEventListener('release', () => {
				// Ignore la libération d'un ancien verrou déjà remplacé.
				if (sentinel !== s) return;
				sentinel = null;
				setMode(video.paused ? 'off' : 'video');
			});
			setMode('lock');
			return;
		} catch {
			// Refusé (pas de geste utilisateur, économie d'énergie…) : la vidéo reste seule.
		} finally {
			requesting = false;
		}
	}
}

video.muted = true;
video.addEventListener('pause', () => {
	setMode(sentinel ? 'lock' : 'off');
});
video.addEventListener('playing', () => {
	setMode(sentinel ? 'lock' : 'video');
});
// Certains navigateurs ignorent « loop » sur les médias très courts.
video.addEventListener('timeupdate', () => {
	if (video.duration && video.currentTime > video.duration - 0.4) video.currentTime = 0;
});

// Retour au premier plan : le verrou a pu être relâché.
document.addEventListener('visibilitychange', () => void keepScreenAwake());
window.addEventListener('pageshow', () => void keepScreenAwake());
window.addEventListener('focus', () => void keepScreenAwake());

setMode('off');
