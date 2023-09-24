/**
 * @typedef {import('type-fest').PackageJson} PackageJson
 * @typedef {import('type-fest').PackageJson.Person} Person
 */

/**
 * @typedef CommitOptions
 *   Configuration to set up Git.
 * @property {ReadonlyArray<Readonly<User>> | null | undefined} [users]
 *   Users (optional).
 * @property {string | null | undefined} [main]
 *   Contents of file initially (optional).
 * @property {boolean | null | undefined} [skipInit]
 *   Skip `git init` (default: `false`).
 *
 * @typedef PackageOptions
 *   Configuration to set up a `package.json`.
 * @property {Readonly<Person> | null | undefined} [author]
 *   Author (optional).
 * @property {ReadonlyArray<Readonly<Person>> | null | undefined} [contributors]
 *   Contributors (optional).
 * @property {boolean | null | undefined} [broken]
 *   Break the `package.json` (default: `false`).
 *
 * @typedef {[string, string]} User
 *   User name and email.
 */

import assert from 'node:assert/strict'
import {execFile as execFileCallback} from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import test from 'node:test'
import {pathToFileURL} from 'node:url'
import {promisify} from 'node:util'
import {remark} from 'remark'
import remarkGfm from 'remark-gfm'
import semver from 'semver'
// @ts-expect-error: untyped.
import tmpgen from 'tmpgen'
import {VFile} from 'vfile'
import remarkGitContributors from '../index.js'

const execFile = promisify(execFileCallback)

/** @type {() => string} */
const temporary = tmpgen('remark-git-contributors/*')

const testName = 'test'
const testEmail = 'test@localhost'
const testUrl = 'https://localhost'

const fixtures = new URL('fixture/', import.meta.url)

