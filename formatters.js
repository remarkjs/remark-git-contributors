'use strict'

exports.email = {
  exclude: true
}

exports.commits = {
  exclude: true
}

exports.social = {
  label: 'Social',
  format: function (value, key) {
    /* istanbul ignore if - shouldn’t happen, but let’s keep it here just to be sure. */
    if (!value) {
      return ''
    }

    return {
      type: 'link',
      url: value.url,
      children: [{
        type: 'strong',
        children: [{ type: 'text', value: value.text }]
      }]
    }
  }
}
