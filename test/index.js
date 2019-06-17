'use strict'

const test = require('tape')
const fs = require('fs')
const path = require('path')
const remark = require('remark')
const tmp = require('tmpgen')('remark-git-contributors/*')
const execFileSync = require('child_process').execFileSync
const plugin = require('..')

const TEST_NAME = 'test'
const TEST_EMAIL = 'test@localhost'
const TEST_URL = 'https://localhost'

test('basic', function (t) {
  run('00', {}, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map(String),
      ['1:1: no social profile for ' + TEST_EMAIL]
    )
    t.end()
  })
})

test('with metadata as strings', function (t) {
  run('00', { main: 'contributors-string.js', options: '.' }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map(String),
      ['1:1: no social profile for ' + TEST_EMAIL]
    )
    t.end()
  })
})

test('with duplicate metadata', function (t) {
  run('00', { main: 'contributors-duplicates.js', options: '.' }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map(String),
      ['1:1: no social profile for ' + TEST_EMAIL]
    )
    t.end()
  })
})

test('with metadata', function (t) {
  const contributors = [
    { email: TEST_EMAIL, github: 'test', twitter: 'test' }
  ]

  run('01', { options: { contributors } }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(file.messages.map(String), [])
    t.end()
  })
})

test('with metadata from module (main export)', function (t) {
  run('01', { main: 'contributors-main.js', options: '.' }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(file.messages.map(String), [])
    t.end()
  })
})

test('with metadata from module (named export)', function (t) {
  run('01', { main: 'contributors-named.js', options: '.' }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(file.messages.map(String), [])
    t.end()
  })
})

test('with an unfound module id', function (t) {
  run('00', { options: 'missing.js' }, function ({ err }) {
    t.ok(/^Error: Cannot find module 'missing.js'/.test(err))
    t.end()
  })
})

test('with a throwing module', function (t) {
  run('00', { main: 'contributors-throwing.js', options: '.' }, function ({ err }) {
    t.ok(/^Error: Some error!/.test(err))
    t.end()
  })
})

test('with an invalid exports', function (t) {
  run('00', { main: 'contributors-invalid-exports.js', options: '.' }, function ({ err }) {
    t.ok(/^TypeError: The "contributors" option must be \(or resolve to\) an array/.test(err))
    t.end()
  })
})

test('with an invalid contributors setting', function (t) {
  run('00', { options: { contributors: true } }, function ({ err }) {
    t.ok(/^TypeError: The "contributors" option must be \(or resolve to\) an array/.test(err))
    t.end()
  })
})

test('with metadata from module (default export)', function (t) {
  run('01', { main: 'contributors-default.js', options: '.' }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(file.messages.map(String), [])
    t.end()
  })
})

test('without heading', function (t) {
  run('02', { }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(file.messages.map(String), [])
    t.end()
  })
})

test('without heading, with `appendIfMissing`', function (t) {
  run('03', { options: { appendIfMissing: true } }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map(String),
      ['1:1: no social profile for ' + TEST_EMAIL]
    )
    t.end()
  })
})

test('with a noreply email', function (t) {
  const email = '944406+wooorm@users.noreply.github.com'
  const gitUsers = [[TEST_NAME, email]]

  run('04', { gitUsers }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map(String),
      ['1:1: no social profile for ' + email]
    )
    t.end()
  })
})

test('ignores greenkeeper email', function (t) {
  const email = 'example@greenkeeper.io'
  const gitUsers = [[TEST_NAME, email]]

  run('00', { gitUsers }, function ({ err }) {
    t.ok(/^Error: Missing required `contributors` in settings/.test(err))
    t.end()
  })
})

test('with invalid twitter', function (t) {
  const contributors = [{ email: TEST_EMAIL, twitter: '@' }]

  run('00', { options: { contributors } }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map(String),
      ['1:1: invalid twitter handle for ' + TEST_EMAIL]
    )
    t.end()
  })
})

test('with valid mastodon', function (t) {
  const contributors = [{ email: TEST_EMAIL, mastodon: '@foo@bar.com' }]

  run('05', { options: { contributors } }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(file.messages.map(String), [])
    t.end()
  })
})

test('with invalid mastodon', function (t) {
  const contributors = [{ email: TEST_EMAIL, mastodon: '@foo' }]

  run('00', { options: { contributors } }, ({ file, actual, expected }) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map(String),
      ['1:1: invalid mastodon handle for ' + TEST_EMAIL]
    )
    t.end()
  })
})

