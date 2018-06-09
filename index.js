'use strict'

const gitContributors = require('git-contributors').GitContributors
const injectContributors = require('remark-contributors')
const resolve = require('resolve')
const heading = require('mdast-util-heading-range')
const parseAuthor = require('parse-author')
const path = require('path')
const fs = require('fs')
const plugin = require('./package.json').name
const headers = require('./headers')

module.exports = function attacher (opts) {
  if (typeof opts === 'string') {
    opts = { contributors: opts }
  } else if (!opts) {
    opts = {}
  }

  return function transform (root, file, callback) {
    if (!hasHeading(root, /^contributors$/i)) {
      file.info('skipping: no contributors heading found', null, `${plugin}:require-heading`)
      return callback()
    }

    const cwd = path.resolve(opts.cwd || file.cwd || '.')
    const indices = indexContributors(cwd, opts.contributors)
    const json = fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')
    const pkg = JSON.parse(json)

    indexContributor(indices, pkg.author)

    if (Array.isArray(pkg.contributors)) {
      pkg.contributors.forEach(indexContributor.bind(null, indices))
    }

    gitContributors.list(cwd, function (err, contributors) {
      if (err) return callback(err)

      if (file.stem && file.stem.toLowerCase() === 'readme') {
        contributors = contributors.slice(0, 10)
      }

      contributors = contributors.map(({ name, email }) => {
        if (!email) {
          file.warn(`no git email for ${name}`, null, `${plugin}:require-git-email`)
          return
        }

        const metadata = indices.email[email] || {}

        if (email.endsWith('@users.noreply.github.com')) {
          metadata.github = email.slice(0, -25)
          indexValue(indices.github, metadata.github, metadata)
        }

        return {
          email,
          name: metadata.name || name,
          github: metadata.github,
          twitter: metadata.twitter,
          mastodon: metadata.mastodon
        }
      })

      contributors = contributors
        .filter(Boolean)
        .filter(dedup(['email', 'github', 'twitter', 'mastodon']))

      injectContributors({ contributors, headers })(root, file)
      callback()
    })
  }
}

function dedup (keys) {
  const map = new Map(keys.map(key => [key, new Set()]))

  return function (contributor) {
    for (let key of keys) {
      if (contributor[key]) {
        const seen = map.get(key)
        if (seen.has(contributor[key])) return false
        seen.add(contributor[key])
      }
    }

    return true
  }
}

function hasHeading (tree, test) {
  let found = false

  heading(tree, test, function () {
    found = true
  })

  return found
}

// Supports:
// - module (path or id)
// - nested object: { contributors }
// - array of contributors
// - object of contributors (key is assumed to be GitHub username)
function indexContributors (cwd, contributors) {
  const indices = {
    email: {},
    github: {}
  }

  if (contributors == null) {
    return indices
  }

  if (typeof contributors === 'string') {
    let path

    try {
      path = resolve.sync(contributors, { basedir: cwd })
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') throw err

      // Fallback to process.cwd()
      path = resolve.sync(contributors, { basedir: process.cwd() })
    }

    contributors = require(path)
  }

  if (typeof contributors === 'object' && !Array.isArray(contributors)) {
    if (contributors.contributors) {
      return indexContributors(cwd, contributors.contributors)
    }

    const obj = contributors
    contributors = []

    for (let [key, contributor] of Object.entries(obj)) {
      // TODO: remove this once new level-community is out
      if (!contributor.github) {
        // Assume that `key` is GitHub username
        contributor = Object.assign({}, contributor, { github: key })
      }

      contributors.push(contributor)
    }
  }

  for (let contributor of contributors) {
    indexContributor(indices, contributor)
  }

  return indices
}

function indexContributor (indices, contributor) {
  if (typeof contributor === 'string') {
    contributor = parseAuthor(contributor)
  } else {
    contributor = Object.assign({}, contributor)
  }

  const emails = (contributor.emails || []).concat(contributor.email || [])

  for (let email of emails) {
    indexValue(indices.email, email, contributor)
  }

  indexValue(indices.github, contributor.github, contributor)
}

function indexValue (index, value, contributor) {
  if (value) {
    if (index[value]) {
      // Merge in place
      Object.assign(contributor, index[value])
    }

    index[value] = contributor
  }
}
