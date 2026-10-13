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
