'use strict'

const test = require('tape')
const fs = require('fs')
const path = require('path')
const remark = require('remark')
const tmp = require('tmpgen')('remark-git-contributors/*')
const execFileSync = require('child_process').execFileSync
const plugin = require('..')

const TEST_AUTHOR = 'test <test@localhost>'

test('basic', function (t) {
  run('00', ({ cwd, actual, expected }) => {
    t.is(actual, expected)
    t.end()
  })
})

function run (fixture, test) {
  const cwd = tmp()
  const inputFile = path.join(__dirname, 'fixture', fixture + '-input.md')
  const outputFile = path.join(__dirname, 'fixture', fixture + '-output.md')
  const destFile = path.join(cwd, 'test.md')

  fs.copyFileSync(inputFile, destFile)

  execFileSync('git', ['init', '.'], { cwd, stdio: 'ignore' })
  execFileSync('git', ['add', 'test.md'], { cwd, stdio: 'ignore' })
  execFileSync('git', ['commit', '-m', 'initial', '--author', TEST_AUTHOR], { cwd, stdio: 'ignore' })

  const input = fs.readFileSync(inputFile, 'utf8').trim()
  const expected = fs.readFileSync(outputFile, 'utf8').trim()
  const processor = remark().use(plugin, { cwd })

  processor.process(input, (err, file) => {
    if (err) throw err
    const actual = file.contents.toString().trim()
    test({ cwd, actual, expected })
  })
}
