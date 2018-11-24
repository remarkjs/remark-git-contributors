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

test('basic', function (t) {
  run('00', {}, ({ cwd, actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

test('with metadata', function (t) {
  const contributors = [
    { email: TEST_EMAIL, github: 'test', twitter: 'test' }
  ]

  run('01', { contributors }, ({ cwd, actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

test('with metadata from module (main export)', function (t) {
  run('01', { main: 'contributors-main.js', contributors: '.' }, ({ cwd, actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

test('with metadata from module (named export)', function (t) {
  run('01', { main: 'contributors-named.js', contributors: '.' }, ({ cwd, actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

test('with metadata from module (default export)', function (t) {
  run('01', { main: 'contributors-default.js', contributors: '.' }, ({ cwd, actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

function run (fixture, opts, test) {
  const cwd = tmp()
  const inputFile = path.join(__dirname, 'fixture', fixture + '-input.md')
  const outputFile = path.join(__dirname, 'fixture', fixture + '-output.md')
  const main = opts.main ? fs.readFileSync(path.join(__dirname, 'fixture', opts.main), 'utf8') : ''
  const contributors = opts.contributors

  fs.writeFileSync(path.join(cwd, 'index.js'), main)

  execFileSync('git', ['init', '.'], { cwd, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.email', TEST_EMAIL], { cwd, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.name', TEST_NAME], { cwd, stdio: 'ignore' })
  execFileSync('git', ['add', 'index.js'], { cwd, stdio: 'ignore' })
  execFileSync('git', ['commit', '-m', 'initial'], { cwd, stdio: 'ignore' })

  const input = fs.readFileSync(inputFile, 'utf8').trim()
  const expected = fs.readFileSync(outputFile, 'utf8').trim()
  const processor = remark().use(plugin, { cwd, contributors })

  processor.process(input, (err, file) => {
    if (err) throw err
    const actual = file.contents.toString().trim()
    test({ cwd, actual, expected })
  })
}