test('remark-git-contributors', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('../index.js')).sort(), [
      'default',
      'defaultFormatters'
    ])
  })

  await t.test('should work', async function () {
    const cwd = temporary()
    const [input, expected] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd)
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors)
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
    assert.deepEqual(
      file.messages.map(function (d) {
        return d.reason
      }),
      ['Unexpected missing social handle for contributor `test@localhost`']
    )
  })

  await t.test('should support metadata as strings', async function () {
    const cwd = temporary()
    const [input, expected] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd, {
      main: String(
        await fs.readFile(new URL('contributors-string.js', fixtures))
      )
    })
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors, './index.js')
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
    assert.deepEqual(
      file.messages.map(function (d) {
        return d.reason
      }),
      ['Unexpected missing social handle for contributor `test@localhost`']
    )
  })

  await t.test('should support duplicate metadata', async function () {
    const cwd = temporary()
    const [input, expected] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd, {
      main: String(
        await fs.readFile(new URL('contributors-duplicates.js', fixtures))
      )
    })
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors, './index.js')
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
    assert.deepEqual(
      file.messages.map(function (d) {
        return d.reason
      }),
      ['Unexpected missing social handle for contributor `test@localhost`']
    )
  })

  await t.test('should work w/ metadata', async function () {
    const cwd = temporary()
    const [input, expected] = await getFixtures('01')

    await createPackage(cwd)
    await createCommits(cwd)
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors, {
        contributors: [{email: testEmail, github: 'test', twitter: 'test'}]
      })
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
    assert.deepEqual(file.messages, [])
  })

  await t.test(
    'should work w/ metadata from default export',
    async function () {
      const cwd = temporary()
      const [input, expected] = await getFixtures('01')

      await createPackage(cwd)
      await createCommits(cwd, {
        main: String(
          await fs.readFile(new URL('contributors-main.js', fixtures))
        )
      })
      const file = await remark()
        .use(remarkGfm)
        .use(remarkGitContributors, './index.js')
        .process(new VFile({cwd, path: 'input.md', value: input}))

      assert.equal(String(file), expected)
      assert.deepEqual(file.messages, [])
    }
  )

  await t.test('should work w/ metadata from named export', async function () {
    const cwd = temporary()
    const [input, expected] = await getFixtures('01')

    await createPackage(cwd)
    await createCommits(cwd, {
      main: String(
        await fs.readFile(new URL('contributors-named.js', fixtures))
      )
    })
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors, './index.js')
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
    assert.deepEqual(file.messages, [])
  })

  await t.test('should fail w/ an unfound module id', async function () {
    const cwd = temporary()
    const [input] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd)

    try {
      await remark()
        .use(remarkGfm)
        .use(remarkGitContributors, './missing.js')
        .process(new VFile({cwd, path: 'input.md', value: input}))
      assert.fail()
    } catch (error) {
      assert.match(String(error), /Cannot find module/)
    }
  })

  await t.test('should fail w/ a throwing module', async function () {
    const cwd = temporary()
    const [input] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd, {
      main: String(
        await fs.readFile(new URL('contributors-throwing.js', fixtures))
      )
    })

    try {
      await remark()
        .use(remarkGfm)
        .use(remarkGitContributors, './index.js')
        .process(new VFile({cwd, path: 'input.md', value: input}))
      assert.fail()
    } catch (error) {
      assert.match(String(error), /Error: Some error!/)
    }
  })

  await t.test('should fail w/ invalid exports', async function () {
    const cwd = temporary()
    const [input] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd, {
      main: String(
        await fs.readFile(new URL('contributors-invalid-exports.js', fixtures))
      )
    })

    try {
      await remark()
        .use(remarkGfm)
        .use(remarkGitContributors, './index.js')
        .process(new VFile({cwd, path: 'input.md', value: input}))
      assert.fail()
    } catch (error) {
      assert.match(String(error), /Unexpected missing contributors/)
    }
  })

  await t.test(
    'should fail w/ invalid `options.contributors`',
    async function () {
      const cwd = temporary()
      const [input] = await getFixtures('00')

      await createPackage(cwd)
      await createCommits(cwd)

      try {
        await remark()
          .use(remarkGfm)
          // @ts-expect-error: check how runtime handles invalid `contributors`.
          .use(remarkGitContributors, {contributors: true})
          .process(new VFile({cwd, path: 'input.md', value: input}))
        assert.fail()
      } catch (error) {
        assert.match(String(error), /Unexpected missing contributors/)
      }
    }
  )

  await t.test('should work w/o heading', async function () {
    const cwd = temporary()
    const [input, expected] = await getFixtures('02')

    await createPackage(cwd)
    await createCommits(cwd)
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors)
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
    assert.deepEqual(file.messages, [])
  })

  await t.test(
    'should work w/o heading, with `options.appendIfMissing`',
    async function () {
      const cwd = temporary()
      const [input, expected] = await getFixtures('03')

      await createPackage(cwd)
      await createCommits(cwd)
      const file = await remark()
        .use(remarkGfm)
        .use(remarkGitContributors, {appendIfMissing: true})
        .process(new VFile({cwd, path: 'input.md', value: input}))

      assert.equal(String(file), expected)
      assert.deepEqual(
        file.messages.map(function (d) {
          return d.reason
        }),
        ['Unexpected missing social handle for contributor `test@localhost`']
      )
    }
  )

  await t.test('should work w/ a noreply email', async function () {
    const cwd = temporary()
    const email = '944406+wooorm@users.noreply.github.com'
    const [input, expected] = await getFixtures('04')

    await createPackage(cwd)
    await createCommits(cwd, {users: [[testName, email]]})
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors)
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
    assert.deepEqual(
      file.messages.map(function (d) {
        return d.reason
      }),
      [
        'Unexpected missing social handle for contributor `944406+wooorm@users.noreply.github.com`'
      ]
    )
  })

  await t.test('should ignore greenkeeper email', async function () {
    const cwd = temporary()
    const email = 'example@greenkeeper.io'
    const [input] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd, {users: [[testName, email]]})

    try {
      await remark()
        .use(remarkGfm)
        .use(remarkGitContributors)
        .process(new VFile({cwd, path: 'input.md', value: input}))
      assert.fail()
    } catch (error) {
      assert.match(
        String(error),
        /Error: Missing required `contributors` in settings/
      )
    }
  })

  await t.test('should work w/ invalid twitter', async function () {
    const cwd = temporary()
    const [input, expected] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd)
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors, {
        contributors: [{email: testEmail, twitter: '@'}]
      })
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
    assert.deepEqual(
      file.messages.map(function (d) {
        return d.reason
      }),
      ['Unexpected invalid Twitter handle `@` for contributor `test@localhost`']
    )
  })

  await t.test('should work w/ valid mastodon', async function () {
    const cwd = temporary()
    const [input, expected] = await getFixtures('05')

    await createPackage(cwd)
    await createCommits(cwd)
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors, {
        contributors: [{email: testEmail, mastodon: '@foo@bar.com'}]
      })
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
    assert.deepEqual(file.messages, [])
  })

  await t.test('should work w/ invalid mastodon', async function () {
    const cwd = temporary()
    const [input, expected] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd)
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors, {
        contributors: [{email: testEmail, mastodon: '@foo'}]
      })
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
    assert.deepEqual(
      file.messages.map(function (d) {
        return d.reason
      }),
      [
        'Unexpected invalid Mastodon handle `@foo` for contributor `test@localhost`'
      ]
    )
  })

  await t.test('should work w/ empty email', async function () {
    const cwd = temporary()
    const [input] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd, {users: [[testName, '<>']]})

    try {
      await remark()
        .use(remarkGfm)
        .use(remarkGitContributors)
        .process(new VFile({cwd, path: 'input.md', value: input}))
      assert.fail()
    } catch (error) {
      assert.match(
        String(error),
        /Error: Missing required `contributors` in settings/
      )
    }
  })

  await t.test('should work w/ multiple authors', async function () {
    /** @type {User} */
    const topContributor = ['Alpha', 'alpha@localhost']
    /** @type {User} */
    const otherContributor = ['Bravo', 'bravo@localhost']
    /** @type {User} */
    const anotherContributor = ['Charlie', 'charlie@localhost']
    const cwd = temporary()
    const [input, expected] = await getFixtures('06')

    await createPackage(cwd)
    await createCommits(cwd, {
      users: [
        topContributor,
        topContributor,
        otherContributor,
        anotherContributor,
        topContributor,
        anotherContributor,
        otherContributor
      ]
    })
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors)
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
  })

  await t.test(
    'should work w/ multiple authors and `options.limit`',
    async function () {
      /** @type {User} */
      const topContributor = ['Alpha', 'alpha@localhost']
      /** @type {User} */
      const otherContributor = ['Bravo', 'bravo@localhost']
      const cwd = temporary()
      const [input, expected] = await getFixtures('07')

      await createPackage(cwd)
      await createCommits(cwd, {
        users: [topContributor, topContributor, otherContributor]
      })
      const file = await remark()
        .use(remarkGfm)
        .use(remarkGitContributors, {limit: 1})
        .process(new VFile({cwd, path: 'input.md', value: input}))

      assert.equal(String(file), expected)
    }
  )

  await t.test(
    'should work w/ duplicate Git users and contributors',
    async function () {
      const cwd = temporary()
      const email = 'alpha@localhost'
      const [input, expected] = await getFixtures('08')

      await createPackage(cwd)
      await createCommits(cwd, {
        users: [
          ['A name', email],
          ['Another name', email]
        ]
      })

      const file = await remark()
        .use(remarkGfm)
        .use(remarkGitContributors, {
          contributors: [
            {name: 'One more name', email, twitter: '@a'},
            {name: 'The last name', email, twitter: '@b'}
          ]
        })
        .process(new VFile({cwd, path: 'input.md', value: input}))

      assert.equal(String(file), expected)
    }
  )

  await t.test('should work w/o git', async function () {
    const cwd = temporary()
    const [input] = await getFixtures('00')

    await createPackage(cwd)
    await createCommits(cwd, {users: [], skipInit: true})

    try {
      await remark()
        .use(remarkGfm)
        .use(remarkGitContributors)
        .process(new VFile({cwd, path: 'input.md', value: input}))
      assert.fail()
    } catch (error) {
      assert.match(String(error), /Cannot get Git contributors/)
    }
  })

  await t.test(
    'should work w/ no git users or `contributors`',
    async function () {
      const cwd = temporary()
      const [input] = await getFixtures('00')

      await createPackage(cwd)
      await createCommits(cwd, {users: []})

      const file = await remark()
        .use(remarkGfm)
        .use(remarkGitContributors, {contributors: []})
        .process(new VFile({cwd, path: 'input.md', value: input}))

      assert.deepEqual(
        file.messages.map(function (d) {
          return d.reason
        }),
        ['Unexpected empty Git history, expected commits']
      )
    }
  )

  await t.test('should work w/ `author` in `package.json`', async function () {
    const cwd = temporary()
    const [input, expected] = await getFixtures('09')

    await createPackage(cwd, {
      author: {
        name: testName,
        email: testEmail,
        url: testUrl,
        // @ts-expect-error: fine to add more info in persons.
        github: 'test'
      }
    })
    await createCommits(cwd)
    const file = await remark()
      .use(remarkGfm)
      .use(remarkGitContributors)
      .process(new VFile({cwd, path: 'input.md', value: input}))

    assert.equal(String(file), expected)
  })

  await t.test(
    'should work w/ `contributors` in `package.json`',
    async function () {
      const cwd = temporary()
      const [input, expected] = await getFixtures('09')

      await createPackage(cwd, {
        contributors: [
          // @ts-expect-error: fine to add more info in persons.
          {name: testName, email: testEmail, url: testUrl, github: 'test'}
        ]
      })
      await createCommits(cwd)
      const file = await remark()
        .use(remarkGfm)
        .use(remarkGitContributors)
        .process(new VFile({cwd, path: 'input.md', value: input}))

      assert.equal(String(file), expected)
    }
  )

  await t.test('should fail w/ broken `package.json`s', async function () {
    const cwd = temporary()
    const [input] = await getFixtures('00')

    await createPackage(cwd, {broken: true})
    await createCommits(cwd)

    try {
      await remark()
        .use(remarkGfm)
        .use(remarkGitContributors)
        .process(new VFile({cwd, path: 'input.md', value: input}))
      assert.fail()
    } catch (error) {
      assert.match(
        String(error),
        semver.satisfies(process.version, '>=20')
          ? /SyntaxError: Unexpected non-whitespace character/
          : /SyntaxError: Unexpected token/
      )
    }
  })

  await t.test(
    'should sort authors with equal commit count by name',
    async function () {
      const cwd = temporary()
      const [input, expected] = await getFixtures('10')

      await createPackage(cwd)
      await createCommits(cwd, {
        users: [
          ['y', 'y@test'],
          ['a', 'a@test'],
          ['B', 'b@test'],
          ['z', 'z@test'],
          ['z', 'z@test']
        ]
      })

      const file = await remark()
        .use(remarkGfm)
        .use(remarkGitContributors)
        .process(new VFile({cwd, path: 'input.md', value: input}))

      assert.equal(String(file), expected)
    }
  )
})

