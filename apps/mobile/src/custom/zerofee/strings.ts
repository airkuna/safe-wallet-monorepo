/**
 * Zero-fee (A3) copy na jednom mjestu — hrvatski, sentence case, bez emojija
 * ([15 — airKUNA] §7). "Bez naknade" se tvrdi ISKLJUČIVO kad je relay put
 * aktivan; fallback copy pošteno kaže da mrežnu naknadu plaća korisnikov
 * potpisni ključ — nikakva "0%" tvrdnja kad put nije dostupan.
 */
export const zfStrings = {
  relay: {
    title: 'Bez naknade',
    subtitle: 'Mrežnu naknadu plaćamo umjesto tebe',
    freeLabel: 'Bez naknade',
    remainingToday: (remaining: number) => `još ${remaining} danas`,
    unavailable:
      'Dnevna kvota besplatnih transakcija je iskorištena i obnavlja se unutar jednog dana. Do tada mrežnu naknadu plaća tvoj potpisni ključ.',
  },
}
