# Research zapis: tržište i regulativa za airKUNA (2026-07-22)

> Puni nalazi dva paralelna internet-research prolaza (tržišni + regulatorni) koji su
> podloga za [17-airkuna-roadmap.md](17-airkuna-roadmap.md). Sve tvrdnje imaju izvor i
> datum; otvorene interpretacije su označene. Prije ponovnog researcha — pročitaj ovo.

## A. Tržište (mid-2026)

### Konkurentski krajolik

- **Gnosis Pay** — strateški najbliži (isti stack: Safe na Gnosisu + Monerium EURe).
  $131M lifetime card spend kraj 2025.; $100M milestone 10/2025, 2-milijunta uplata
  12/2025; cilj za 2026. $1B. **Gnosis Pay SDK (7/2025)** za white-label kartične
  programe — partneri živi kroz Zeal, Picnic (Brazil), Rebind. Driveri adopcije:
  self-custody Visa debit direktno iz Safea, 0 naknada na kupnju/FX, Apple Pay, ENS ime
  na kartici, do 4-5% GNO cashback.
  Izvori: [Gnosis 2025 Year in Review](https://www.gnosis.io/blog/2025-year-in-review-the-year-of-ownership),
  [Gnosis Pay na X, 31.12.2025](https://x.com/gnosispay/status/2006479272865591409),
  [spendnode 2026](https://www.spendnode.io/crypto-cards/gnosis-pay-card/),
  [eco.com usporedba 2026](https://eco.com/support/en/articles/15210382-best-stablecoin-debit-cards-2026-kast-gnosis-pay-crypto-com-compared).
- **Zeal** — consumer self-custody wallet oko Gnosis Pay kartice; passkey (bez seed
  fraze), estonski IBAN preko Moneriuma (~3 min setup, auto-mint EURe na SEPA priljev),
  "~5% APY" marketing + do 4% cashback. **Efektivno template "Revolut-like" EURe
  walleta.** Izvori: [zeal.app/gnosispay](https://www.zeal.app/gnosispay/),
  [Zeal Learn](https://www.zeal.app/learn/gnosis-pay-explained/).
- **Coinbase Wallet → Base App** (17.7.2025) — superapp rebrand: smart-wallet Base
  Account (passkey), Basenames imena, social feed (Farcaster), XMTP chat, NFC USDC
  tap-to-pay, Base Pay checkout na Shopifyju. Signal: veliki konvergiraju na
  passkeys + imena + payments + social.
  Izvori: [CoinDesk](https://www.coindesk.com/tech/2025/07/17/coinbase-wallet-becomes-base-app-in-major-rebrand),
  [The Block](https://www.theblock.co/post/362713/coinbase-unveils-base-app-rebrands-wallet-as-all-in-one-social-and-trading-platform).
- **Daimo** — consumer Venmo-like app arhiviran; pivot u **Daimo Pay** checkout/deposit
  SDK. Lekcija: standalone consumer P2P app bez rampi/use-casea nije održao traction;
  infra jest. Izvori: [github.com/daimo-eth/daimo](https://github.com/daimo-eth/daimo),
  [Circle partners](https://partners.circle.com/partner/daimo-pay).
- **Peanut Protocol** — claim-link plaćanja (tajna iza `#` u URL-u — server je ne vidi),
  zero-fee naracija, 140+ zemalja, radi preko WhatsApp/QR/broja. **Payment linkovi =
  dokazan low-friction onboarding primatelja bez walleta** — direktno relevantno za
  donacije. Izvori: [peanut.me](https://peanut.me/),
  [BigGo 10/2025](https://finance.biggo.com/news/202510010753_Peanut_Protocol_Zero_Fee_Global_Transfers).
- **Safe{Mobile}** (upstream) — potpuni RN rewrite shipan 7/2025, signer-first;
  Safenet validator mreža u beti.
  Izvori: [safe.global blog](https://safe.global/blog/introducing-the-all-new-safe-wallet-mobile-app),
  [The Block](https://www.theblock.co/post/396147/non-custodial-wallet-safe-security-safenet-tokens).
- **Konzistentni adoption driveri kroz 2025-26**: passkeys/biometrija umjesto seed
  fraza, čitljiva imena (ENS/Basenames), payment/claim linkovi, self-custody debitna
  kartica, in-app fiat rampe, cashback. Rabby = power-user/desktop, nije referenca za
  mainstream.

### Fiat on/off-rampe za HR/EU EURe wallet

- **Monerium (primarna tračnica)** — imenovani IBAN po blockchain adresi; SEPA priljev
  auto-minta EURe, redemption pali u SEPA out. **Cjenik: trenutno 0 naknada** ("Monerium
  is not charging any fees… may start at a future date with notice" — provjereno
  7/2026). IBAN/SEPA preko partnera AS LHV Pank (Estonija). KYC/KYB radi Monerium;
  partner-API model gdje wallet integrira a Monerium nosi compliance. Caveat: partner
  pricing dijelom bespoke, nije javan. Napomena o licenci: Monerium je autorizirani EMI
  (povijesno islandski FME, EEA passport); jedan 2026 izvor navodi finski FIN-FSA —
  **provjeriti aktualnog home regulatora prije pravnih dokumenata**.
  Izvori: [monerium.com/fee-schedule](https://monerium.com/fee-schedule/),
  [docs.monerium.com](https://docs.monerium.com/),
  [monerium.com/partners](https://monerium.com/partners/),
  [rfp.wiki procjena 2026](https://www.rfp.wiki/crypto/stablecoins-on-off-ramps/stablecoin-protocols-issuers/monerium).
- **Gnosis Pay kartica** — realna spending off-rampa; white-label/SDK put od 7/2025,
  KYC preko Moneriuma, EU/EEA/UK. Za mali wallet SDK integracija >> vlastiti kartični
  program.
- **Mt Pelerin** (CH) — self-custodial buy/sell widget, SEPA Instant 24/7, ~0,5-1,5%
  naknade; presedan zero-fee 1:1 rampi za e-money tokene (EUROe). Dobar fallback za
  kupnju karticom. Izvori: [developers.mtpelerin.com](https://developers.mtpelerin.com/service-information/pricing-and-limits),
  [euroe.com blog](https://www.euroe.com/blog/mtpelerin).
- **Ramp Network / agregatori** — standardni widgeti dostupni EU-wide
  ([rampnow.io 2026](https://rampnow.io/en/blog/best-crypto-onramps-2026)); ali s
  Monerium IBAN-om SEPA je najjeftinija rampa, widgeti su samo convenience dodatak.

### Euro stablecoini i MiCA status

- MiCA u punoj primjeni EU27; **grandfathering prozor završio ~1.7.2026.** EMT = 1:1
  pokriće, EMI-licencirani izdavatelj, ESMA registar. Samo **8 euro stablecoina
  MiCA-compliant 6/2026** (s 5 početkom godine).
  Izvori: [cryptonomist 6.7.2026](https://en.cryptonomist.ch/2026/07/06/mica-euro-stablecoins-growth/),
  [eco.com MiCA lista](https://eco.com/support/en/articles/15192006-mica-compliant-stablecoins-2026-full-list-with-issuers).
- Compliant euro-stablecoin cap **$295,6M → $673,9M (+128% YoY)**; **EURC dominira**
  (~$430M cap, ~$34M tjedni volumen); **EURe ~$30M+** ali jedini s native IBAN-om po
  korisniku ([CoinGecko EURe](https://www.coingecko.com/en/coins/monerium-eur-money)).
  Zaključak: rastuća ali niša tračnica.
- Merchant momentum: EURC potrošiv na 40M+ trgovina preko Ingenico/WalletConnect Pay od
  13.1.2026 ([stablecoininsider](https://stablecoininsider.org/eurc-q1-2026-stablecoin-report/));
  stablecoin card spend ~$1,5B/mj kraj 2025
  ([insights4vc](https://insights4vc.substack.com/p/the-state-of-stablecoin-cards)).

### "Revolut-like" očekivanja: MVP vs kasnije

- **MVP-tier (korisnici pretpostavljaju da postoji)**: biometrija/passkey, instant push
  notifikacije o transakcijama (96% recenzenata smatra alerte bitnima —
  [GetApp 2026](https://www.getapp.com/all-software/cryptocurrency-wallets/f/email-notifications/)),
  in-app fiat rampa (SEPA/kartica), jednostavno slanje s imenima ili linkovima,
  predvidljiv "normalna payments app" UX
  ([Mountain Wolf 2026](https://www.mountainwolf.com/insights/crypto/the-ideal-crypto-payment-customer-journey-in-2026/),
  [nadcab survey](https://www.nadcab.com/blog/best-mobile-crypto-wallet-features)).
- **Kasnije**: debitna kartica (Gnosis Pay SDK), recurring/scheduled payments, social
  recovery, multi-chain, DeFi/savings.
- **Yield ograničenje**: MiCA čl. 45(12)/50 (EMT, zrcali čl. 22(4) za ART) **zabranjuje
  izdavateljima I posrednicima/CASP-ovima kamatu** ili bilo koju korist vezanu uz duljinu
  držanja EMT-a poput EURe — široko definirano, uključivo third-party benefite.
  Dopušteni supstituti: niže naknade, **usage-based** (ne balance-time-based) cashback,
  activity poticaji. Zeal/Gnosis "5% APY / cashback" konstrukcije idu preko GNO holdinga
  i DeFi pozicija, ne EURe kamate — sivo-ali-prakticirano; **airKUNA ne obećava yield na
  EURe saldo**. "MiCA 2.0" rasprava o yield pravilima traje (mid-2026) — pratiti, ne
  graditi na njoj.
  Izvori: [Oxford Law Blog 3/2026](https://blogs.law.ox.ac.uk/oblb/blog-post/2026/03/stablecoin-interest-crossroads-micas-prohibition-and-us-regulatory-maze),
  [BIS FSI Brief 27](https://www.bis.org/fsi/fsibriefs27.pdf),
  [cryptodaily 6/2026](https://cryptodaily.co.uk/2026/06/stablecoin-rewards-mica-2-eu-payments).

### Store politike 2026

- **Google Play**: politika na snazi **29.10.2025** traži licence za **mjenjačnice i
  kastodijalne wallete** u 15+ jurisdikcija (uklj. EU — MiCA CASP). Google pojasnio
  (13.8.2025, službeni X post): **non-custodial/self-custody walleti izuzeti**. airKUNA
  kvalificira, ali očekivati da Play review propituje deklaraciju — relayer/donacije
  arhitektura mora biti dokazivo non-custodial.
  Izvori: [Forbes 13.8.2025](https://www.forbes.com/sites/boazsobrado/2025/08/13/google-play-store-requires-government-licenses-for-crypto-wallet-apps/),
  [The Paypers](https://thepaypers.com/crypto-web3-and-cbdc/news/google-plays-new-policy-not-to-impact-non-custodial-crypto-wallets),
  [CCN explainer](https://www.ccn.com/education/crypto/google-play-crypto-wallet-licensing-us-eu-rules-explained/).
- **Apple**: update smjernica 2.5.2025 (post-Epic) dopušta **US storefront** linkanje na
  vanjska plaćanja za crypto/NFT i miče NFT-browsing restrikcije — **samo US**; u EU
  alternativna plaćanja idu pod DMA. I dalje zabranjeno: on-device mining, token nagrade
  za taskove. Standard 3.1.5 (developer = operator walleta, bez ICO ponuda) vrijedi.
  Izvori: [9to5Mac](https://9to5mac.com/2025/05/01/apple-app-store-guidelines-external-links/),
  [Decrypt](https://decrypt.co/317589/apple-loosens-nft-crypto-ios-app-rules).
- Praktično: self-custody wallet sa slanjem, donacijama (crypto-native, ne in-app kupnja
  digitalnog sadržaja) i SEPA rampama **nema poznatih novih store blokada 2026** na
  obje platforme. Rizične zone dizajna: sve što liči na IAP digitalnih dobara kriptom
  (Apple) i sve što liči na custody (Play licence).

## B. Regulativa (mid-2026)

### MiCA i granica self-custodyja

**Settled:**

- MiCA (puna primjena od 30.12.2024) regulira CASP-ove; čisti self-custody wallet
  **softver** (provider nikad ne kontrolira ključeve/imovinu) **nije custody i nije
  CASP usluga**; korištenje ne traži ni autorizaciju ni KYC.
  Izvori: [OneKey](https://onekey.so/blog/ecosystem/mica-no-kyc-self-custody-eu-traders/),
  [Tangem 2026](https://tangem.com/en/learning-hub/post/mica-regulation-self-custody/),
  [Dechert](https://www.dechert.com/knowledge/onpoint/2025/1/application-of-second-part-of-mica---regulation-of-casps-and-oth.html).
- Prijelazno razdoblje završilo **1.7.2026**; ESMA javna izjava (6/2026) neautoriziranim
  CASP-ovima nalaže wind-down. Ne dira ne-CASP, ali definira enforcement klimu.
  Izvori: [ESMA izjava (PDF)](https://www.esma.europa.eu/sites/default/files/2026-06/ESMA75-113276571-1710_Public_Statement_MiCA_transitional_period_ends.pdf),
  [AMF sažetak](https://www.amf-france.org/en/news-publications/news/end-mica-transitional-period-esma-sets-out-its-expectations-professionals-and-warns-retail-investors).

**Otvorena interpretacija — gdje se granica muti**
(najbolja analiza: [Axis Advisory o frontendima pod MiCA-om](https://www.axisadvisory.xyz/blog-posts/are-frontends-interfaces-regulated-under-mica),
na tragu ESMA working papera 8/2024):

- **Reception & transmission of orders (RTO, čl. 3(1)(23))** je glavna zamka za
  "aktivne" frontende: primanje instrukcija, enkodiranje/optimiziranje payloada i
  prosljeđivanje trećima (solveri, routeri, **relayeri/sequenceri**) može biti RTO.
  Wallet gdje **korisnikov potpis zaključuje i broadcasta transakciju** izbjegava
  execution/RTO — uloga frontenda ostaje "pripremna".
- **Relayer/sponzorirani gas**: bez eksplicitne EU smjernice (2026). Plaćanje gasa za
  user-signed tx nije custody ni exchange; ali ako naš backend prima potpisani payload
  i prosljeđuje ga, liči na RTO obrazac. Mitigacije: user-signed opovi, relayer kao
  glupa cijev (bez diskrecije, order-booka, routing izbora), ili third-party infra
  (Gnosis/Safe relay, paymaster). **Nesettled — držati relayer ne-diskrecijskim i
  dokumentirati arhitekturu.**
- **Naknade/referrali**: prihod sam po sebi ne stvara CASP status, ali pojačava
  "professional provision" scope test. Referral za onramp = marketinški prihod, ne
  crypto-asset usluga — **pod uvjetom da korisnik ugovara direktno s reguliranom
  stranom** (Monerium) i da airKUNA nikad ne dira sredstva ni naloge.
- **Marketplace/matching**: "operation of a trading platform" = matchanje kupaca i
  prodavatelja **crypto-asseta**; marketplace robe/usluga naplaćen u EURe to nije, kao
  ni P2P preprodaja ulaznica (trguje se ulaznicama, ne tokenima). **Order-book samo za
  robu/ulaznice, nikad token-za-token.**
- EBA travel-rule smjernice (EBA/GL/2024/11) obvezuju CASP-ove u interakciji sa
  self-hosted walletima — bez obveza za vendore wallet softvera.

### Hrvatska

- HR MiCA provedbeni zakon 7/2024; **HANFA** nadzire CASP-ove, **HNB** ART/EMT
  izdavatelje. CASP prijave od 1.1.2025; legacy-VASP tranzicija istekla **1.7.2026**.
  Izvori: [Coincub](https://coincub.com/blog/crypto-licensing-croatia/),
  [Scorechain](https://www.scorechain.com/blog/casp-croatia),
  [Copla](https://copla.com/blog/compliance-regulations/mica-regulation-in-croatia-licensing-implementation-and-what-crypto-firms-need-to-know/),
  [HANFA obavijest](https://www.hanfa.hr/news/provision-of-crypto-asset-services-from-1-july-2026-crypto-licence-and-registration-in-hanfa-registers-mandatory-for-providers-consumers-urged-to-exercise-caution/).
- Prva HR CASP licenca: **Electrocoin (Zagreb), HANFA 4/2026**
  ([Croatia Week](https://www.croatiaweek.com/croatia-first-mica-crypto-licence-electrocoin/)) —
  presedan/potencijalni partner ako ikad zatreba licencirana funkcija.
- Porez: kapitalni dobici fizičkih osoba ~12%; EURe je euro-pegiran pa je dobitak ~0,
  ali otuđenja su tehnički prijavljivi događaji — disclaimer u appu, ne feature
  ([ainvest](https://www.ainvest.com/news/croatia-implements-12-crypto-tax-mandates-hanfa-registration-exchanges-2506/)).
- **Fiskalizacija 2.0** (na snazi 1.1.2026): obvezni B2B eRačun (UBL 2.1/EN16931) +
  fiskalizacija B2C računa + **e-reporting svih B2C transakcija bez obzira na način
  plaćanja**. Bez kripto-specifičnih odredbi → trgovac plaćen u EURe **svejedno
  fiskalizira i e-reporta** ("ostali načini plaćanja"). Obveza je na trgovcu, ali
  marketplace mora davati fiskalizaciji kompatibilan export.
  **Otvoren detalj: tretman kripta u tehničkim specifikacijama Porezne uprave.**
  Izvori: [EDICOM](https://edicomgroup.com/blog/croatia-electronic-invoicing-b2b),
  [ecosio](https://ecosio.com/en/blog/e-invoicing-croatia-fiscalisation-2-0-e-reporting/),
  [Fiscal Solutions](https://www.fiscal-requirements.com/news/3656).

### TFR / travel rule

- Uredba (EU) 2023/1113 (od 30.12.2024) obvezuje **samo CASP-ove**. **P2P transferi
  između dva self-hosted walleta bez CASP-a su izričito izvan scopea.**
- Indirektan utjecaj: kad korisnik miče EURe prema/od CASP-a ili Moneriuma, _ta strana_
  radi originator/beneficiary provjere, a za self-hosted transfere > €1.000 verificira
  da korisnik kontrolira wallet (Satoshi test / potpis poruke). **UX implikacija: wallet
  treba message-signing proof-of-ownership** da korisnici prolaze CASP provjere.
  Izvori: [Notabene deep dive](https://notabene.id/post/a-deep-dive-into-self-hosted-wallet-transaction-requirements-under-the-eu-tfr),
  [21 Analytics](https://www.21analytics.co/travel-rule-regulations/european-union-eu-travel-rule-regulation/).

### Političke/civilne donacije u HR

Zakon o financiranju političkih aktivnosti, izborne promidžbe i referenduma
(NN 29/19, 98/19, 126/21) —
[zakon.hr pročišćeni tekst](https://www.zakon.hr/z/1957/zakon-o-financiranju-politickih-aktivnosti%2C-izborne-promidzbe-i-referenduma),
[DIP upute](https://www.izbori.hr/site/nadzor-financiranja/financiranje-izborne-promidzbe/80):

- **Godišnji capovi**: fizička osoba → **€3.981,68** po stranci/nezavisnom kandidatu
  (godišnje, i zasebno po kampanji); pravna osoba → ~€26.544.
- **Anonimne donacije zabranjene.** Donacije **preko posrednika zabranjene** — wallet
  nikad ne smije poolati ili provlačiti donacije kroz vlastiti račun.
- **Strane donacije zabranjene** (strane države, stranke, pravne osobe; strane fizičke
  osobe osim EU građana s prebivalištem u HR). Zabranjeni i: državna tijela, tvrtke
  > 5% državne, sindikati, vjerske zajednice, humanitarne org., dužnici državi.
- **Novčane donacije moraju na poseban račun primatelja u banci**; donacija > €663,61
  bez ugovora se prijavljuje i predaje proračunu; in-kind traži tržišnu dokumentaciju.
- **Posljedica za airKUNA**: direktan on-chain EURe transfer političkoj/referendumskoj
  kampanji **ne zadovoljava** zahtjev posebnog računa — compliant obrazac je
  EURe → Monerium redemption → SEPA na poseban račun, s punim identitetom donatora,
  cap enforcementom i screeningom stranih donatora. **"Civilne" (udruga/NGO) donacije
  izvan izbornog zakona su slobodnije**, ali humanitarne kampanje traže registraciju po
  Zakonu o humanitarnoj pomoći — provjeriti po tipu kampanje (zadnja točka iz općeg
  znanja, neverificirana u ovom prolazu).

### PSD2/PSD3 i e-money kut

- **Settled struktura**: Monerium je licencirani **EMI** (prvi EMI s on-chain e-novcem,
  2019; EEA passport) i EURe je MiCA EMT; izdavanje, safeguarding, 1:1 redemption i
  IBAN rampa su **Moneriumove** regulirane aktivnosti. Standardni partner model: wallet
  je čisti softver; **korisnik ugovara i KYC-a se kod Moneriuma**; sredstva teku
  korisnik↔Monerium, nikad kroz operatora walleta. Gnosis Pay/MetaMask Card isti
  pattern za kartice.
  Izvori: [monerium.com/eure](https://monerium.com/eure/),
  [Monerium web3 cards 2026](https://monerium.com/blog/2026/web3-cards-and-euro-stablecoins-what-you-should-know-in-2026/).
- **Rizik linija po PSD2**: wallet postaje payment service provider ako ikad _acquira_
  sredstva, izvršava platne transakcije u ime korisnika ili vodi račune. Payment
  linkovi/QR/recurring UI koji samo konstruiraju transakciju koju **korisnik potpisuje
  sa svoje adrese** ostaju softver. "Merchant checkout" gdje airKUNA prima EURe pa
  settla trgovcu = acquiring → licencirana aktivnost. **Strogo payer-wallet →
  payee-address.** (Margine otvorene, npr. pull-payment/recurring preko session keyeva
  — bez EU smjernice.)
- **PSD3/PSR (mid-2026)**: politički dogovor 27.11.2025; kompromisni tekstovi 23.4.2026;
  usvajanje/OJ očekivano **H2 2026**, primjena ~kraj 2027/2028; PSD2+EMD2 se spajaju.
  U 12-mjesečnom horizontu vrijedi PSD2; granica softver-vs-PSP se materijalno ne mijenja.
  Izvori: [MoFo](https://www.mofo.com/resources/insights/260430-psd3-and-the-payment-services-regulation-key-developments),
  [Norton Rose Fulbright](https://www.nortonrosefulbright.com/en/knowledge/publications/cedd39c6/psd3-and-psr-from-provisional-agreement-to-2026-readiness),
  [Worldline](https://worldline.com/en/home/main-navigation/resources/blogs/2026/the-scope-and-timeline-are-locked-in-for-psd3-and-psr-what-should-psps-know).

### Obveze na razini aplikacije

- **GDPR**: EDPB **Guidelines 02/2025 on blockchain, final v2.0 od 7.7.2026** — adrese,
  tx identifikatori i on-chain metadata **mogu biti osobni podaci**; preporuke: nikad
  osobne podatke on-chain, off-chain pohrana, DPIA dokumentacija, dizajn za prava
  ispitanika unatoč immutabilityju. Za donacije: mapping adresa↔identitet je jasno
  osobni podatak — off-chain, minimiziran, s pravnom osnovom.
  Izvori: [EDPB v2 PDF](https://www.edpb.europa.eu/system/files/2026-07/edpb_guidelines_202502_blockchain_v2_en.pdf),
  [Bird & Bird sažetak](https://www.twobirds.com/en/insights/2026/netherlands/edpb-adopts-final-guidelines-on-blockchain-and-personal-data-a-practical-guide-for-organisations).
- **DAC7**: primjenjivo ako marketplace čini app "platform operatorom" (povezivanje
  prodavatelja i kupaca uz poznatu naknadu) — godišnje izvještavanje Poreznoj upravi
  (izuzeće malih: <30 prodaja **i** <€2.000/god za robu). Plaćanje u EURe ne izuzima.
  Triggerira se tek kad marketplace **posreduje**, ne samo lista.
- **DAC8/CARF**: na snazi **1.1.2026**, ali obveze padaju na **reporting CASP-ove**;
  ne-CASP self-custody wallet izvan scopea. Ako marketplace naraste u DAC7 teritorij,
  relevantan je DAC7, ne DAC8.
  Izvori: [MDDP](https://www.mddp.pl/crypto-transaction-reporting-from-2026-what-should-you-know-about-dac8/),
  [AMLBot](https://blog.amlbot.com/eu-dac8-directive-explained-crypto-tax-reporting-rules-for-casps/).
- **"0% naknade" tvrdnje**: UCPD (2005/29/EC) Annex I t. 20 blacklista "besplatno" sa
  skrivenim troškovima. "Zero-fee transferi" obranjivo samo ako korisnik stvarno ne
  snosi trošak (gas sponzoriran, bez spreada); disclosati tko plaća gas i da Monerium
  koraci mogu imati svoje naknade.

### Regulatorni verdikt po featureu

| Feature                           | Status                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Self-custody EURe wallet          | Čisto — nije CASP (settled)                                                                                                       |
| Sponzorirani gas/relayer          | Vjerojatno OK; relayer ne-diskrecijski, user-signed — **otvorena interpretacija, dokumentirati arhitekturu**                      |
| Payment linkovi/QR (payer-signed) | OK kao softver; nikad ne posredovati sredstva                                                                                     |
| Monerium IBAN onramp widget       | OK ako korisnik ugovara direktno s Moneriumom; referral fee OK                                                                    |
| Političke donacije                | Najveće trenje: bez anonimnosti, cap €3.981,68, bez posrednika, poseban račun u banci — direktna on-chain donacija nije compliant |
| Marketplace                       | Nije CASP tema; triggerira Fisk 2.0 kod trgovaca + potencijalno DAC7 kod nas                                                      |
| Ticketing P2P                     | Nije crypto-trading; consumer law + sektorska pravila                                                                             |
| Debitna kartica                   | Samo preko licenciranog partnera (Gnosis Pay pattern) — airKUNA = distributer/brand                                               |

### Otvorene stavke za praćenje

1. Formalne ESMA/EBA smjernice o frontendima/RTO i relayerima (zasad samo ESMA working
   paper 8/2024).
2. Fiskalizacija 2.0 tretman kripta kao načina plaćanja u tehničkim specifikacijama
   Porezne uprave.
3. Najavljeni redraft HR zakona o financiranju političkih aktivnosti (e-savjetovanja
   nacrt postoji).
4. PSD3/PSR finalni tekst u OJ (H2 2026).
5. Aktualni home regulator Moneriuma (FME vs FIN-FSA) — provjeriti prije pravnih
   dokumenata.