/**
 * @param {string} cwd
 *   Path to folder.
 * @param {Readonly<PackageOptions> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Promise<undefined>}
 *   Nothing.
 */
async function createPackage(cwd, options) {
  const settings = options || {}
  const pkg = /** @type {PackageJson} */ ({
    author: settings.author || undefined,
    contributors: settings.contributors || undefined,
    name: 'example',
    private: true,
    type: 'module'
  })
  let value = JSON.stringify(pkg)
  if (settings.broken) {
    value = value.slice(1)
  }

  await fs.writeFile(new URL('package.json', pathToFileURL(cwd) + '/'), value)
}

/**
 * @param {string} cwd
 *   Path to folder.
 * @param {Readonly<CommitOptions> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Promise<undefined>}
 *   Nothing.
 */
async function createCommits(cwd, options) {
  const settings = options || {}
  const users = settings.users || [['test', 'test@localhost']]
  let index = -1

  if (!settings.skipInit) {
    await execFile('git', ['init', '.'], {cwd})
  }

  while (++index < users.length) {
    const [name, email] = users[index]
    await fs.writeFile(
      new URL('index.js', pathToFileURL(cwd) + '/'),
      settings.main && index === 0 ? settings.main : '// ' + index + '\n'
    )
    await execFile('git', ['config', 'user.name', name], {cwd})
    await execFile('git', ['config', 'user.email', email], {cwd})
    await execFile('git', ['config', 'commit.gpgsign', 'false'], {cwd})
    await execFile('git', ['add', 'index.js'], {cwd})
    await execFile('git', ['commit', '-m', 'commit ' + index], {cwd})
  }
}

/**
 * Read the input and output of a fixture.
 *
 * @param {string} name
 *   Name of the fixture.
 * @returns {Promise<[string, string]>}
 *   Input and output.
 */
async function getFixtures(name) {
  const input = String(
    await fs.readFile(new URL(name + '-input.md', fixtures))
  ).replace(/\r\n/g, '\n')
  const output = String(
    await fs.readFile(new URL(name + '-output.md', fixtures))
  ).replace(/\r\n/g, '\n')
  return [input, output]
}
