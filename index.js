/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('remark-contributors').Contributor} Contributor
 * @typedef {import('remark-contributors').ContributorObject} ContributorObject
 *
 * @typedef Options
 *   Configuration.
 * @property {string|Contributor[]} [contributors]
 *   List of contributors to inject.
 *   Defaults to the `contributors` field in the closest `package.json` upwards
 *   from the processed file, if there is one.
 *   Supports the string form (`name <email> (url)`) as well.
 *   Fails if no contributors are found or given.
 * @property {boolean} [appendIfMissing=false]
 *   Inject the section if there is none.
 * @property {string} [cwd]
 *   Working directory from which to resolve a `contributors` module, if any.
 * @property {number} [limit=0]
 *   Limit the rendered contributors.
 *   A limit of `0` (or lower) includes all contributors.
 *   If `limit` is given, only the top `<limit>` contributors, sorted by commit
 *   count, are rendered.
 */

import process from 'node:process'
import path from 'node:path'
// @ts-expect-error: untyped.
import gitContributors from 'contributors-from-git'
import remarkContributors from 'remark-contributors'
import {read} from 'to-vfile'
import {findUpOne} from 'vfile-find-up'
import {loadPlugin} from 'load-plugin'
import {headingRange} from 'mdast-util-heading-range'
import parseAuthor from 'parse-author'
import dlv from 'dlv'
import {defaultFormatters} from './formatters.js'

const plugin = 'remark-git-contributors'
const noreply = '@users.noreply.github.com'
const headingExpression = /^contributors$/i
const idFields = ['email', 'name', 'github', 'social.url']

/**
 * Plugin to inject Git contributors into a markdown table.
 * Collects contributors from Git history, deduplicates them, augments it with
 * metadata found in options, a module, or `package.json` and calls
 * `remark-contributors` to render the markdown table.
 *
 * @type {import('unified').Plugin<[(string|Options)?]|void[], Root>}
 * @returns {(node: Root, file: VFile) => Promise<void>}
 */
export default function remarkGitContributors(options = {}) {
  /**
   * @typedef {import('type-fest').PackageJson} PackageJson
   *
   * @typedef CleanContributor
   * @property {string} email
   * @property {number} commits
   * @property {string} name
   * @property {string|undefined} github
   * @property {{url: string, text: string}|undefined} social
   */

  const settings =
    typeof options === 'string' ? {contributors: options} : options

  return async function (root, file) {
    let found = false

    headingRange(root, headingExpression, () => {
      found = true
    })

    // Skip work if there's no Contributors heading.
    // remark-contributors also does this so this is an optimization.
    if (!found && !settings.appendIfMissing) {
      return
    }

    const cwd = path.resolve(settings.cwd || file.cwd)
    // Else is for stdin, typically not used.
    /* c8 ignore next */
    const base = file.dirname ? path.resolve(cwd, file.dirname) : cwd
    const indices = await indexContributors(cwd, settings.contributors)
    const pkgFile = await findUpOne('package.json', base)
    /** @type {PackageJson} */
    let pkg = {}

    if (pkgFile) {
      await read(pkgFile)
      pkg = JSON.parse(String(pkgFile))
    }

    // @ts-expect-error: indexable.
    indexContributor(indices, pkg.author)

    if (Array.isArray(pkg.contributors)) {
      let index = -1
      while (++index < pkg.contributors.length) {
        indexContributor(indices, pkg.contributors[index])
      }
    }

    await new Promise((resolve, reject) => {
      gitContributors(cwd, ongitcontributors)

      /**
       * @param {Error|null} error
       * @param {Array.<{name: string, email: string, commits: number}>} gitContributors
       */
      // eslint-disable-next-line complexity
      function ongitcontributors(error, gitContributors) {
        if (error) {
          if (/does not have any commits yet/.test(String(error))) {
            file.message(
              'could not get Git contributors as there are no commits yet',
              undefined,
              `${plugin}:no-commits`
            )
            resolve(undefined)
            return
          }

          reject(new Error('Could not get Git contributors: ' + error.message))
          return
        }

        /** @type {Map<string, Map<string, CleanContributor>>} */
        const idFieldToMap = new Map()

        /** @type {CleanContributor[]} */
        let contributors = []
        let index = -1

        while (++index < gitContributors.length) {
          const {name, email, commits} = gitContributors[index]

          if (!email) {
            file.message(
              `no git email for ${name}`,
              undefined,
              `${plugin}:require-git-email`
            )
            continue
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
            continue
          }

          /** @type {CleanContributor['social']} */
          let social

          if (metadata.twitter) {
            const handle = (
              String(metadata.twitter).split(/@|\//).pop() || ''
            ).trim()

            if (handle) {
              social = {
                url: 'https://twitter.com/' + handle,
                text: '@' + handle + '@twitter'
              }
            } else {
              file.message(
                `invalid twitter handle for ${email}`,
                undefined,
                `${plugin}:valid-twitter`
              )
            }
          } else if (metadata.mastodon) {
            const array = String(metadata.mastodon).split('@').filter(Boolean)
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
                undefined,
                `${plugin}:valid-mastodon`
              )
            }
          } else {
            file.info(
              `no social profile for ${email}`,
              undefined,
              `${plugin}:social`
            )
          }

          /** @type {CleanContributor} */
          const contributor = {
            email,
            commits,
            name: String(metadata.name || name),
            github: String(metadata.github || '') || undefined,
            social
          }
          // Whether an existing contributor was found that matched an id field.
          let found = false
          let idIndex = -1

          while (++idIndex < idFields.length) {
            const idField = idFields[idIndex]
            /** @type {unknown} */
            const id = dlv(contributor, idField)

            if (typeof id === 'string') {
              let idToContributor = idFieldToMap.get(idField)

              if (!idToContributor) {
                idToContributor = new Map()
                idFieldToMap.set(idField, idToContributor)
              }

              const existingContributor = idToContributor.get(id)

              if (existingContributor) {
                existingContributor.commits += contributor.commits
                found = true
                break
              }

              idToContributor.set(id, contributor)
            }
          }

          if (!found) {
            contributors.push(contributor)
          }
        }

        contributors.sort(
          (a, b) => b.commits - a.commits || a.name.localeCompare(b.name)
        )

        if (settings.limit && settings.limit > 0) {
          contributors = contributors.slice(0, settings.limit)
        }

        const formatters = Object.assign({}, defaultFormatters)

        // Exclude GitHub column if all cells would be empty
        if (contributors.every((c) => !c.github)) {
          formatters.github = {exclude: true}
        }

        // Exclude Social column if all cells would be empty
        if (contributors.every((c) => !c.social)) {
          formatters.social = {exclude: true}
        }

        remarkContributors({
          contributors,
          formatters,
          appendIfMissing: settings.appendIfMissing,
          align: 'left'
        })(root, file).then(resolve, reject)
      }
    })
  }
}

