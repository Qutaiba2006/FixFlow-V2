import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { randomBytes, createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = path.resolve(root, '../Backend')
const requireBackend = createRequire(path.join(backend, 'package.json'))
const local = path.join(root, '.local')
const mongoDir = path.join(local, 'mongo-verification')
await mkdir(mongoDir, { recursive: true })

// Deliberately do not import Backend/server.js or dotenv. No .env file is read.
process.env.MONGO_URI = 'mongodb://127.0.0.1:27029/fixflow_frontend_experiment'
// Keep local sessions valid across restarts; never load a production secret.
const secretPath = path.join(local, 'jwt-secret')
try { process.env.JWT_SECURE = await readFile(secretPath, 'utf8') }
catch (error) {
  if (error.code !== 'ENOENT') throw error
  process.env.JWT_SECURE = randomBytes(48).toString('hex')
  await writeFile(secretPath, process.env.JWT_SECURE, { flag: 'wx', mode: 0o600 })
}
process.env.SMTP_HOST = '127.0.0.1'
process.env.SMTP_PORT = '1'
process.env.SMTP_USER = ''
process.env.SMTP_PASS = ''
for (const name of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) process.env[name] = ''
process.env.CLOUDINARY_URL = ''

function portAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', () => reject(new Error(`Port ${port} is already in use. Stop the previous experiment process before starting this harness. No existing database will be used.`)))
    server.listen(port, '127.0.0.1', () => server.close(resolve))
  })
}
await portAvailable(27029)
await portAvailable(5001)
async function findMongo() {
  if (process.env.FIXFLOW_MONGOD) return process.env.FIXFLOW_MONGOD
  if (process.platform !== 'win32') return 'mongod'
  const dir = 'C:/Program Files/MongoDB/Server'
  const versions = await readdir(dir).catch(() => [])
  for (const version of versions.sort().reverse()) { const executable = path.join(dir, version, 'bin/mongod.exe'); if (existsSync(executable)) return executable }
  throw new Error('MongoDB was not found. Install MongoDB Community Server or set FIXFLOW_MONGOD to a local mongod executable.')
}
const mongo = spawn(await findMongo(), ['--dbpath', mongoDir, '--bind_ip', '127.0.0.1', '--port', '27029', '--logpath', path.join(local, 'mongo.log')], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
mongo.stderr.on('data', chunk => process.stderr.write(chunk))
let appServer
let shuttingDown = false
async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  if (appServer) await new Promise(resolve => appServer.close(resolve))
  const mongoose = requireBackend('mongoose')
  const exited = mongo.exitCode !== null ? Promise.resolve() : new Promise(resolve => mongo.once('exit', resolve))
  const timer = setTimeout(() => mongo.kill(), 7000)
  // Windows ChildProcess.kill forcibly terminates mongod. Ask MongoDB to flush
  // its journal and shut down cleanly before closing the driver connection.
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.admin().command({ shutdown: 1 }).catch(() => {})
  } else mongo.kill()
  await mongoose.disconnect().catch(() => {})
  await exited
  clearTimeout(timer)
  if (process.connected) process.disconnect()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('message', message => { if (message?.type === 'shutdown') shutdown() })
mongo.on('error', error => { console.error(error.message); process.exitCode = 1; shutdown() })
mongo.on('exit', code => { if (!shuttingDown) { console.error(`Experiment MongoDB exited (${code}).`); process.exitCode = 1; shutdown() } })

try {
  const mongoose = requireBackend('mongoose')
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 })
  if (mongoose.connection.name !== 'fixflow_frontend_experiment') throw new Error('Refusing to seed a database outside the experiment.')
  const User = requireBackend('./models/user.js')
  const Location = requireBackend('./models/locationModel.js')
  const bcrypt = requireBackend('bcryptjs')
  let accounts
  try { accounts = JSON.parse(await readFile(path.join(local, 'test-accounts.json'), 'utf8')) }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Existing local test credentials could not be read. They have not been overwritten.')
    accounts = { password: randomBytes(18).toString('base64url'), users: { student: 'student@fixflow.example.test', technician: 'technician@fixflow.example.test', admin: 'admin@fixflow.example.test' } }
    await writeFile(path.join(local, 'test-accounts.json'), JSON.stringify(accounts, null, 2), { flag: 'wx', mode: 0o600 })
  }
  accounts.users.technician2 ||= 'technician2@fixflow.example.test'
  await writeFile(path.join(local, 'test-accounts.json'), JSON.stringify(accounts, null, 2), { mode: 0o600 })
  const users = {}
  for (const [role, email] of Object.entries(accounts.users)) {
    users[role] = await User.findOne({ email })
    if (!users[role]) users[role] = await User.create({ name: { student: 'Local Student', technician: 'Local Technician', technician2: 'Second Local Technician', admin: 'Local Administrator' }[role], email, passwordHash: await bcrypt.hash(accounts.password, 10), role: role === 'technician2' ? 'technician' : role })
  }
  await writeFile(path.join(local, 'expired-session.json'), JSON.stringify({ user: { id: String(users.student._id), name: users.student.name, email: users.student.email, role: 'student' }, token: requireBackend('jsonwebtoken').sign({ id: users.student._id }, process.env.JWT_SECURE, { expiresIn: -60 }) }), { mode: 0o600 })
  if (!await Location.countDocuments()) {
    const campus = JSON.parse(await readFile(path.join(backend, 'data/campusLocations.json'), 'utf8'))
    await Location.insertMany(campus)
  }
  const express = requireBackend('express')
  const cors = requireBackend('cors')
  const app = express()
  const marker = createHash('sha256').update(root).digest('hex').slice(0, 16)
  app.use((req, res, next) => { res.set('X-FixFlow-Experiment', marker); res.set('X-FixFlow-Database', mongoose.connection.name); next() })
  app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'], exposedHeaders: ['X-FixFlow-Experiment', 'X-FixFlow-Database'] }))
  app.use(express.json())
  // This harness never sends files to external services. The original backend is unchanged.
  app.post('/api/reports/:id/images', requireBackend('./middleware/AuthenticationMiddleware.js').protect, (req, res) => {
    res.status(503).json({ message: 'Cloud photo uploads are unavailable in the isolated environment. Your report remains saved; no external service was contacted.' })
  })
  for (const [route, file] of [['health', 'healthRoutes'], ['auth', 'registerRout'], ['auth', 'loginRout'], ['locations', 'locationRoutes'], ['reports', 'ReportRoutes'], ['users', 'userRoutes'], ['analytics', 'analyticsRoutes']]) app.use(`/api/${route}`, requireBackend(`./routes/${file}.js`))
  appServer = app.listen(5001, '127.0.0.1', () => {
    console.log('FixFlow isolated API: http://localhost:5001/api')
    console.log('Database: Frontend/.local/mongo-verification on port 27029 (local tests only)')
    console.log('Random local test credentials: Frontend/.local/test-accounts.json')
    console.log('No .env files loaded. Email and cloud uploads have no external credentials.')
  })
} catch (error) { console.error(error.message); process.exitCode = 1; await shutdown() }
