import path from 'node:path';
import { promises as fs } from 'node:fs';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

export async function prepareVaultSource(config) {
  if (!config.source) return { config, source: null };
  if (config.source.type !== 'github') throw sourceError('Die konfigurierte Vault-Quelle wird nicht unterstützt.');

  const repository = String(config.source.repository ?? '').trim();
  const cachePath = String(config.source.cachePath ?? '').trim();
  const branch = String(config.source.branch ?? 'main').trim() || 'main';
  if (!repository || !cachePath || !path.isAbsolute(cachePath)) {
    throw sourceError('Die GitHub-Quelle braucht Repository, Branch und einen absoluten lokalen Cache-Pfad.');
  }

  try {
    await fs.access(path.join(cachePath, '.git'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw sourceError('Der lokale Vault-Cache kann nicht gelesen werden.');
    try {
      await fs.access(cachePath);
      throw sourceError('Der lokale Vault-Cache ist kein Git-Repository. Bitte einen leeren Cache-Pfad konfigurieren.');
    } catch (cacheError) {
      if (cacheError.code !== 'ENOENT') throw cacheError;
    }
    await runGit(['clone', '--depth', '1', '--branch', branch, repository, cachePath]);
  }

  await runGit(['-C', cachePath, 'fetch', '--depth', '1', 'origin', branch]);
  await runGit(['-C', cachePath, 'checkout', '--detach', '--force', 'FETCH_HEAD']);
  const { stdout } = await runGit(['-C', cachePath, 'rev-parse', '--short=12', 'HEAD']);
  return {
    config: { ...config, vaults: config.vaults.map((vault) => ({ ...vault, path: path.resolve(cachePath, vault.path) })) },
    source: {
      type: 'github',
      repository: repository.replace(/\.git$/i, ''),
      branch,
      revision: stdout.trim(),
      fetchedAt: new Date().toISOString()
    }
  };
}

async function runGit(args) {
  try {
    return await execFile('git', args, { maxBuffer: 1024 * 1024 });
  } catch {
    throw sourceError('Der GitHub-Vault konnte nicht aktualisiert werden. Bitte Netzwerk, Repository-Zugriff und Cache-Konfiguration prüfen.');
  }
}

function sourceError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}
