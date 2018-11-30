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
    if (value) {
      return {
        type: 'link',
        url: value.url,
        children: [{
          type: 'strong',
          children: [{ type: 'text', value: value.text }]
        }]
      }
    } else {
      return ''
    }
  }
}
