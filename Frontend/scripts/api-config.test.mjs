import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateApiConfiguration as validate } from './api-config.mjs'

test('production defaults to a same-origin API without local accounts or localhost', () => {
  assert.equal(validate({}, true), '/api')
  assert.equal(validate({ VITE_API_BASE_URL: '/campus/api' }, true), '/campus/api')
})
test('a hosted HTTPS Express API is supported', () => {
  assert.equal(validate({ VITE_API_BASE_URL: 'https://api.campus.example/api' }, true), 'https://api.campus.example/api')
})
test('production rejects loopback API destinations', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]', '0.0.0.0', 'app.localhost', '127.8.0.1']) assert.throws(() => validate({ VITE_API_BASE_URL: `https://${host}/api` }, true))
})
test('malformed, insecure and credential-bearing production URLs are rejected', () => {
  for (const url of ['invalid', '//api.campus.example/api', 'http://api.campus.example/api', 'ftp://api.campus.example', 'https://user:password@api.campus.example/api', 'https://api.campus.example/api?token=secret', 'https://api.campus.example/api#fragment']) assert.throws(() => validate({ VITE_API_BASE_URL: url }, true))
})
test('production cannot enable local harness verification', () => {
  assert.throws(() => validate({ VITE_REQUIRE_ISOLATED_API: 'true' }, true))
})
test('development supports explicit local test configuration and rejects remote isolation', () => {
  assert.equal(validate({ VITE_API_BASE_URL: 'http://localhost:5001/api', VITE_REQUIRE_ISOLATED_API: 'true' }), 'http://localhost:5001/api')
  assert.throws(() => validate({ VITE_API_BASE_URL: 'https://api.campus.example/api', VITE_REQUIRE_ISOLATED_API: 'true' }))
})