test('with empty email', function (t) {
  const gitUsers = [[TEST_NAME, '<>']]

  run('00', { gitUsers }, ({ err }) => {
    t.ok(/^Error: Missing required `contributors` in settings/.test(err))
    t.end()
  })
})

test('multiple authors', function (t) {
  const topContributor = ['Alpha', 'alpha@localhost']
  const otherContributor = ['Bravo', 'bravo@localhost']
  const anotherContributor = ['Charlie', 'charlie@localhost']
  const gitUsers = [
    topContributor,
    topContributor,
    otherContributor,
    anotherContributor,
    topContributor,
    anotherContributor,
    otherContributor
  ]

  run('06', { gitUsers }, ({ actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

test('multiple authors with limit', function (t) {
  const topContributor = ['Alpha', 'alpha@localhost']
  const otherContributor = ['Bravo', 'bravo@localhost']
  const gitUsers = [
    topContributor,
    topContributor,
    otherContributor
  ]

  run('07', { gitUsers, options: { limit: 1 } }, ({ actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

test('duplicate Git users and contributors', function (t) {
  const email = 'alpha@localhost'
  const gitUsers = [
    ['A name', email],
    ['Another name', email]
  ]
  const contributors = [
    { name: 'One more name', email, twitter: '@a' },
    { name: 'The last name', email, twitter: '@b' }
  ]

  run('08', { gitUsers, options: { contributors } }, ({ actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

test('no Git', function (t) {
  const gitUsers = []

  run('00', { skipInit: true, gitUsers }, ({ err }) => {
    t.ok(/^Error: Could not get Git contributors/.test(err))
    t.end()
  })
})

test('no Git users or contributors', function (t) {
  const gitUsers = []
  const contributors = []

  run('00', { gitUsers, options: { contributors } }, ({ file }) => {
    t.deepEqual(
      file.messages.map(String),
      ['1:1: could not get Git contributors as there are no commits yet']
    )
    t.end()
  })
})

test('package.json author', function (t) {
  const pkgAuthor = {
    name: TEST_NAME,
    email: TEST_EMAIL,
    url: TEST_URL,
    github: 'test'
  }

  run('09', { pkgAuthor }, ({ actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

test('package.json contributors', function (t) {
  const pkgContributors = [{
    name: TEST_NAME,
    email: TEST_EMAIL,
    url: TEST_URL,
    github: 'test'
  }]

  run('09', { pkgContributors }, ({ actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

function run (fixture, opts, test) {
  const cwd = tmp()
  const inputFile = path.join(__dirname, 'fixture', fixture + '-input.md')
  const outputFile = path.join(__dirname, 'fixture', fixture + '-output.md')
  const main = opts.main ? fs.readFileSync(path.join(__dirname, 'fixture', opts.main), 'utf8') : ''
  const gitUsers = opts.gitUsers || [[TEST_NAME, TEST_EMAIL]]
  const { pkgAuthor, pkgContributors, options } = opts

  if (!opts.skipInit) {
    execFileSync('git', ['init', '.'], { cwd, stdio: 'ignore' })
  }

  if (pkgAuthor || pkgContributors) {
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
      name: 'example',
      private: true,
      author: pkgAuthor,
      contributors: pkgContributors
    }))
  }

  gitUsers.forEach(function ([name, email], index) {
    execFileSync('git', ['config', 'user.name', name], { cwd, stdio: 'ignore' })
    execFileSync('git', ['config', 'user.email', email], { cwd, stdio: 'ignore' })
    execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd, stdio: 'ignore' })

    if (index === 0) {
      fs.writeFileSync(path.join(cwd, 'index.js'), main)
    } else {
      fs.appendFileSync(path.join(cwd, 'index.js'), '\n// ' + index + '\n')
    }

    execFileSync('git', ['add', 'index.js'], { cwd, stdio: 'ignore' })
    execFileSync('git', ['commit', '-m', 'commit ' + index], { cwd, stdio: 'ignore' })
  })

  const input = fs.readFileSync(inputFile, 'utf8').trim()
  const expected = fs.readFileSync(outputFile, 'utf8').trim()

  remark()
    .use(() => (tree, file) => { file.cwd = cwd })
    .use(plugin, options)
    .process(input, (err, file) => {
      const actual = String(file).trim()
      test({ err, file, cwd, actual, expected })
    })
}
