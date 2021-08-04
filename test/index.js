import test from 'tape'
import fs from 'fs'
import path from 'path'
import {readSync} from 'to-vfile'
import {remark} from 'remark'
import remarkGfm from 'remark-gfm'
import tmpgen from 'tmpgen'
import {execFileSync} from 'child_process'
import remarkGitContributors from '../index.js'

const temporary = tmpgen('remark-git-contributors/*')

const testName = 'test'
const testEmail = 'test@localhost'
const testUrl = 'https://localhost'

test('basic', function (t) {
  run('00', {}, ({file, actual, expected}) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map((d) => d.reason),
      ['no social profile for ' + testEmail]
    )
    t.end()
  })
})

test('with metadata as strings', function (t) {
  run(
    '00',
    {main: 'contributors-string.js', options: '.'},
    ({file, actual, expected}) => {
      t.is(actual, expected)
      t.deepEqual(
        file.messages.map((d) => d.reason),
        ['no social profile for ' + testEmail]
      )
      t.end()
    }
  )
})

test('with duplicate metadata', function (t) {
  run(
    '00',
    {main: 'contributors-duplicates.js', options: '.'},
    ({file, actual, expected}) => {
      t.is(actual, expected)
      t.deepEqual(
        file.messages.map((d) => d.reason),
        ['no social profile for ' + testEmail]
      )
      t.end()
    }
  )
})

test('with metadata', function (t) {
  const contributors = [{email: testEmail, github: 'test', twitter: 'test'}]

  run('01', {options: {contributors}}, ({file, actual, expected}) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map((d) => d.reason),
      []
    )
    t.end()
  })
})

test('with metadata from module (main export)', function (t) {
  run(
    '01',
    {main: 'contributors-main.js', options: '.'},
    ({file, actual, expected}) => {
      t.is(actual, expected)
      t.deepEqual(
        file.messages.map((d) => d.reason),
        []
      )
      t.end()
    }
  )
})

test('with metadata from module (named export)', function (t) {
  run(
    '01',
    {main: 'contributors-named.js', options: '.'},
    ({file, actual, expected}) => {
      t.is(actual, expected)
      t.deepEqual(
        file.messages.map((d) => d.reason),
        []
      )
      t.end()
    }
  )
})

test('with an unfound module id', function (t) {
  run('00', {options: 'missing.js'}, function ({err}) {
    t.ok(/^Error: Cannot find module 'missing.js'/.test(err))
    t.end()
  })
})

test('with a throwing module', function (t) {
  run('00', {main: 'contributors-throwing.js', options: '.'}, function ({err}) {
    t.ok(String(err).startsWith('Error: Some error!'))
    t.end()
  })
})

test('with an invalid exports', function (t) {
  run(
    '00',
    {main: 'contributors-invalid-exports.js', options: '.'},
    function ({err}) {
      t.ok(
        /^TypeError: The "contributors" option must be \(or resolve to\) an array/.test(
          err
        )
      )
      t.end()
    }
  )
})

test('with an invalid contributors setting', function (t) {
  run('00', {options: {contributors: true}}, function ({err}) {
    t.ok(
      /^TypeError: The "contributors" option must be \(or resolve to\) an array/.test(
        err
      )
    )
    t.end()
  })
})

test('with metadata from module (default export)', function (t) {
  run(
    '01',
    {main: 'contributors-default.js', options: '.'},
    ({file, actual, expected}) => {
      t.is(actual, expected)
      t.deepEqual(
        file.messages.map((d) => d.reason),
        []
      )
      t.end()
    }
  )
})

test('without heading', function (t) {
  run('02', {}, ({file, actual, expected}) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map((d) => d.reason),
      []
    )
    t.end()
  })
})

test('without heading, with `appendIfMissing`', function (t) {
  run('03', {options: {appendIfMissing: true}}, ({file, actual, expected}) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map((d) => d.reason),
      ['no social profile for ' + testEmail]
    )
    t.end()
  })
})

test('with a noreply email', function (t) {
  const email = '944406+wooorm@users.noreply.github.com'
  const gitUsers = [[testName, email]]

  run('04', {gitUsers}, ({file, actual, expected}) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map((d) => d.reason),
      ['no social profile for ' + email]
    )
    t.end()
  })
})

test('ignores greenkeeper email', function (t) {
  const email = 'example@greenkeeper.io'
  const gitUsers = [[testName, email]]

  run('00', {gitUsers}, function ({err}) {
    t.ok(
      String(err).startsWith(
        'Error: Missing required `contributors` in settings'
      )
    )
    t.end()
  })
})

test('with invalid twitter', function (t) {
  const contributors = [{email: testEmail, twitter: '@'}]

  run('00', {options: {contributors}}, ({file, actual, expected}) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map((d) => d.reason),
      ['invalid twitter handle for ' + testEmail]
    )
    t.end()
  })
})

test('with valid mastodon', function (t) {
  const contributors = [{email: testEmail, mastodon: '@foo@bar.com'}]

  run('05', {options: {contributors}}, ({file, actual, expected}) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map((d) => d.reason),
      []
    )
    t.end()
  })
})

