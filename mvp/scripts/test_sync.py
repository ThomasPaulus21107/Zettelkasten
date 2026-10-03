import io
import tarfile
import unittest

from sync import include_path, note_status, parse_archive, split_frontmatter


class SyncTests(unittest.TestCase):
    def test_paths_and_frontmatter(self):
        self.assertTrue(include_path('SX/notes/A.md'))
        self.assertTrue(include_path('SX/Zettel/... sounds like Nokia 2006.md'))
        self.assertTrue(include_path('DX/_inbox/Idee.md'))
        for path in ['SX/archive/A.md', 'DX/.obsidian/A.md', 'DX/CLAUDE.md', 'DX/index.md', 'SX/log.md', 'SX/2026-08-21.md', 'other/A.md']:
            self.assertFalse(include_path(path))
        data, body = split_frontmatter('---\ntitle: Test\naliases:\n - Eins\n---\nText')
        self.assertEqual(data['aliases'], ['Eins'])
        self.assertEqual(body, 'Text')

    def test_inbox_notes_are_drafts_even_with_other_source_status(self):
        self.assertEqual(note_status('SX/_inbox/Idee.md', {'status': 'rohling'}), ('draft', 'rohling'))
        self.assertEqual(note_status('DX/_inbox/Idee.md', {}), ('draft', ''))
        self.assertEqual(note_status('DX/Zettel/Idee.md', {'status': 'draft'}), ('draft', 'draft'))
        self.assertEqual(note_status('DX/Zettel/Idee.md', {'status': 'archiviert'}), (None, 'archiviert'))
        data, body = split_frontmatter('---\ntitle: "broken" trailing value\nstatus: active\n---\nText')
        self.assertTrue(data['_malformed'])
        self.assertEqual(data['status'], 'active')
        self.assertEqual(body, 'Text')

    def test_import_rejects_incomplete_snapshot(self):
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode='w:gz') as archive:
            contents = b'---\ntitle: Test\n---\nInhalt'
            info = tarfile.TarInfo('vault-root/SX/Test.md')
            info.size = len(contents)
            archive.addfile(info, io.BytesIO(contents))
        with self.assertRaisesRegex(ValueError, 'Unexpected note count'):
            parse_archive(output.getvalue(), 'abc')


if __name__ == '__main__':
    unittest.main()
