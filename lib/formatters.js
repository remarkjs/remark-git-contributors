/**
 * @typedef {import('remark-contributors').FormatterObject} FormatterObject
 * @typedef {import('./index.js').Social} Social
 */

/**
 * Default formatters.
 *
 * @type {Readonly<Record<string, Readonly<FormatterObject>>>}
 */
export const defaultFormatters = {
  email: {exclude: true},
  commits: {exclude: true},
  social: {
    format(value) {
      const object = /** @type {Social | undefined} */ (value)

      /* c8 ignore next 3 -- shouldn’t happen, but let’s keep it here just to be sure. */
      if (!object) {
        return ''
      }

      return {
        type: 'link',
        url: object.url,
        children: [
          {type: 'strong', children: [{type: 'text', value: object.text}]}
        ]
      }
    },
    label: 'Social'
  }
}
