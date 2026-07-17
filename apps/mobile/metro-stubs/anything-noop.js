/**
 * Web stub "anything": univerzalni no-op za native-only pakete (Firebase
 * messaging, notifee...) u web previewu. Svaki named export postoji, sve je
 * pozivno, sve vraća isti proxy; `await` na njemu vraća proxy (then je
 * namjerno undefined da ne bude thenable). Usporedbe enum vrijednosti daju
 * false, što se ponaša kao "nije autorizirano / nema notifikacija".
 */
function makeAnything() {
  const callable = function anythingNoop() {
    return makeAnything()
  }
  return new Proxy(callable, {
    get(_target, prop) {
      if (prop === '__esModule') {
        return true
      }
      if (prop === Symbol.toPrimitive || prop === Symbol.iterator) {
        return undefined
      }
      if (prop === 'then') {
        // Ponaša se kao Promise.resolve(undefined): await i eksplicitni
        // .then(cb) rade; pozivatelji tretiraju undefined kao "ništa".
        return (onFulfilled) =>
          Promise.resolve().then(() => (typeof onFulfilled === 'function' ? onFulfilled(undefined) : undefined))
      }
      if (prop === 'catch' || prop === 'finally') {
        return () => makeAnything()
      }
      return makeAnything()
    },
    apply() {
      return makeAnything()
    },
    construct() {
      return {}
    },
  })
}

const anything = makeAnything()

module.exports = anything
