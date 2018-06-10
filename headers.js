'use strict'

const plugin = require('./package.json').name

exports.name = true
exports.github = true

exports.social = {
  label: 'Social',
  format: function (value, contrib, key, file) {
    if (contrib.twitter) {
      const handle = contrib.twitter.split(/@|\//).pop().trim()

      if (!handle) {
        const msg = `invalid twitter handle for ${contrib.email}`
        file.warn(msg, null, `${plugin}:valid-twitter`)
        return
      }

      return {
        type: 'link',
        url: 'https://twitter.com/' + handle,
        children: [{
          type: 'strong',
          children: [{ type: 'text', value: '@' + handle + '@twitter' }]
        }]
      }
    } else if (contrib.mastodon) {
      const arr = contrib.mastodon.split('@').filter(Boolean)

      if (arr.length !== 2) {
        const msg = `invalid mastodon handle for ${contrib.email}`
        file.warn(msg, null, `${plugin}:valid-mastodon`)
        return
      }

      const domain = arr[1]
      const handle = arr[0]

      return {
        type: 'link',
        url: 'https://' + domain+ '/@' + handle,
        children: [{
          type: 'strong',
          children: [{ type: 'text', value: '@' + handle + '@' + domain }]
        }]
      }
    } else {
      file.warn(`no social profile for ${contrib.email}`, null, `${plugin}:social`)
    }
  }
}
