import path from 'path'
import gitContributors from 'contributors-from-git'
import injectContributors from 'remark-contributors'
import {read} from 'to-vfile'
import {findUpOne} from 'vfile-find-up'
import resolve from 'resolve'
import {headingRange} from 'mdast-util-heading-range'
import parseAuthor from 'parse-author'
import dlv from 'dlv'
import {defaultFormatters} from './formatters.js'

const plugin = 'remark-git-contributors'
const noreply = '@users.noreply.github.com'
const headingExpression = /^contributors$/i

export default function remarkGitContributors(options) {
  if (typeof options === 'string') {
    options = {contributors: options}
  } else if (!options) {
    options = {}
  }

  return async function (root, file) {
    // Skip work if there's no Contributors heading.
    // remark-contributors also does this so this is an optimization.
    if (!hasHeading(root, headingExpression) && !options.appendIfMissing) {
      return
    }

    const cwd = path.resolve(options.cwd || file.cwd)
    // Else is for stdin, typically not used.
    /* c8 ignore next */
    const base = file.dirname ? path.resolve(cwd, file.dirname) : cwd
    const indices = await indexContributors(cwd, options.contributors)
    const pkgFile = await findUpOne('package.json', base)
    let pkg = {}

    if (pkgFile) {
      await read(pkgFile)
      pkg = JSON.parse(pkgFile)
    }

    indexContributor(indices, pkg.author)

    if (Array.isArray(pkg.contributors)) {
      let index = -1
      while (++index < pkg.contributors.length) {
        indexContributor(indices, pkg.contributors[index])
      }
    }

    await new Promise((resolve, reject) => {
      gitContributors(cwd, ongitcontributors)

      function ongitcontributors(error, contributors) {
        if (error) {
          if (/does not have any commits yet/.test(error)) {
            file.message(
              'could not get Git contributors as there are no commits yet',
              null,
              `${plugin}:no-commits`
            )
            resolve()
            return
          }

          reject(new Error('Could not get Git contributors: ' + error.message))
          return
        }

        contributors = contributors.map(({name, email, commits}) => {
          if (!email) {
            file.message(
              `no git email for ${name}`,
              null,
              `${plugin}:require-git-email`
            )
            return undefined
          }

          const metadata =
            indices.email[email] || indices.name[name.toLowerCase()] || {}

          if (email.endsWith(noreply)) {
            metadata.github = email
              .slice(0, -noreply.length)
              .replace(/^\d+\+/, '')
            indexValue(indices.github, metadata.github, metadata)
          }

          if (
            email.endsWith('@greenkeeper.io') ||
            name === 'Greenkeeper' ||
            metadata.github === 'greenkeeper[bot]' ||
            metadata.github === 'greenkeeperio-bot'
          ) {
            return undefined
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
              file.message(
                `invalid twitter handle for ${email}`,
                null,
                `${plugin}:valid-twitter`
              )
            }
          } else if (metadata.mastodon) {
            const array = metadata.mastodon.split('@').filter(Boolean)
            const handle = array[0]
            const domain = array[1]

            if (handle && domain) {
              social = {
                url: 'https://' + domain + '/@' + handle,
                text: '@' + handle + '@' + domain
              }
            } else {
              file.message(
                `invalid mastodon handle for ${email}`,
                null,
                `${plugin}:valid-mastodon`
              )
            }
          } else {
            file.info(
              `no social profile for ${email}`,
              null,
              `${plugin}:social`
            )
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

        if (options.limit && options.limit > 0) {
          contributors = contributors.slice(0, options.limit)
        }

        const formatters = Object.assign({}, defaultFormatters)

        // Exclude GitHub column if all cells would be empty
        if (contributors.every((c) => !c.github)) {
          formatters.github = false
        }

        // Exclude Social column if all cells would be empty
        if (contributors.every((c) => !c.social)) {
          formatters.social = false
        }

        injectContributors({
          contributors,
          formatters,
          appendIfMissing: options.appendIfMissing,
          align: 'left'
        })(root, file, (error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      }
    })
  }
}

function dedup(keys) {
  const map = new Map(keys.map((key) => [key, new Map()]))

  return function (acc, contributor) {
    for (const key of keys) {
      const value = dlv(contributor, key)

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

function hasHeading(tree, test) {
  let found = false

  headingRange(tree, test, () => {
    found = true
  })

  return found
}

async function indexContributors(cwd, contributors) {
  const indices = {
    email: {},
    github: {},
    name: {}
  }

  if (contributors === null || contributors === undefined) {
    return indices
  }

  if (typeof contributors === 'string') {
    let path

    try {
      path = resolve.sync(contributors, {basedir: cwd})
    } catch (error) {
      // Hard to test.
      /* c8 ignore next */
      if (error.code !== 'MODULE_NOT_FOUND') throw error

      // Fallback to process.cwd()
      path = resolve.sync(contributors, {basedir: process.cwd()})
    }

    const exported = (await import(path)).default

    if (Array.isArray(exported)) {
      contributors = exported
    } else if (typeof exported === 'object' && exported !== null) {
      contributors = exported.contributors || exported.default
    }
  }

  if (!Array.isArray(contributors)) {
    throw new TypeError(
      'The "contributors" option must be (or resolve to) an array'
    )
  }

  for (const contributor of contributors) {
    indexContributor(indices, contributor)
  }

  return indices
}

function indexContributor(indices, contributor) {
  contributor =
    typeof contributor === 'string'
      ? parseAuthor(contributor)
      : Object.assign({}, contributor)

  const emails = (contributor.emails || []).concat(contributor.email || [])

  for (const email of emails) {
    indexValue(indices.email, email, contributor)
  }

  indexValue(indices.github, contributor.github, contributor)
  indexValue(indices.name, contributor.name, contributor)
}

function indexValue(index, value, contributor) {
  if (value) {
    value = value.toLowerCase()

    if (index[value]) {
      // Merge in place
      Object.assign(contributor, index[value])
    }

    index[value] = contributor
  }
}
