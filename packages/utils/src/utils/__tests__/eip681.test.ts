import { generateEip681Uri, isEip681Uri, parseEip681Uri } from '../eip681'

const RECIPIENT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const TOKEN = '0x6B175474E89094C44Da98b954EedeAC495271d0F'

describe('isEip681Uri', () => {
  it('recognises the ethereum scheme case-insensitively and with whitespace', () => {
    expect(isEip681Uri(`ethereum:${RECIPIENT}`)).toBe(true)
    expect(isEip681Uri(`ETHEREUM:${RECIPIENT}`)).toBe(true)
    expect(isEip681Uri(`  ethereum:${RECIPIENT}  `)).toBe(true)
  })

  it('rejects other payloads', () => {
    expect(isEip681Uri(RECIPIENT)).toBe(false)
    expect(isEip681Uri('wc:topic@2?relay-protocol=irn')).toBe(false)
    expect(isEip681Uri('https://example.com')).toBe(false)
    expect(isEip681Uri('')).toBe(false)
  })
})

describe('generateEip681Uri', () => {
  it('generates a native transfer with chainId and value', () => {
    expect(generateEip681Uri({ recipient: RECIPIENT, chainId: '1', value: '1000000000000000000' })).toBe(
      `ethereum:${RECIPIENT}@1?value=1000000000000000000`,
    )
  })

  it('generates a native transfer without value or chainId', () => {
    expect(generateEip681Uri({ recipient: RECIPIENT })).toBe(`ethereum:${RECIPIENT}`)
    expect(generateEip681Uri({ recipient: RECIPIENT, chainId: '100' })).toBe(`ethereum:${RECIPIENT}@100`)
  })

  it('generates an ERC-20 transfer', () => {
    expect(generateEip681Uri({ recipient: RECIPIENT, chainId: '1', tokenAddress: TOKEN, value: '5000000' })).toBe(
      `ethereum:${TOKEN}@1/transfer?address=${RECIPIENT}&uint256=5000000`,
    )
  })

  it('generates an ERC-20 transfer without an amount', () => {
    expect(generateEip681Uri({ recipient: RECIPIENT, tokenAddress: TOKEN })).toBe(
      `ethereum:${TOKEN}/transfer?address=${RECIPIENT}`,
    )
  })

  it('checksums lowercase addresses', () => {
    expect(generateEip681Uri({ recipient: RECIPIENT.toLowerCase() })).toBe(`ethereum:${RECIPIENT}`)
    expect(generateEip681Uri({ recipient: RECIPIENT.toLowerCase(), tokenAddress: TOKEN.toLowerCase() })).toBe(
      `ethereum:${TOKEN}/transfer?address=${RECIPIENT}`,
    )
  })

  it('throws on invalid inputs', () => {
    expect(() => generateEip681Uri({ recipient: '0x123' })).toThrow('not a valid address')
    expect(() => generateEip681Uri({ recipient: RECIPIENT, tokenAddress: 'nope' })).toThrow('not a valid address')
    expect(() => generateEip681Uri({ recipient: RECIPIENT, chainId: '0x1' })).toThrow('decimal')
    expect(() => generateEip681Uri({ recipient: RECIPIENT, value: '1.5' })).toThrow('integer')
    expect(() => generateEip681Uri({ recipient: RECIPIENT, value: '-1' })).toThrow('integer')
  })
})

