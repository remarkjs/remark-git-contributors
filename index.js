'use strict'

const githubFromPackage = require('github-from-package')
const getContributors = require('github-contributors')
const injectContributors = require('remark-contributors')
const parallel = require('run-parallel')
const GitHub = require('github-base')
const resolve = require('resolve')
const heading = require('mdast-util-heading-range')
const parseAuthor = require('parse-author')
const path = require('path')
const fs = require('fs')
const plugin = require('./package.json').name

module.exports = function attacher (opts) {
  if (typeof opts === 'string') {
    opts = { contributors: opts }
  } else if (!opts) {
    opts = {}
  }

  // Required scopes: public_repo, read:user
  const token = opts.token || process.env.GITHUB_TOKEN

  return function transform (root, file, callback) {
    if (!token) {
      file.info('skipping: no github token provided', null, `${plugin}:require-token`)
      return callback()
    }

    if (!hasHeading(root, /^contributors$/i)) {
      file.info('skipping: no contributors heading found', null, `${plugin}:require-heading`)
      return callback()
    }

    const cwd = path.resolve(opts.cwd || file.cwd || '.')
    const meta = getMetadata(cwd, file, opts.contributors)
    const json = fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')
    const pkg = JSON.parse(json)
    const slug = githubFromPackage(pkg).split('/').slice(-2).join('/')
    const github = new GitHub({ token })

    addMetadata(meta, pkg.author)

    if (Array.isArray(pkg.contributors)) {
      pkg.contributors.forEach(addMetadata.bind(null, meta))
    }

    getContributors(slug, { token }, function (err, contributors) {
      if (err) return callback(err)

      if (file.stem && file.stem.toLowerCase() === 'readme') {
        contributors = contributors.slice(0, 10)
      }

      const tasks = contributors.map(({ login }) => {
        return function (next) {
          github.get(`/users/${login}`, function (err, res) {
            if (err) return next(err)

            const extra = meta[login] || {}
            const name = extra.name || res.name

            let twitter = extra.twitter

            // TODO: not supported by remark-contributors. It supports custom
            // headers, but not with links or @mentions or other formatting.
            let mastodon = extra.mastodon

            if (!twitter && /^https?:\/\/twitter\.com/.test(res.blog)) {
              twitter = res.blog
            }

            if (!twitter && !mastodon) {
              file.warn(`no social profile for @${login}`, null, `${plugin}:social`)
            }

            next(null, { name, github: login, twitter })
          })
        }
      })

      parallel(tasks, function (err, contributors) {
        if (err) return callback(err)

        injectContributors({ contributors })(root, file)
        callback()
      })
    })
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
function getMetadata (cwd, file, contributors) {
  if (contributors == null) {
    return {}
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
      return getMetadata(cwd, file, contributors.contributors)
    }

    const obj = contributors
    contributors = []

    for (let [key, contributor] of Object.entries(obj)) {
      if (!contributor.github) {
        // Assume that `key` is GitHub username
        contributor = Object.assign({}, contributor, { github: key })
      }

      contributors.push(contributor)
    }
  }

  const meta = {}

  for (let contributor of contributors) {
    if (contributor.github) {
      meta[contributor.github] = contributor
    } else {
      const reason = `no github username in ${JSON.stringify(contributor)}`
      const origin = `${plugin}:require-github-username`

      file.warn(reason, null, origin)
    }
  }

  return meta
}

function addMetadata (meta, contributor) {
  if (typeof contributor === 'string') {
    contributor = parseAuthor(contributor)
  }

  const github = contributor && contributor.github

  if (github) {
    meta[github] = Object.assign({}, meta[github], contributor)
  }
}
