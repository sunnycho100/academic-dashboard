import { test } from 'node:test'
import assert from 'node:assert/strict'
import { earned, formatMoney } from './prefs.ts'

test('earned rounds down to the cent at the hourly rate', () => {
  assert.equal(earned(2.25 * 3600, 20), 45)
  assert.equal(earned(1, 20), 0) // one second at $20/h is half a cent
  assert.equal(earned(90, 20), 0.5)
  assert.equal(earned(0, 20), 0)
})

test('formatMoney with and without cents', () => {
  assert.equal(formatMoney(45), '$45.00')
  assert.equal(formatMoney(1234.5), '$1,234.50')
  assert.equal(formatMoney(45.99, false), '$46')
})

test('Edit display previews without saving; Save keeps it and Cancel puts it back', async () => {
  const store = new Map<string, string>()
  Object.assign(globalThis, {
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
  })
  const { palette, previewPref, endPreview, emptyPanel } = await import('./prefs.ts')

  assert.equal(palette(), 'classic')
  previewPref('palette', 'kraft')
  assert.equal(palette(), 'kraft')
  assert.equal(store.get('palette'), undefined) // not saved yet
  endPreview(false)
  assert.equal(palette(), 'classic')

  previewPref('palette', 'ledger')
  previewPref('empty-panel', 'week')
  endPreview(true)
  assert.equal(store.get('palette'), 'ledger')
  assert.equal(emptyPanel(), 'week')
})
