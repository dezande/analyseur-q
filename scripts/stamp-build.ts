// Finalise le build, dans cet ordre :
// 1. inscrit dans system/build.js le numéro de version (nombre de commits) et le commit court ;
// 2. inscrit dans sw.js la liste de tous les fichiers de dist/ à mettre en cache hors-ligne ;
// 3. nomme le cache hors-ligne d'après le contenu de ces fichiers. Toute modification publiée
//    change ce nom, donc les appareils où l'app est installée se mettent à jour ;
//    sans modification, rien n'est retéléchargé.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const DIST = 'dist';

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}

function git(args: string[]): string | null {
	try {
		return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
	} catch {
		return null;
	}
}

function replaceIn(file: string, placeholder: string, value: string): void {
	const path = join(DIST, file);
	const content = readFileSync(path, 'utf8');
	if (!content.includes(placeholder)) fail(`${placeholder} introuvable dans ${path}.`);
	writeFileSync(path, content.replaceAll(placeholder, value));
}

/* ---------- 1. Numéro de version ---------- */

if (git(['rev-parse', '--is-shallow-repository']) === 'true') {
	fail('Dépôt cloné partiellement : le numéro de version serait faux (utilisez fetch-depth: 0).');
}
const count = git(['rev-list', '--count', 'HEAD']);
const commit = git(['rev-parse', '--short=7', 'HEAD']);
const modified = Boolean(git(['status', '--porcelain']));
const version = count ?? 'inconnue';
const commitLabel = commit ? `${commit}${modified ? ' + modifications locales' : ''}` : 'inconnu';

replaceIn('system/build.js', '__APP_VERSION__', version);
replaceIn('system/build.js', '__APP_COMMIT__', commitLabel);

/* ---------- 2. Fichiers mis en cache ---------- */

// Tout dist/ sauf le service worker lui-même et les fichiers cachés (.DS_Store…), avec des « / ».
const files = readdirSync(DIST, { recursive: true, encoding: 'utf8' })
	.map((name) => name.split(sep).join('/'))
	.filter((name) => name !== 'sw.js' && !name.split('/').some((part) => part.startsWith('.')))
	.filter((name) => statSync(join(DIST, name)).isFile())
	.sort();
replaceIn('sw.js', "'__ASSETS__'", ['./', ...files.map((file) => `./${file}`)].map((url) => `'${url}'`).join(', '));

/* ---------- 3. Nom du cache hors-ligne ---------- */

const hash = createHash('sha256');
for (const file of files) {
	hash.update(`${file}\0`);
	hash.update(readFileSync(join(DIST, file)));
}
const buildHash = hash.digest('hex').slice(0, 12);
replaceIn('sw.js', '__BUILD_HASH__', buildHash);

console.log(`Version ${version} (${commitLabel}), ${files.length} fichiers, cache analyseur-q-${buildHash}`);
