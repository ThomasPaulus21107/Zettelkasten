#!/usr/bin/env python3
"""Read one immutable VAULTS revision and publish a complete D1 search index."""
import io
import json
import os
import re
import sys
import tarfile
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import PurePosixPath

import yaml

OWNER = os.environ.get('GITHUB_OWNER', 'ThomasPaulus21107')
REPO = os.environ.get('GITHUB_REPO', 'VAULTS')
BRANCH = os.environ.get('GITHUB_BRANCH', 'main')
API = 'https://api.github.com'
MAX_ARCHIVE_BYTES = 100_000_000
MAX_NOTE_BYTES = 1_000_000


def request_json(url, token, data=None):
    headers = {'Accept': 'application/vnd.github+json' if url.startswith(API) else 'application/json',
               'User-Agent': 'zettelkasten-reader-sync'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if data is not None:
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=headers)
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def github_archive(token, revision):
    url = f'{API}/repos/{OWNER}/{REPO}/tarball/{revision}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}', 'User-Agent': 'zettelkasten-reader-sync'})
    with urllib.request.urlopen(req, timeout=120) as response:
        archive = response.read(MAX_ARCHIVE_BYTES + 1)
    if len(archive) > MAX_ARCHIVE_BYTES:
        raise ValueError('Vault archive exceeds safety limit')
    return archive


def include_path(path):
    parts = PurePosixPath(path).parts
    if len(parts) < 2 or parts[0] not in ('SX', 'DX') or not path.lower().endswith('.md'):
        return False
    blocked = {'archive', 'archiv', 'archives', 'backup', 'backups', '.obsidian', '.git', '_inbox', '_drafts', 'drafts', '_proposals', 'logs', 'log', 'templates', 'system'}
    if any(p.lower() in blocked or p.startswith('.') for p in parts):
        return False
    name = parts[-1].lower()
    return name not in {'claude.md', 'readme.md', 'agents.md', 'offene-themen.md', 'luhmann-prinzipien.md'}


def split_frontmatter(markdown):
    match = re.match(r'\A---\r?\n(.*?)\r?\n---(?:\r?\n|\Z)', markdown, re.S)
    if not match:
        return {}, markdown
    metadata = yaml.safe_load(match.group(1)) or {}
    if not isinstance(metadata, dict):
        raise ValueError('Frontmatter is not a mapping')
    return metadata, markdown[match.end():]


def parse_archive(archive, revision):
    notes = []
    excluded = 0
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as bundle:
        for member in bundle:
            if not member.isfile():
                continue
            parts = PurePosixPath(member.name).parts
            path = '/'.join(parts[1:])
            if not include_path(path):
                if path.lower().endswith('.md'):
                    excluded += 1
                continue
            if member.size > MAX_NOTE_BYTES:
                raise ValueError(f'Note exceeds safety limit: {path}')
            markdown = bundle.extractfile(member).read().decode('utf-8-sig')
            metadata, body = split_frontmatter(markdown)
            status = str(metadata.get('status', '')).casefold()
            if status in {'archived', 'archive', 'archiviert', 'draft', 'entwurf'}:
                excluded += 1
                continue
            aliases = metadata.get('aliases') or []
            if isinstance(aliases, str):
                aliases = [aliases]
            if not isinstance(aliases, list):
                aliases = []
            aliases = [str(alias) for alias in aliases if alias is not None]
            title = str(metadata.get('title') or PurePosixPath(path).stem)
            notes.append({'source_commit': revision, 'id': path, 'vault': parts[1], 'path': path,
                          'title': title, 'aliases': json.dumps(aliases, ensure_ascii=False),
                          'markdown': markdown, 'body': body})
    if len(notes) < 1000 or len({note['id'] for note in notes}) != len(notes):
        raise ValueError(f'Unexpected note count or duplicate paths: {len(notes)}')
    return notes, excluded


def d1(sql, params=None):
    account = os.environ['CLOUDFLARE_ACCOUNT_ID']
    database = os.environ['CLOUDFLARE_D1_DATABASE_ID']
    url = f'https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/{database}/query'
    payload = request_json(url, os.environ['CLOUDFLARE_API_TOKEN'], {'sql': sql, 'params': params or []})
    if not payload.get('success') or any(not result.get('success') for result in payload.get('result', [])):
        raise RuntimeError('D1 query failed: ' + str(payload.get('errors') or payload.get('result', [{}])[0].get('error', 'unknown')))
    return payload.get('result', [{}])[0].get('results', [])


def insert_many(table, columns, rows, batch_size=10):
    for start in range(0, len(rows), batch_size):
        batch = rows[start:start + batch_size]
        placeholders = '(' + ','.join('?' for _ in columns) + ')'
        sql = f'INSERT INTO {table} ({",".join(columns)}) VALUES ' + ','.join([placeholders] * len(batch))
        d1(sql, [row[column] for row in batch for column in columns])


def publish(notes, excluded, revision):
    current = d1('SELECT source_commit FROM index_state WHERE id = 1')
    if current and current[0]['source_commit'] == revision:
        print(f'Index already current: {revision[:12]}')
        return
    note_columns = ('source_commit', 'id', 'vault', 'path', 'title', 'aliases', 'markdown')
    search_columns = ('source_commit', 'id', 'title', 'aliases', 'body')
    insert_many('notes', note_columns, notes)
    insert_many('note_search', search_columns, notes)
    count = d1('SELECT COUNT(*) AS n FROM notes WHERE source_commit = ?', [revision])[0]['n']
    search_count = d1('SELECT COUNT(*) AS n FROM note_search WHERE source_commit = ?', [revision])[0]['n']
    if count != len(notes) or search_count != len(notes):
        raise RuntimeError('Staged index verification failed')
    d1('INSERT INTO index_state (id, source_branch, source_commit, indexed_at, note_count, excluded_count) VALUES (1, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET source_branch=excluded.source_branch, source_commit=excluded.source_commit, indexed_at=excluded.indexed_at, note_count=excluded.note_count, excluded_count=excluded.excluded_count',
       [BRANCH, revision, datetime.now(timezone.utc).isoformat(), len(notes), excluded])
    d1('DELETE FROM note_search WHERE source_commit != ?', [revision])
    d1('DELETE FROM notes WHERE source_commit != ?', [revision])
    print(f'Published {len(notes)} notes at {revision[:12]}; excluded {excluded} Markdown files')


def main():
    token = os.environ['GITHUB_TOKEN']
    branch = request_json(f'{API}/repos/{OWNER}/{REPO}/branches/{BRANCH}', token)
    revision = branch['commit']['sha']
    if '--dry-run' not in sys.argv:
        current = d1('SELECT source_commit FROM index_state WHERE id = 1')
        if current and current[0]['source_commit'] == revision:
            print(f'Index already current: {revision[:12]}')
            return
    notes, excluded = parse_archive(github_archive(token, revision), revision)
    print(f'Validated {len(notes)} notes; excluded {excluded} Markdown files; revision {revision[:12]}')
    if '--dry-run' not in sys.argv:
        publish(notes, excluded, revision)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, urllib.error.URLError, RuntimeError) as error:
        print(f'Sync failed: {error}', file=sys.stderr)
        sys.exit(1)
