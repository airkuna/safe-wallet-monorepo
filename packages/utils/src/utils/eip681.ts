import { getAddress, isAddress } from 'ethers'

/**
 * A payment request per EIP-681 (https://eips.ethereum.org/EIPS/eip-681),
 * restricted to the two shapes wallets actually exchange: a native-coin
 * transfer and an ERC-20 `transfer` call.
 */
export type Eip681Transfer = {
  /** Checksummed address that should receive the funds */
  recipient: string
  /** Decimal chain id; absent means "whatever chain the wallet is on" */
  chainId?: string
  /** Checksummed ERC-20 contract address; absent means native coin */
  tokenAddress?: string
  /** Amount as an integer string in base units (wei / token decimals) */
  value?: string
}

export const isEip681Uri = (raw: string): boolean => /^ethereum:/i.test(raw.trim())

// EIP-681 NUMBER allows scientific notation (e.g. 2.014e18). Expands it to a
// plain integer string; returns null when the result would not be an integer.
const expandToInteger = (value: string): string | null => {
  const match = /^(\d+)(?:\.(\d+))?(?:[eE](\d+))?$/.exec(value)
  if (!match) {
    return null
  }
  const [, intPart, fracPart = '', expPart] = match
  const exponent = expPart ? parseInt(expPart, 10) : 0
  if (fracPart.length > exponent) {
    return null
  }
  const digits = intPart + fracPart + '0'.repeat(exponent - fracPart.length)
  return digits.replace(/^0+(?=\d)/, '')
}

const parseQuery = (query: string): Record<string, string> => {
  const params: Record<string, string> = {}
  for (const pair of query.split('&')) {
    if (!pair) {
      continue
    }
    const eqIndex = pair.indexOf('=')
    const key = eqIndex === -1 ? pair : pair.slice(0, eqIndex)
    const value = eqIndex === -1 ? '' : pair.slice(eqIndex + 1)
    params[decodeURIComponent(key)] = decodeURIComponent(value)
  }
  return params
}

/**
 * Builds an EIP-681 URI. Addresses are checksummed; `value` must already be an
 * integer string in base units (use `safeParseUnits` on user input first).
 */
export const generateEip681Uri = ({ recipient, chainId, tokenAddress, value }: Eip681Transfer): string => {
  if (!isAddress(recipient)) {
    throw new Error(`EIP-681 recipient is not a valid address: ${recipient}`)
  }
  if (chainId !== undefined && !/^\d+$/.test(chainId)) {
    throw new Error(`EIP-681 chainId must be a decimal string: ${chainId}`)
  }
  if (value !== undefined && !/^\d+$/.test(value)) {
    throw new Error(`EIP-681 value must be an integer string in base units: ${value}`)
  }
  const chainSuffix = chainId ? `@${chainId}` : ''

  if (tokenAddress) {
    if (!isAddress(tokenAddress)) {
      throw new Error(`EIP-681 tokenAddress is not a valid address: ${tokenAddress}`)
    }
    const amountParam = value ? `&uint256=${value}` : ''
    return `ethereum:${getAddress(tokenAddress)}${chainSuffix}/transfer?address=${getAddress(recipient)}${amountParam}`
  }

  const valueParam = value ? `?value=${value}` : ''
  return `ethereum:${getAddress(recipient)}${chainSuffix}${valueParam}`
}

/**
 * Parses an EIP-681 URI into an {@link Eip681Transfer}. Returns null for
 * anything it cannot represent losslessly and safely: non-`transfer` function
 * calls, ENS targets, malformed chain ids or amounts. Never throws.
 */
export const parseEip681Uri = (uri: string): Eip681Transfer | null => {
  try {
    const trimmed = uri.trim()
    const scheme = /^ethereum:(?:pay-)?/i.exec(trimmed)
    if (!scheme) {
      return null
    }
    const rest = trimmed.slice(scheme[0].length)
    const queryIndex = rest.indexOf('?')
    const head = queryIndex === -1 ? rest : rest.slice(0, queryIndex)
    const query = queryIndex === -1 ? '' : rest.slice(queryIndex + 1)

    const [targetPart, ...functionParts] = head.split('/')
    if (functionParts.length > 1 || functionParts[0] === '') {
      return null
    }
    const functionName = functionParts[0]

    const atParts = targetPart.split('@')
    if (atParts.length > 2) {
      return null
    }
    const [target, chainPart] = atParts
    if (!isAddress(target)) {
      return null
    }
    if (chainPart !== undefined && !/^\d+$/.test(chainPart)) {
      return null
    }
    const chainId = chainPart

    const params = parseQuery(query)

    if (functionName === undefined) {
      let value: string | undefined
      if (params.value !== undefined) {
        const expanded = expandToInteger(params.value)
        if (expanded === null) {
          return null
        }
        value = expanded
      }
      return { recipient: getAddress(target), chainId, value }
    }

    if (functionName !== 'transfer') {
      return null
    }
    if (!params.address || !isAddress(params.address)) {
      return null
    }
    let value: string | undefined
    if (params.uint256 !== undefined) {
      const expanded = expandToInteger(params.uint256)
      if (expanded === null) {
        return null
      }
      value = expanded
    }
    return { recipient: getAddress(params.address), chainId, tokenAddress: getAddress(target), value }
  } catch {
    return null
  }
}
