/**
 * Web stub: react-native-pager-view je native komponenta (Fabric) bez web
 * implementacije. Za preview renderira aktivnu stranicu; imperativni API je
 * no-op osim setPage koji mijenja prikazanu stranicu.
 */
const React = require('react')
const { View } = require('react-native')

const PagerView = React.forwardRef(function PagerView(props, ref) {
  const { children, initialPage = 0, style, onPageSelected } = props
  const [page, setPage] = React.useState(initialPage)

  React.useImperativeHandle(ref, () => ({
    setPage: (next) => {
      setPage(next)
      if (onPageSelected) {
        onPageSelected({ nativeEvent: { position: next } })
      }
    },
    setPageWithoutAnimation: (next) => setPage(next),
    setScrollEnabled: () => {},
  }))

  const pages = React.Children.toArray(children)
  return React.createElement(View, { style: [{ flex: 1 }, style] }, pages[page] ?? pages[0] ?? null)
})

module.exports = PagerView
module.exports.default = PagerView
