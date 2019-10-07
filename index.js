'use strict'

const gitContributors = require('contributors-from-git')
const injectContributors = require('remark-contributors')
const resolve = require('resolve')
const heading = require('mdast-util-heading-range')
const parseAuthor = require('parse-author')
const deep = require('deep-dot')
const path = require('path')
const fs = require('fs')
const plugin = require('./package.json').name
const defaultFormatters = require('./formatters')

var noreply = '@users.noreply.github.com'

const headingExpression = /^contributors$/i

module.exports = function attacher (opts) {
  if (typeof opts === 'string') {
    opts = { contributors: opts }
  } else if (!opts) {
    opts = {}
  }

  return function transform (root, file, callback) {
    // Skip work if there's no Contributors heading. This is merely
    // an optimization, because remark-contributors also does this.
    if (!hasHeading(root, headingExpression) && !opts.appendIfMissing) {
      return process.nextTick(callback)
    }

    const cwd = path.resolve(opts.cwd || file.cwd)
    const pkg = maybePackage(cwd)
    let indices

    try {
      indices = indexContributors(cwd, opts.contributors)
    } catch (err) {
      return process.nextTick(callback, err)
    }

    indexContributor(indices, pkg.author)

    if (Array.isArray(pkg.contributors)) {
      pkg.contributors.forEach(indexContributor.bind(null, indices))
    }

    gitContributors(cwd, function (err, contributors) {
      if (err) {
        if (/does not have any commits yet/.test(err)) {
          file.message('could not get Git contributors as there are no commits yet', null, `${plugin}:no-commits`)
          callback()
          return
        }

        return callback(new Error('Could not get Git contributors: ' + err.message))
      }

      contributors = contributors.map(({ name, email, commits }) => {
        if (!email) {
          file.message(`no git email for ${name}`, null, `${plugin}:require-git-email`)
          return
        }

        const metadata = indices.email[email] ||
          indices.name[name.toLowerCase()] || {}

        if (email.endsWith(noreply)) {
          metadata.github = email.slice(0, -noreply.length).replace(/^[\d]+\+/, '')
          indexValue(indices.github, metadata.github, metadata)
        }

        if (email.endsWith('@greenkeeper.io') ||
          name === 'Greenkeeper' ||
          metadata.github === 'greenkeeper[bot]' ||
          metadata.github === 'greenkeeperio-bot') {
          return
        }

        let social = null

        if (metadata.twitter) {
          const handle = metadata.twitter.split(/@|\//).pop().trim()

          if (handle) {
            social = {
              url: 'https://twitter.com/' + handle,
              text: '@' + handle + '@twitter'
            }
          } else {
            file.message(`invalid twitter handle for ${email}`, null, `${plugin}:valid-twitter`)
          }
        } else if (metadata.mastodon) {
          const arr = metadata.mastodon.split('@').filter(Boolean)
          const handle = arr[0]
          const domain = arr[1]

          if (handle && domain) {
            social = {
              url: 'https://' + domain + '/@' + handle,
              text: '@' + handle + '@' + domain
            }
          } else {
            file.message(`invalid mastodon handle for ${email}`, null, `${plugin}:valid-mastodon`)
          }
        } else {
          file.info(`no social profile for ${email}`, null, `${plugin}:social`)
        }

        return {
          email,
          commits,
          name: metadata.name || name,
          github: metadata.github,
          social
        }
      })

      contributors = contributors
        .filter(Boolean)
        .reduce(dedup(['email', 'name', 'github', 'social.url']), [])
        .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name))

      if (opts.limit && opts.limit > 0) {
        contributors = contributors.slice(0, opts.limit)
      }

      const formatters = Object.assign({}, defaultFormatters)

      // Exclude GitHub column if all cells would be empty
      if (contributors.every(c => !c.github)) {
        formatters.github = false
      }

      // Exclude Social column if all cells would be empty
      if (contributors.every(c => !c.social)) {
        formatters.social = false
      }

      injectContributors({
        contributors,
        formatters,
        appendIfMissing: opts.appendIfMissing,
        align: 'left'
      })(root, file, callback)
    })
  }
}

function maybePackage (cwd) {
  try {
    const buf = fs.readFileSync(path.join(cwd, 'package.json'))
    return JSON.parse(buf)
  } catch (err) {
    return {}
  }
}

function dedup (keys) {
  const map = new Map(keys.map(key => [key, new Map()]))

  return function (acc, contributor) {
    for (const key of keys) {
      const value = deep(contributor, key)

      if (value) {
        const index = map.get(key)

        if (index.has(value)) {
          index.get(value).commits += contributor.commits
          return acc
        }

        index.set(value, contributor)
      }
    }

    acc.push(contributor)
    return acc
  }
}

function hasHeading (tree, test) {
  let found = false

  heading(tree, test, function () {
    found = true
  })

  return found
}

function indexContributors (cwd, contributors) {
  const indices = {
    email: {},
    github: {},
    name: {}
  }

  if (contributors == null) {
    return indices
  }

  if (typeof contributors === 'string') {
    let path

    try {
      path = resolve.sync(contributors, { basedir: cwd })
    } catch (err) {
      /* istanbul ignore if - Hard to test. */
      if (err.code !== 'MODULE_NOT_FOUND') throw err

      // Fallback to process.cwd()
      path = resolve.sync(contributors, { basedir: process.cwd() })
    }

    const exported = require(path)

    if (Array.isArray(exported)) {
      contributors = exported
    } else if (typeof exported === 'object' && exported !== null) {
      contributors = exported.contributors || exported.default
    }
  }

  if (!Array.isArray(contributors)) {
    throw new TypeError('The "contributors" option must be (or resolve to) an array')
  }

  for (const contributor of contributors) {
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

  for (const email of emails) {
    indexValue(indices.email, email, contributor)
  }

  indexValue(indices.github, contributor.github, contributor)
  indexValue(indices.name, contributor.name, contributor)
}

function indexValue (index, value, contributor) {
  if (value) {
    value = value.toLowerCase()

    if (index[value]) {
      // Merge in place
      Object.assign(contributor, index[value])
    }

    index[value] = contributor
  }
}
