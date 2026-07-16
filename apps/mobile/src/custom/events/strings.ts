/**
 * Sav Događaji UI copy na jednom mjestu (hrvatski — pilot publika su domaći
 * posjetitelji i organizatori). Ekrani ne smiju sadržavati inline stringove;
 * buduća i18n = zamjena ovog modula. Sentence case.
 */
export const evStrings = {
  tabTitle: 'Događaji',
  hub: {
    title: 'Događaji',
    subtitle: 'Ulaznice izravno od organizatora — bez posrednika i bez naknada.',
    myTickets: 'Moje ulaznice',
    announced: 'Uskoro',
    yourEventHere: 'Tvoj događaj ovdje',
    yourEventHereDesc: 'Organiziraš konferenciju, koncert ili meetup? Prodaja ulaznica bez ijedne naknade.',
  },
  event: {
    tickets: 'Ulaznice',
    aboutOrganizer: 'Organizator',
    date: 'Datum',
    dateTba: 'Termin uskoro',
    venue: 'Lokacija',
    web: 'Web',
    email: 'E-mail',
    notOnchain: 'Ovaj događaj još ne prima plaćanja u aplikaciji.',
    noTiers: 'Prodaja ulaznica još nije počela.',
    buy: 'Kupi',
    saleClosed: 'Prodaja zatvorena',
    named: 'Glasi na ime',
  },
  checkout: {
    title: 'Kupnja ulaznica',
    quantity: 'Broj ulaznica',
    holders: 'Na čije ime glase ulaznice?',
    holderName: 'Ime i prezime',
    holderEmail: 'E-mail (nije obvezno)',
    ticketLabel: 'Ulaznica',
    summary: 'Sažetak',
    total: 'Ukupno',
    pay: 'Plati',
    noActiveAccount: 'Za plaćanje prvo otvori ili uveži račun u aplikaciji.',
    eventInactive: 'Ovaj događaj još ne prima plaćanja u aplikaciji.',
    directNote: 'Plaćaš izravno organizatoru na njegov račun — bez posrednika i bez dodatnih naknada.',
  },
  tickets: {
    title: 'Moje ulaznice',
    empty: 'Još nemaš ulaznica.',
    reference: 'Referenca',
    status: { pending: 'Plaćanje nije dovršeno', 'paid-unverified': 'Plaćeno — čeka potvrdu organizatora' },
    share: 'Pošalji narudžbu organizatoru',
    shareHint:
      'Nakon plaćanja pošalji organizatoru podatke narudžbe s referencom — ulaznice s QR kodom stižu u aplikaciju s potvrdom uplate.',
  },
} as const
