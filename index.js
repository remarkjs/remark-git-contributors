'use strict'

const gitContributors = require('git-contributors').GitContributors
const injectContributors = require('remark-contributors')
const resolve = require('resolve')
const heading = require('mdast-util-heading-range')
const visit = require('unist-util-visit')
const parseAuthor = require('parse-author')
const path = require('path')
const fs = require('fs')
const plugin = require('./package.json').name
const headers = require('./headers')

const RE = /^contributors$/i

module.exports = function attacher (opts) {
  if (typeof opts === 'string') {
    opts = { contributors: opts }
  } else if (!opts) {
    opts = {}
  }

  return function transform (root, file, callback) {
    if (!hasHeading(root, RE)) {
      return callback()
    }

    const cwd = path.resolve(opts.cwd || file.cwd || '.')
    const indices = indexContributors(cwd, opts.contributors)
    const pkg = maybePackage(cwd)

    indexContributor(indices, pkg.author)

    if (Array.isArray(pkg.contributors)) {
      pkg.contributors.forEach(indexContributor.bind(null, indices))
    }

    gitContributors.list(cwd, function (err, contributors) {
      if (err) return callback(err)

      contributors = contributors.map(({ name, email, commits }) => {
        if (!email) {
          file.warn(`no git email for ${name}`, null, `${plugin}:require-git-email`)
          return
        }

        const metadata = indices.email[email] ||
          indices.name[name.toLowerCase()] || {}

        if (email.endsWith('@users.noreply.github.com')) {
          metadata.github = email.slice(0, -25).replace(/^[\d]+\+/, '')
          indexValue(indices.github, metadata.github, metadata)
        }

        if (email.endsWith('@greenkeeper.io') ||
          name === 'Greenkeeper' ||
          metadata.github === 'greenkeeper[bot]' ||
          metadata.github === 'greenkeeperio-bot') {
          return
        }

        return {
          email,
          commits,
          name: metadata.name || name,
          github: metadata.github,
          twitter: metadata.twitter,
          mastodon: metadata.mastodon
        }
      })

      contributors = contributors
        .filter(Boolean)
        .reduce(dedup(['email', 'name', 'github', 'twitter', 'mastodon']), [])
        .sort((a, b) => b.commits - a.commits)

      if (opts.limit && opts.limit > 0) {
        contributors = contributors.slice(0, opts.limit)
      }

      const customHeaders = Object.assign({}, headers)

      // Remove GitHub column if all cells would be empty
      if (contributors.every(c => !c.github)) {
        delete customHeaders.github
      }

      // Remove Social column if all cells would be empty
      if (contributors.every(c => !c.twitter && !c.mastodon)) {
        delete customHeaders.social
      }

      injectContributors({
        contributors,
        headers: customHeaders,
        align: 'left'
      })(root, file)

      // TODO: The "align" option above has no effect until hughsk/remark-contributors#11 lands.
      // When it does, remove the following hack (as well as the unist-util-visit dependency).
      visit(root, 'table', function (node, index, parent) {
        const prev = parent && parent.children[index - 1]

        if (prev && prev.type === 'heading') {
          const child = prev.children && prev.children[0]

          if (child && child.type === 'text' && RE.test(child.value)) {
            node.align = new Array(Object.keys(customHeaders).length).fill('left')
          }
        }
      })

      callback()
    })
  }
}

function maybePackage (cwd) {
  try {
    const json = fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')
    return JSON.parse(json)
  } catch (err) {
    return {}
  }
}

function dedup (keys) {
  const map = new Map(keys.map(key => [key, new Map()]))

  return function (acc, contributor) {
    for (let key of keys) {
      if (contributor[key]) {
        const index = map.get(key)

        if (index.has(contributor[key])) {
          index.get(contributor[key]).commits += contributor.commits
          return acc
        }

        index.set(contributor[key], contributor)
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