test('with invalid mastodon', function (t) {
  const contributors = [{email: testEmail, mastodon: '@foo'}]

  run('00', {options: {contributors}}, ({file, actual, expected}) => {
    t.is(actual, expected)
    t.deepEqual(
      file.messages.map((d) => d.reason),
      ['invalid mastodon handle for ' + testEmail]
    )
    t.end()
  })
})

test('with empty email', function (t) {
  const gitUsers = [[testName, '<>']]

  run('00', {gitUsers}, ({err}) => {
    t.ok(
      String(err).startsWith(
        'Error: Missing required `contributors` in settings'
      )
    )
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

  run('06', {gitUsers}, ({actual, expected}) => {
    t.is(actual, expected)
    t.end()
  })
})

test('multiple authors with limit', function (t) {
  const topContributor = ['Alpha', 'alpha@localhost']
  const otherContributor = ['Bravo', 'bravo@localhost']
  const gitUsers = [topContributor, topContributor, otherContributor]

  run('07', {gitUsers, options: {limit: 1}}, ({actual, expected}) => {
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
    {name: 'One more name', email, twitter: '@a'},
    {name: 'The last name', email, twitter: '@b'}
  ]

  run('08', {gitUsers, options: {contributors}}, ({actual, expected}) => {
    t.is(actual, expected)
    t.end()
  })
})

test('no Git', function (t) {
  const gitUsers = []

  run('00', {skipInit: true, gitUsers}, ({err}) => {
    t.ok(String(err).startsWith('Error: Could not get Git contributors'))
    t.end()
  })
})

test('no Git users or contributors', function (t) {
  const gitUsers = []
  const contributors = []

  run('00', {gitUsers, options: {contributors}}, ({file}) => {
    t.deepEqual(
      file.messages.map((d) => d.reason),
      ['could not get Git contributors as there are no commits yet']
    )
    t.end()
  })
})

test('package.json author', function (t) {
  const pkgAuthor = {
    name: testName,
    email: testEmail,
    url: testUrl,
    github: 'test'
  }

  run('09', {pkgAuthor}, ({actual, expected}) => {
    t.is(actual, expected)
    t.end()
  })
})

test('package.json contributors', function (t) {
  const pkgContributors = [
    {
      name: testName,
      email: testEmail,
      url: testUrl,
      github: 'test'
    }
  ]

  run('09', {pkgContributors}, ({actual, expected}) => {
    t.is(actual, expected)
    t.end()
  })
})

test('broken package.json', function (t) {
  run('00', {pkgBroken: true}, ({err}) => {
    t.ok(String(err).startsWith('SyntaxError: Unexpected token'))
    t.end()
  })
})

test('sorts authors with equal commit count by name', function (t) {
  const gitUsers = [
    ['y', 'y@test'],
    ['a', 'a@test'],
    ['B', 'b@test'],
    ['z', 'z@test'],
    ['z', 'z@test']
  ]

  run('10', {gitUsers}, ({actual, expected}) => {
    t.is(actual, expected)
    t.end()
  })
})

function run(fixture, options_, test) {
  const cwd = temporary()
  const inputFile = path.join('test', 'fixture', fixture + '-input.md')
  const outputFile = path.join('test', 'fixture', fixture + '-output.md')
  const main = options_.main
    ? fs.readFileSync(path.join('test', 'fixture', options_.main), 'utf8')
    : ''
  const gitUsers = options_.gitUsers || [[testName, testEmail]]
  const {pkgAuthor, pkgContributors, pkgBroken, options} = options_

  if (!options_.skipInit) {
    execFileSync('git', ['init', '.'], {cwd, stdio: 'ignore'})
  }

  if (pkgAuthor || pkgContributors || pkgBroken) {
    let pkg = JSON.stringify({
      name: 'example',
      private: true,
      author: pkgAuthor,
      contributors: pkgContributors
    })

    if (pkgBroken) {
      pkg = pkg.slice(1)
    }

    fs.writeFileSync(path.join(cwd, 'package.json'), pkg)
  }

  gitUsers.forEach(function ([name, email], index) {
    execFileSync('git', ['config', 'user.name', name], {
      cwd,
      stdio: 'ignore'
    })
    execFileSync('git', ['config', 'user.email', email], {
      cwd,
      stdio: 'ignore'
    })
    execFileSync('git', ['config', 'commit.gpgsign', 'false'], {
      cwd,
      stdio: 'ignore'
    })

    if (index === 0) {
      fs.writeFileSync(path.join(cwd, 'index.js'), main)
    } else {
      fs.appendFileSync(path.join(cwd, 'index.js'), '\n// ' + index + '\n')
    }

    execFileSync('git', ['add', 'index.js'], {cwd, stdio: 'ignore'})
    execFileSync('git', ['commit', '-m', 'commit ' + index], {
      cwd,
      stdio: 'ignore'
    })
  })

  const input = readSync(inputFile)

  input.path = path.relative('test', inputFile)
  input.contents = String(input).replace(/\r\n/g, '\n')
  input.cwd = cwd

  const expected = fs
    .readFileSync(outputFile, 'utf8')
    .trim()
    .replace(/\r\n/g, '\n')

  remark()
    .use(remarkGfm)
    .use(remarkGitContributors, options)
    .process(input, (error, file) => {
      const actual = String(file).trim()
      test({err: error, file, cwd, actual, expected})
    })
}
