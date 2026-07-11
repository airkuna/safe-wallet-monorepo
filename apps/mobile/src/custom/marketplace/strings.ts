/**
 * Sav Tržnica UI copy na jednom mjestu (hrvatski — ciljana publika su
 * hrvatski mali poduzetnici i njihovi kupci). Ekrani ne smiju sadržavati
 * inline stringove; buduća i18n = zamjena ovog modula. Sentence case.
 */
export const mpStrings = {
  tabTitle: 'Tržnica',
  hub: {
    title: 'Tržnica',
    subtitle: 'Domaći proizvodi, plaćanje izravno trgovcu — bez posrednika u novcu.',
    visitStore: 'Otvori trgovinu',
    yourStoreHere: 'Tvoja trgovina ovdje',
    yourStoreHereDesc: 'Prodaješ vlastite proizvode? Tržnica je otvorena za male hrvatske brandove.',
    myOrders: 'Moje narudžbe',
  },
  store: {
    products: 'Modeli',
    aboutSeller: 'O trgovcu',
    notOnchain: 'Trgovina još nije aktivirana za plaćanje u aplikaciji',
    web: 'Web',
    oib: 'OIB',
  },
  product: {
    size: 'Veličina',
    quantity: 'Količina',
    order: 'Naruči',
    material: 'Materijal',
    priceEach: 'po komadu',
  },
  checkout: {
    title: 'Narudžba',
    delivery: 'Podaci za dostavu',
    fullName: 'Ime i prezime',
    street: 'Ulica i kućni broj',
    postalCodeAndCity: 'Poštanski broj i mjesto',
    email: 'E-mail',
    phone: 'Telefon (nije obvezno)',
    summary: 'Sažetak',
    items: 'Proizvodi',
    shipping: 'Dostava',
    shippingFree: 'Besplatna',
    total: 'Ukupno',
    pay: 'Plati',
    noActiveAccount: 'Za plaćanje prvo otvori ili uveži račun u aplikaciji.',
    storeInactive: 'Ova trgovina još ne prima plaćanja u aplikaciji.',
    invoiceNote: 'Račun za kupnju izdaje trgovac i šalje ga na tvoj e-mail uz pošiljku.',
  },
  orders: {
    title: 'Moje narudžbe',
    empty: 'Još nemaš narudžbi.',
    reference: 'Referenca',
    status: { pending: 'Čeka slanje trgovcu', sent: 'Poslano trgovcu' },
    share: 'Pošalji narudžbu trgovcu',
    shareHint: 'Nakon plaćanja pošalji trgovcu podatke narudžbe da može poslati paket i izdati račun.',
  },
} as const