describe('parseEip681Uri', () => {
  it('parses a native transfer with chainId and value', () => {
    expect(parseEip681Uri(`ethereum:${RECIPIENT}@1?value=1000000000000000000`)).toEqual({
      recipient: RECIPIENT,
      chainId: '1',
      value: '1000000000000000000',
    })
  })

  it('parses a bare address URI without chainId or value', () => {
    expect(parseEip681Uri(`ethereum:${RECIPIENT}`)).toEqual({
      recipient: RECIPIENT,
      chainId: undefined,
      value: undefined,
    })
  })

  it('parses an ERC-20 transfer', () => {
    expect(parseEip681Uri(`ethereum:${TOKEN}@100/transfer?address=${RECIPIENT}&uint256=5000000`)).toEqual({
      recipient: RECIPIENT,
      chainId: '100',
      tokenAddress: TOKEN,
      value: '5000000',
    })
  })

  it('parses an ERC-20 transfer without an amount', () => {
    expect(parseEip681Uri(`ethereum:${TOKEN}/transfer?address=${RECIPIENT}`)).toEqual({
      recipient: RECIPIENT,
      chainId: undefined,
      tokenAddress: TOKEN,
      value: undefined,
    })
  })

  it('supports the optional pay- prefix and uppercase scheme', () => {
    expect(parseEip681Uri(`ethereum:pay-${RECIPIENT}@1`)).toEqual({
      recipient: RECIPIENT,
      chainId: '1',
      value: undefined,
    })
    expect(parseEip681Uri(`ETHEREUM:${RECIPIENT}`)).toEqual({
      recipient: RECIPIENT,
      chainId: undefined,
      value: undefined,
    })
  })

  it('expands scientific notation amounts to integer strings', () => {
    expect(parseEip681Uri(`ethereum:${RECIPIENT}?value=2.014e18`)?.value).toBe('2014000000000000000')
    expect(parseEip681Uri(`ethereum:${RECIPIENT}?value=1e18`)?.value).toBe('1000000000000000000')
    expect(parseEip681Uri(`ethereum:${TOKEN}/transfer?address=${RECIPIENT}&uint256=5e6`)?.value).toBe('5000000')
  })

  it('rejects exponents beyond uint256 instead of expanding them', () => {
    expect(parseEip681Uri(`ethereum:${RECIPIENT}?value=1e999999999`)).toBeNull()
    expect(parseEip681Uri(`ethereum:${RECIPIENT}?value=1e79`)).toBeNull()
    expect(parseEip681Uri(`ethereum:${RECIPIENT}?value=1e78`)?.value).toBe(`1${'0'.repeat(78)}`)
  })

  it('checksums lowercase addresses', () => {
    expect(parseEip681Uri(`ethereum:${RECIPIENT.toLowerCase()}`)?.recipient).toBe(RECIPIENT)
    const parsed = parseEip681Uri(`ethereum:${TOKEN.toLowerCase()}/transfer?address=${RECIPIENT.toLowerCase()}`)
    expect(parsed?.tokenAddress).toBe(TOKEN)
    expect(parsed?.recipient).toBe(RECIPIENT)
  })

  it('ignores unknown query parameters', () => {
    expect(parseEip681Uri(`ethereum:${RECIPIENT}@1?value=1&gas=21000&label=Coffee`)).toEqual({
      recipient: RECIPIENT,
      chainId: '1',
      value: '1',
    })
  })

  it('round-trips its own generator output', () => {
    const native = { recipient: RECIPIENT, chainId: '1', value: '12345' }
    expect(parseEip681Uri(generateEip681Uri(native))).toEqual(native)

    const erc20 = { recipient: RECIPIENT, chainId: '100', tokenAddress: TOKEN, value: '99' }
    expect(parseEip681Uri(generateEip681Uri(erc20))).toEqual(erc20)
  })

  describe('malformed input', () => {
    it.each([
      ['empty string', ''],
      ['bare address (no scheme)', RECIPIENT],
      ['walletconnect URI', 'wc:topic@2?relay-protocol=irn'],
      ['https URL', 'https://example.com'],
      ['invalid target address', 'ethereum:0x1234'],
      ['ENS target (unsupported)', 'ethereum:vitalik.eth@1?value=1'],
      ['hex chainId', `ethereum:${RECIPIENT}@0x1`],
      ['non-numeric chainId', `ethereum:${RECIPIENT}@mainnet`],
      ['double @', `ethereum:${RECIPIENT}@1@2`],
      ['unsupported function', `ethereum:${TOKEN}@1/approve?address=${RECIPIENT}`],
      ['trailing slash without function', `ethereum:${RECIPIENT}/`],
      ['nested path', `ethereum:${TOKEN}/transfer/extra?address=${RECIPIENT}`],
      ['transfer without address param', `ethereum:${TOKEN}@1/transfer?uint256=5`],
      ['transfer with invalid address param', `ethereum:${TOKEN}@1/transfer?address=0xdead`],
      ['non-integer native value', `ethereum:${RECIPIENT}?value=1.5`],
      ['negative value', `ethereum:${RECIPIENT}?value=-5`],
      ['non-numeric value', `ethereum:${RECIPIENT}?value=abc`],
      ['fractional wei after exponent', `ethereum:${RECIPIENT}?value=1.234e2`],
      ['non-integer token amount', `ethereum:${TOKEN}/transfer?address=${RECIPIENT}&uint256=0.5`],
      ['malformed percent-encoding', `ethereum:${RECIPIENT}?value=%E0%A4%A`],
    ])('returns null for %s', (_label, uri) => {
      expect(parseEip681Uri(uri)).toBeNull()
    })

    it('never throws on arbitrary garbage', () => {
      const garbage = ['ethereum:', 'ethereum:@1', 'ethereum:pay-', 'ethereum:?value=1', 'ethereum://transfer']
      for (const uri of garbage) {
        expect(() => parseEip681Uri(uri)).not.toThrow()
        expect(parseEip681Uri(uri)).toBeNull()
      }
    })
  })
})
