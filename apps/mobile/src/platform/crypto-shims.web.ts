/**
 * Web varijanta crypto-shimova: react-native-quick-crypto je native-only
 * (Nitro moduli), a u browseru ethers koristi vlastite (WebCrypto/noble)
 * implementacije — nema se što instalirati. Metro za web bira ovu datoteku
 * umjesto crypto-shims.ts (.web platform ekstenzija).
 */
export {}
