/**
 * Sav donacijski UI copy na jednom mjestu (hrvatski, sentence case, bez
 * emojija — airKUNA brand smjernice, [15] §7). Ekrani ne smiju sadržavati
 * inline stringove; buduća i18n = zamjena ovog modula.
 */
export const donStrings = {
  tabTitle: 'Doniraj',
  screen: {
    title: 'Doniraj',
    subtitle: 'Podrži kampanju na domovina.ai — izravno na njezin račun, bez posrednika i bez naknada.',
    slugLabel: 'Kampanja',
    slugPlaceholder: 'Slug kampanje ili link (domovina.ai/c/…)',
    find: 'Pronađi kampanju',
    searching: 'Tražim kampanju…',
    notFound: 'Kampanja nije pronađena — provjeri slug ili link.',
    unreachable: 'Backend nije dostupan — pokušaj ponovno.',
    notConfigured: 'Ovaj brand nema konfigurirane donacije.',
    noOnchain: 'Ova kampanja trenutno ne prima donacije u aplikaciji.',
    raised: 'Prikupljeno',
    goal: 'Cilj',
    amountLabel: 'Iznos (EUR)',
    amountPlaceholder: 'npr. 10,00',
    // {min} se zamjenjuje formatiranim najmanjim iznosom kampanje.
    minAmount: 'Najmanji iznos donacije je {min} EUR.',
    donate: 'Doniraj',
    noActiveAccount: 'Za donaciju prvo otvori ili uveži račun u aplikaciji.',
    directNote: 'Doniraš izravno na račun kampanje — donacija se na zidu podrške knjiži automatski.',
  },
  history: {
    title: 'Tvoje donacije',
    syncing: 'Provjeravam donacije…',
    status: {
      initiated: 'Plaćanje pokrenuto',
      pending: 'Čeka potvrdu',
      confirmed: 'Proknjižena',
    },
  },
} as const