/**
 * @param {string} cwd
 * @param {Contributor[]|string|undefined} contributors
 */
async function indexContributors(cwd, contributors) {
  /** @type {Record<string, Record<string, ContributorObject>>} */
  const indices = {email: {}, github: {}, name: {}}

  if (contributors === null || contributors === undefined) {
    return indices
  }

  if (typeof contributors === 'string') {
    const exported =
      /** @type {{contributors?: Contributor[], default?: Contributor[]}} */ (
        await loadPlugin(contributors, {cwd: [cwd, process.cwd()], key: false})
      )

    if (Array.isArray(exported.contributors)) {
      contributors = exported.contributors
    } else if (Array.isArray(exported.default)) {
      contributors = exported.default
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

  // Chromium coverage bug on Node 12.
  /* c8 ignore next 2 */
  return indices
}

/**
 * @param {Record<string, Record<string, ContributorObject>>} indices
 * @param {Contributor} contributor
 */
function indexContributor(indices, contributor) {
  /** @type {ContributorObject} */
  // @ts-expect-error: `parseAuthor` result is indexable.
  const contributorObject =
    typeof contributor === 'string'
      ? parseAuthor(contributor)
      : Object.assign({}, contributor)

  /** @type {unknown[]} */
  // @ts-expect-error: assume array.
  const emails = [...(contributorObject.emails || [])]

  if (contributorObject.email) {
    emails.push(contributorObject.email)
  }

  for (const email of emails) {
    indexValue(indices.email, email, contributorObject)
  }

  indexValue(indices.github, contributorObject.github, contributorObject)
  indexValue(indices.name, contributorObject.name, contributorObject)
}

/**
 * @param {Record<string, ContributorObject>} index
 * @param {unknown} raw
 * @param {ContributorObject} contributor
 */
function indexValue(index, raw, contributor) {
  if (raw) {
    const value = String(raw).toLowerCase()

    if (index[value]) {
      // Merge in place
      Object.assign(contributor, index[value])
    }

    index[value] = contributor
  }
}
