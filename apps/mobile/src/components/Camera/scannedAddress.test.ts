import { resolveScannedAddress } from './scannedAddress'

const VALID_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

describe('resolveScannedAddress', () => {
  it('recognises a bare checksummed address', () => {
    expect(resolveScannedAddress(VALID_ADDRESS)).toEqual({ address: VALID_ADDRESS, prefix: undefined })
  })

  it('recognises a prefixed address and keeps the prefix', () => {
    expect(resolveScannedAddress(`eth:${VALID_ADDRESS}`)).toEqual({ address: VALID_ADDRESS, prefix: 'eth' })
  })

  it('returns null for non-address values', () => {
    expect(resolveScannedAddress('https://example.com')).toBeNull()
    expect(resolveScannedAddress('wc:topic@2?relay-protocol=irn')).toBeNull()
  })

  it('recognises an EIP-681 native payment request', () => {
    expect(resolveScannedAddress(`ethereum:${VALID_ADDRESS}@1?value=1000000000000000000`)).toEqual({
      address: VALID_ADDRESS,
      paymentRequest: { recipient: VALID_ADDRESS, chainId: '1', value: '1000000000000000000' },
    })
  })

  it('recognises an EIP-681 ERC-20 payment request', () => {
    const token = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    expect(resolveScannedAddress(`ethereum:${token}@100/transfer?address=${VALID_ADDRESS}&uint256=5000000`)).toEqual({
      address: VALID_ADDRESS,
      paymentRequest: { recipient: VALID_ADDRESS, chainId: '100', tokenAddress: token, value: '5000000' },
    })
  })

  it('returns null for a malformed EIP-681 URI instead of misreading it as a prefixed address', () => {
    expect(resolveScannedAddress(`ethereum:${VALID_ADDRESS}@notachain`)).toBeNull()
    expect(resolveScannedAddress('ethereum:vitalik.eth?value=1')).toBeNull()
  })
})
