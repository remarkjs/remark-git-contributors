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
const TEST_AUTHOR = `${TEST_NAME} <${TEST_EMAIL}>`

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

function run (fixture, opts, test) {
  const cwd = tmp()
  const inputFile = path.join(__dirname, 'fixture', fixture + '-input.md')
  const outputFile = path.join(__dirname, 'fixture', fixture + '-output.md')

  fs.writeFileSync(path.join(cwd, 'test'), '')

  execFileSync('git', ['init', '.'], { cwd, stdio: 'inherit' })
  execFileSync('git', ['add', 'test'], { cwd, stdio: 'inherit' })
  execFileSync('git', ['commit', '-m', 'initial', '--author', TEST_AUTHOR], { cwd, stdio: 'inherit' })

  const input = fs.readFileSync(inputFile, 'utf8').trim()
  const expected = fs.readFileSync(outputFile, 'utf8').trim()
  const processor = remark().use(plugin, Object.assign({}, opts, { cwd }))

  processor.process(input, (err, file) => {
    if (err) throw err
    const actual = file.contents.toString().trim()
    test({ cwd, actual, expected })
  })
}
