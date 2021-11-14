/**
 * @typedef {import('remark-contributors').FormatterObject} FormatterObject
 */

/**
 * @type {Record<string, FormatterObject>}
 */
export const defaultFormatters = {
  email: {exclude: true},
  commits: {exclude: true},
  social: {
    label: 'Social',
    format(value) {
      const object = /** @type {{url: string, text: string}|undefined} */ (
        value
      )

      // Shouldn’t happen, but let’s keep it here just to be sure.
      /* c8 ignore next 3 */
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
    }
  }
}
