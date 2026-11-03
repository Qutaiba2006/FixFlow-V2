import { readdir, readFile, mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.resolve(frontend, '..')
const excluded = new Set(['node_modules', '.git', '.local', 'dist', 'dist-ssr', 'coverage', 'playwright-report', 'test-results', 'backups', '.vscode', '.idea', '.aws', '.codex', '.agents'])
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /mongodb(?:\+srv)?:\/\/(?!<)[^\s<>"']+:[^\s<>"']+@[^\s<>"']+/,
  /\b(?:JWT_SECURE|CLOUDINARY_API_SECRET|SMTP_PASS)\s*[:=]\s*["'][a-zA-Z0-9+/=_-]{20,}["']/,
  /\beyJ[a-zA-Z0-9_-]{16,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\b/,
]
let checked = 0
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || excluded.has(entry.name)) continue
    // Never open actual environment files, database files or credentials.
    if (entry.name === '.env' || (entry.name.startsWith('.env.') && entry.name !== '.env.example') || /\.(pem|key|log|tmp|local|tsbuildinfo)$/.test(entry.name)) continue
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) { await scan(file); continue }
    if (!/\.(?:[cm]?[jt]sx?|json|md|html|css|svg|example)$/.test(entry.name) && entry.name !== '.gitignore') continue
    const content = await readFile(file, 'utf8'); checked++
    for (const pattern of patterns) if (pattern.test(content)) throw new Error(`Possible exposed credential in ${path.relative(root, file)}. Values were not printed.`)
  }
}
await scan(root)
const temporary = await mkdtemp(path.join(os.tmpdir(), 'fixflow-ignore-check-'))
try {
  await writeFile(path.join(temporary, '.gitignore'), await readFile(path.join(root, '.gitignore')))
  await mkdir(path.join(temporary, 'Frontend'))
  await writeFile(path.join(temporary, 'Frontend/.gitignore'), await readFile(path.join(frontend, '.gitignore')))
  assert.equal(spawnSync('git', ['init', '--quiet', temporary]).status, 0, 'Git is required to verify publication exclusions')
  const privatePaths = ['Backend/.env', 'Backend/.env.production', 'Frontend/.env.local', 'Frontend/node_modules/pkg/index.js', 'Backend/node_modules/pkg/index.js', 'Frontend/dist/index.html', 'Frontend/.local/test-accounts.json', 'Frontend/.local/jwt-secret', 'Frontend/.local/expired-session.json', 'Frontend/test-results/trace.zip', 'Frontend/playwright-report/index.html', 'backups/old/source.js', '.vscode/settings.json']
  const result = spawnSync('git', ['-C', temporary, 'check-ignore', '--no-index', '--stdin'], { input: privatePaths.join('\n') + '\n', encoding: 'utf8' })
  assert.equal(result.status, 0)
  assert.deepEqual(result.stdout.trim().split(/\r?\n/), privatePaths, 'Sensitive/local paths must be excluded from publication')
  const example = spawnSync('git', ['-C', temporary, 'check-ignore', '--no-index', 'Frontend/.env.example'])
  assert.equal(example.status, 1, 'The placeholder environment example must remain publishable')
} finally {
  // Only delete the exact temporary directory created by mkdtemp in this call.
  assert.equal(path.dirname(temporary), os.tmpdir())
  assert.ok(path.basename(temporary).startsWith('fixflow-ignore-check-'))
  await rm(temporary, { recursive: true, force: true })
}
const assets = path.join(frontend, 'dist/assets')
for (const entry of await readdir(assets)) {
  if (!entry.endsWith('.js')) continue
  const bundle = await readFile(path.join(assets, entry), 'utf8')
  for (const forbidden of ['Explore the interactive demo', 'fixflow-experiment-demo-v1', 'demo-report-', 'student@fixflow.example.test', 'http://localhost:5001/api', 'mongodb://', 'mongodb+srv://']) assert.equal(bundle.includes(forbidden), false, `Production bundle contains forbidden local/demo content: ${entry}`)
}
console.log(`Publication checks passed: ${checked} text files scanned without opening production environment files; 13 private paths ignored; environment example included; production bundle has no demo records, test accounts or local API URL.`)
