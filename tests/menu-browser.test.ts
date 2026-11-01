import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMenuSearch } from '../src/lib/menu-browser';

test('búsqueda normaliza tildes, mayúsculas y espacios sin convertir la consulta en HTML', () => {
  assert.equal(normalizeMenuSearch('  Té   FRÍO  '), 'te frio');
  assert.equal(normalizeMenuSearch('SÁNDWICH'), 'sandwich');
  assert.equal(normalizeMenuSearch('<script>'), '<script>');
  assert.equal(normalizeMenuSearch('   '), '');
});
