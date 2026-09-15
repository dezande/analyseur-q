// scripts/stamp-build.ts sur un faux build, dans un vrai dépôt git temporaire :
// le nom du cache hors-ligne doit changer à chaque nouvelle version, même si le code de l'app est identique,
// et rester le même quand rien ne change (pas de retéléchargement inutile).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve('scripts/stamp-build.ts');

/** Dépôt temporaire avec un dist/ non tamponné, comme juste après la compilation. */
function makeRepo(): string {
	const dir = mkdtempSync(join(tmpdir(), 'rain-man-stamp-'));
	git(dir, 'init', '-q', '-b', 'main');
	writeFileSync(join(dir, '.gitignore'), 'dist/\n');
	git(dir, 'add', '.');
	git(dir, 'commit', '-q', '-m', 'version 1');
	return dir;
}

function git(dir: string, ...args: string[]): string {
	return execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], { cwd: dir, encoding: 'utf8' }).trim();
}

/** Écrit un dist/ neuf (placeholders compris), lance le script et renvoie le résultat. */
function stamp(dir: string, appCode = 'console.log("app");'): { cache: string; assets: string; build: string } {
	rmSync(join(dir, 'dist'), { recursive: true, force: true });
	mkdirSync(join(dir, 'dist', 'system'), { recursive: true });
	writeFileSync(join(dir, 'dist', 'index.html'), '<!doctype html>');
	writeFileSync(join(dir, 'dist', 'app.js'), appCode);
	writeFileSync(join(dir, 'dist', '.DS_Store'), 'x');
	writeFileSync(join(dir, 'dist', 'system', 'build.js'), "export const BUILD = { version: '__APP_VERSION__', commit: '__APP_COMMIT__' };");
	writeFileSync(join(dir, 'dist', 'sw.js'), "const CACHE = 'rain-man-__BUILD_HASH__';\nconst ASSETS = ['__ASSETS__'];");
	execFileSync(process.execPath, [SCRIPT], { cwd: dir, stdio: 'pipe' });
	const sw = readFileSync(join(dir, 'dist', 'sw.js'), 'utf8');
	return {
		cache: sw.match(/const CACHE = '([^']+)'/)?.[1] ?? '',
		assets: sw.match(/const ASSETS = \[(.*)\]/)?.[1] ?? '',
		build: readFileSync(join(dir, 'dist', 'system', 'build.js'), 'utf8'),
	};
}

test('version, commit et liste des fichiers inscrits dans le build', () => {
	const dir = makeRepo();
	try {
		const result = stamp(dir);
		assert.match(result.build, /version: '1'/);
		assert.match(result.build, new RegExp(`commit: '${git(dir, 'rev-parse', '--short=7', 'HEAD')}'`));
		assert.match(result.cache, /^rain-man-[0-9a-f]{12}$/);
		assert.equal(result.assets, "'./', './app.js', './index.html', './system/build.js'", 'fichiers cachés et sw.js exclus');
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('même version, même contenu : même cache (rien à retélécharger)', () => {
	const dir = makeRepo();
	try {
		assert.equal(stamp(dir).cache, stamp(dir).cache);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('nouvelle version : nouveau cache, même si le code de l’app n’a pas changé', () => {
	const dir = makeRepo();
	try {
		const v1 = stamp(dir);
		git(dir, 'commit', '-q', '--allow-empty', '-m', 'version 2');
		const v2 = stamp(dir);
		assert.match(v2.build, /version: '2'/);
		assert.notEqual(v2.cache, v1.cache);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('code modifié : nouveau cache', () => {
	const dir = makeRepo();
	try {
		assert.notEqual(stamp(dir).cache, stamp(dir, 'console.log("app modifiée");').cache);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
