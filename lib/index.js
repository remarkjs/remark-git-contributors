/**
 * @import {Root} from 'mdast'
 * @import {ContributorObject, Contributor} from 'remark-contributors'
 * @import {PackageJson} from 'type-fest'
 * @import {VFile} from 'vfile'
 */

/**
 * @typedef CleanContributor
 *   Contributor with cleaned up data.
 * @property {number} commits
 *   Number of commits.
 * @property {string} email
 *   Email.
 * @property {string | undefined} github
 *   GitHub username.
 * @property {string} name
 *   Name.
 * @property {Social | undefined} social
 *   Social profile.
 *
 * @typedef RawContributor
 *   Contributor found by `contributorsFromGit`.
 * @property {number} commits
 *   Number of commits.
 * @property {string} name
 *   Name.
 * @property {string} email
 *   Email.
 *
 * @typedef ContributorsModule
 *   Contributors module.
 * @property {Array<Contributor> | null | undefined} [contributors]
 *   Named export.
 * @property {Array<Contributor> | null | undefined} [default]
 *   Default export.
 *
 * @typedef Options
 *   Configuration.
 * @property {boolean | null | undefined} [appendIfMissing=false]
 *   Inject the section if there is none (default: `false`).
 * @property {Array<Contributor> | string | null | undefined} [contributors]
 *   List of contributors to inject (optional);
 *   defaults to the `contributors` field in the closest `package.json` upwards
 *   from the processed file, if there is one;
 *   supports the string form (`name <email> (url)`) as well;
 *   throws if no contributors are found or given.
 * @property {string | null | undefined} [cwd]
 *   Working directory from which to resolve a `contributors` module, if any
 *   (default: `file.cwd`).
 * @property {number | null | undefined} [limit=0]
 *   Limit the rendered contributors (default: `0`);
 *   `0` (or lower) includes all contributors;
 *   if `limit` is given, only the top `<limit>` contributors, sorted by commit
 *   count, are rendered.
 *
 * @typedef Social
 *   Social profile.
 * @property {string} text
 *   Text.
 * @property {string} url
 *   URL.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'
// @ts-expect-error: untyped.
import contributorsFromGit from 'contributors-from-git'
import dlv from 'dlv'
import {loadPlugin} from 'load-plugin'
import {headingRange} from 'mdast-util-heading-range'
import parseAuthor from 'parse-author'
import remarkContributors from 'remark-contributors'
import {findUp} from 'vfile-find-up'
import {VFileMessage} from 'vfile-message'
import {defaultFormatters} from './formatters.js'

const noreply = '@users.noreply.github.com'
const headingExpression = /^contributors$/i
const idFields = ['email', 'name', 'github', 'social.url']

/**
 * Generate a list of Git contributors.
 *
 * In short, this plugin:
 *
 * * looks for the first heading matching `/^contributors$/i`
 * * if no heading is found and `appendIfMissing` is set, injects such a heading
 * * if there is a heading, replaces everything in that section with a new table
 *   with Git contributors
 *
 * @param {Readonly<Options> | string | null | undefined} [options]
 *   Configuration (optional);
 *   passing `string` is as if passing `options.contributors`.
 * @returns
 *   Transform.
 */
