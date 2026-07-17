/**
 * Web stub: react-native-quick-crypto je native-only (Nitro). Za web preview
 * pokrivamo API-je koje app stvarno koristi (createHash md5/sha256/sha512,
 * createHmac, pbkdf2Sync, randomBytes) preko @noble/hashes; AES decipher
 * (import legacy podataka) u previewu nije podržan i jasno throwa.
 */
const { sha256, sha512 } = require('@noble/hashes/sha2')
const { md5, sha1 } = require('@noble/hashes/legacy')
const { hmac } = require('@noble/hashes/hmac')
const { pbkdf2 } = require('@noble/hashes/pbkdf2')

const HASHES = { md5, sha1, sha256, sha512 }

const toBytes = (data) => {
  if (data instanceof Uint8Array) {
    return data
  }
  if (typeof data === 'string') {
    return new TextEncoder().encode(data)
  }
  if (data && data.buffer instanceof ArrayBuffer) {
    return new Uint8Array(data.buffer, data.byteOffset ?? 0, data.byteLength)
  }
  return new TextEncoder().encode(String(data))
}

const toHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const concat = (chunks) => {
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

const resolveHash = (algorithm) => {
  const hash = HASHES[String(algorithm).toLowerCase()]
  if (!hash) {
    throw new Error(`web preview: hash "${algorithm}" nije podržan`)
  }
  return hash
}

const makeDigester = (compute) => {
  const chunks = []
  const api = {
    update(data) {
      chunks.push(toBytes(data))
      return api
    },
    digest(encoding) {
      const out = compute(concat(chunks))
      return encoding === 'hex' ? toHex(out) : out
    },
  }
  return api
}

const quickCrypto = {
  install: () => {},
  createHash: (algorithm) => {
    const hash = resolveHash(algorithm)
    return makeDigester((data) => hash(data))
  },
  createHmac: (algorithm, key) => {
    const hash = resolveHash(algorithm)
    return makeDigester((data) => hmac(hash, toBytes(key), data))
  },
  pbkdf2Sync: (password, salt, iterations, keylen, algorithm = 'sha256') => {
    const hash = resolveHash(algorithm)
    return pbkdf2(hash, toBytes(password), toBytes(salt), { c: iterations, dkLen: keylen })
  },
  randomBytes: (length) => {
    const out = new Uint8Array(length)
    globalThis.crypto.getRandomValues(out)
    return out
  },
  createDecipheriv: () => {
    throw new Error('web preview: createDecipheriv (AES import) nije podržan u browseru')
  },
}

module.exports = quickCrypto
module.exports.default = quickCrypto
module.exports.install = quickCrypto.install
