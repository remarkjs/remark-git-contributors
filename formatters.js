'use strict'

exports.email = {
  exclude: true
}

exports.commits = {
  exclude: true
}

exports.social = {
  label: 'Social',
  format(value) {
    // Shouldn’t happen, but let’s keep it here just to be sure.
    /* c8 ignore next 3 */
    if (!value) {
      return ''
    }

    return {
      type: 'link',
      url: value.url,
      children: [
        {
          type: 'strong',
          children: [{type: 'text', value: value.text}]
        }
      ]
    }
  }
}