export default function remarkGitContributors(options) {
  const settings =
    typeof options === 'string' ? {contributors: options} : options || {}

  /**
   * Transform.
   *
   * @param {Root} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {Promise<undefined>}
   *   Nothing.
   */
  return async function (tree, file) {
    // Skip work if there’s no Contributors heading.
    // remark-contributors also does this so this is an optimization.
    if (!settings.appendIfMissing) {
      let found = false

      headingRange(tree, headingExpression, function () {
        found = true
      })

      if (!found) return
    }

    const cwd = path.resolve(settings.cwd || file.cwd)
    /* c8 ignore next -- verbose to test. */
    const base = file.dirname ? path.resolve(cwd, file.dirname) : cwd
    const indices = await indexContributors(cwd, settings.contributors)
    const packageFile = await findUp('package.json', base)
    /** @type {PackageJson} */
    let packageData = {}

    if (packageFile) {
      packageData = JSON.parse(String(await fs.readFile(packageFile.path)))
    }

    // Cast because objects are indexable.
    indexContributor(indices, /** @type {Contributor} */ (packageData.author))

    if (Array.isArray(packageData.contributors)) {
      let index = -1
      while (++index < packageData.contributors.length) {
        indexContributor(indices, packageData.contributors[index])
      }
    }

    await new Promise(function (resolve, reject) {
      contributorsFromGit(cwd, ongitcontributors)

      /**
       * @param {Error | null} error
       *   Error.
       * @param {Array<RawContributor>} gitContributors
       *   Contributors.
       */
      // eslint-disable-next-line complexity
      function ongitcontributors(error, gitContributors) {
        if (error) {
          if (/does not have any commits yet/.test(String(error))) {
            file.message('Unexpected empty Git history, expected commits', {
              cause: error,
              ruleId: 'no-commits',
              source: 'remark-git-contributors'
            })
            resolve(undefined)
            return
          }

          reject(
            new VFileMessage('Cannot get Git contributors', {
              cause: error,
              ruleId: 'git-exception',
              source: 'remark-git-contributors'
            })
          )
          return
        }

        /** @type {Map<string, Map<string, CleanContributor>>} */
        const idFieldToMap = new Map()

        /** @type {Array<CleanContributor>} */
        let contributors = []
        let index = -1

        while (++index < gitContributors.length) {
          const {name, email, commits} = gitContributors[index]

          if (!email) {
            file.message(
              'Unexpected missing email for contributor `' + name + '`',
              {
                ruleId: 'contributor-email-missing',
                source: 'remark-git-contributors'
              }
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
            name.toLowerCase() === 'greenkeeper' ||
            metadata.github === 'greenkeeper[bot]' ||
            metadata.github === 'greenkeeperio-bot'
          ) {
            continue
          }

          /** @type {Social | undefined} */
          let social

          if (metadata.twitter) {
            const handle = (
              String(metadata.twitter).split(/@|\//).pop() || ''
            ).trim()

            if (handle) {
              social = {
                text: '@' + handle + '@twitter',
                url: 'https://twitter.com/' + handle
              }
            } else {
              file.message(
                'Unexpected invalid Twitter handle `' +
                  metadata.twitter +
                  '` for contributor `' +
                  email +
                  '`',
                {
                  ruleId: 'contributor-twitter-invalid',
                  source: 'remark-git-contributors'
                }
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
                'Unexpected invalid Mastodon handle `' +
                  metadata.mastodon +
                  '` for contributor `' +
                  email +
                  '`',
                {
                  ruleId: 'contributor-mastodon-invalid',
                  source: 'remark-git-contributors'
                }
              )
            }
          } else {
            file.info(
              'Unexpected missing social handle for contributor `' +
                email +
                '`',
              {
                ruleId: 'contributor-social-missing',
                source: 'remark-git-contributors'
              }
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

        contributors.sort(function (a, b) {
          return b.commits - a.commits || a.name.localeCompare(b.name)
        })

        if (settings.limit && settings.limit > 0) {
          contributors = contributors.slice(0, settings.limit)
        }

        const formatters = {...defaultFormatters}

        // Exclude GitHub column if all cells would be empty
        if (
          contributors.every(function (c) {
            return !c.github
          })
        ) {
          formatters.github = {exclude: true}
        }

        // Exclude Social column if all cells would be empty
        if (
          contributors.every(function (c) {
            return !c.social
          })
        ) {
          formatters.social = {exclude: true}
        }

        const transform = remarkContributors({
          contributors,
          formatters,
          appendIfMissing: settings.appendIfMissing,
          align: 'left'
        })

        transform(tree, file).then(resolve, reject)
      }
    })
  }
}

/**
 * @param {string} cwd
 *   Working directory.
 * @param {Array<Readonly<Contributor>> | string | null | undefined} contributors
 *   List of contributors to index.
 * @returns {Promise<Record<string, Record<string, ContributorObject>>>}
 *   Indices.
 */
async function indexContributors(cwd, contributors) {
  /** @type {Record<string, Record<string, ContributorObject>>} */
  const indices = {email: {}, github: {}, name: {}}

  if (contributors === null || contributors === undefined) {
    return indices
  }

  if (typeof contributors === 'string') {
    const exported = /** @type {ContributorsModule} */ (
      await loadPlugin(contributors, {
        from: [pathToFileURL(cwd) + '/', pathToFileURL(process.cwd()) + '/'],
        key: false
      })
    )

    if (Array.isArray(exported.contributors)) {
      contributors = exported.contributors
    } else if (Array.isArray(exported.default)) {
      contributors = exported.default
    }
  }

  if (!Array.isArray(contributors)) {
    throw new VFileMessage('Unexpected missing contributors')
  }

  for (const contributor of contributors) {
    indexContributor(indices, contributor)
  }

  return indices
}

/**
 * @param {Record<string, Record<string, ContributorObject>>} indices
 *   Indices.
 * @param {Contributor} contributor
 *   Contributor.
 * @returns {undefined}
 *   Nothing.
 */
function indexContributor(indices, contributor) {
  const contributorObject =
    typeof contributor === 'string'
      ? // Cast because objects are indexable.
        /** @type {ContributorObject} */ (parseAuthor(contributor))
      : {...contributor}

  /** @type {Array<unknown>} */
  /* c8 ignore next 3 -- verbose to test. */
  const emails = Array.isArray(contributorObject.emails)
    ? // type-coverage:ignore-next-line
      [...contributorObject.emails]
    : []

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
 *   Index.
 * @param {unknown} raw
 *   Raw value.
 * @param {ContributorObject} contributor
 *   Contributor.
 * @returns {undefined}
 *   Nothing.
 */
function indexValue(index, raw, contributor) {
  if (raw) {
    const key = String(raw).toLowerCase()
    const value = index[key]
    index[key] = value ? {...contributor, ...value} : contributor
  }
}
