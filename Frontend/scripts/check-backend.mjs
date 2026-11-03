import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const baseline = JSON.parse((await readFile(new URL('../docs/backend-integrity.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''))
let failed = false
for (const entry of baseline) {
  const relative = entry.Path.replaceAll('\\', '/')
  const bytes = await readFile(new URL(`../../Backend/${relative}`, import.meta.url))
  const hash = createHash('sha256').update(bytes).digest('hex').toUpperCase()
  if (hash !== entry.Hash) { console.error(`Changed: Backend/${relative}`); failed = true }
}
if (failed) process.exitCode = 1
else console.log(`All ${baseline.length} backend files match their original SHA-256 hashes. No .env files accessed.`)
