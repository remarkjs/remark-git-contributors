# remark-git-contributors

[![Version][version-badge]][version]
[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

**[remark][]** plugin to generate a list of Git contributors.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`unified().use(remarkGitContributors[, options])`](#unifieduseremarkgitcontributors-options)
*   [Examples](#examples)
    *   [Example: CLI](#example-cli)
    *   [Example: CLI in npm scripts](#example-cli-in-npm-scripts)
    *   [Example: `appendIfMissing`](#example-appendifmissing)
    *   [Example: metadata](#example-metadata)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Contribute](#contribute)
*   [Contributors](#contributors)
*   [License](#license)

## What is this?

This package is a [unified][] ([remark][]) plugin that collects contributors
from Git history, deduplicates them, augments it with metadata found in options,
a module, or `package.json`, and passes that to
[`remark-contributors`][remark-contributors] to add them in a table in
`## Contributors`.

**unified** is a project that transforms content with abstract syntax trees
(ASTs).
**remark** adds support for markdown to unified.
**mdast** is the markdown AST that remark uses.
This is a remark plugin that transforms mdast.

## When should I use this?

This project is particularly useful when you have (open source) projects that
are maintained with Git and want to show who helped build them by adding their
names, websites, and perhaps some more info, based on their commits, to readmes.
This package is useful because it’s automated based on Git: those who commit
will get included.
The downside is that commits aren’t the only way to contribute (something
[All Contributors][all-contributors] focusses on).

This plugin is a Git layer on top of
[`remark-contributors`][remark-contributors], so it shares its benefits.
You can also use that plugin when you don’t want Git commits to be the source of
truth.

## Install

This package is [ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
In Node.js (version 12.20+, 14.14+, or 16.0+), install with [npm][]:

```sh
npm install remark-git-contributors
```

Contributions are welcome to add support for Deno.

## Use

Say we have the following file `example.md` in this project:

```markdown
# Example

Some text.

## Contributors

## License

MIT
```

And our module `example.js` looks as follows:

```js
import {read} from 'to-vfile'
import {remark} from 'remark'
import remarkGfm from 'remark-gfm'
import remarkGitContributors from 'remark-git-contributors'

main()

async function main() {
  const file = await remark()
    .use(remarkGfm) // Required: add support for tables (a GFM feature).
    .use(remarkGitContributors)
    .process(await read('example.md'))

  console.log(String(file))
}
```

Now running `node example.js` yields:

```markdown
# Example

Some text.

## Contributors

| Name                | GitHub                                       | Social                                                |
| :------------------ | :------------------------------------------- | :---------------------------------------------------- |
| **Vincent Weevers** | [**@vweevers**](https://github.com/vweevers) | [**@vweevers@twitter**](https://twitter.com/vweevers) |
| **Titus Wormer**    | [**@wooorm**](https://github.com/wooorm)     | [**@wooorm@twitter**](https://twitter.com/wooorm)     |

## License

MIT
```

> 👉 **Note**: These contributors are inferred from this project’s
> [`package.json`][package-json].
> Running this example in a different package will yield different results.

## API

This package exports no identifiers.
The default export is `remarkGitContributors`.

### `unified().use(remarkGitContributors[, options])`

Generate a list of Git contributors.
In short, this plugin:

*   looks for the first heading matching `/^contributors$/i`
*   if no heading is found and `appendIfMissing` is set, injects such a heading
*   if there is a heading, replaces everything in that section with a new table
    with Git contributors

##### `options`

Configuration (optional).

###### `options.limit`

Limit the total number of contributors rendered (`number`, default: `Infinity`).
A limit of `Infinity` or `0` (or lower) results in all contributors being
included.
The top contributors by commit count are included.

###### `options.contributors`

Contributor metadata (`Array` or `string`, default: `[]`).
Can be a list of contributor objects (see above).
Can be a module id that will be `import`ed which exports `contributors` as
either the default export or as a `contributors` named export specifier.

###### `options.cwd`

Working directory from which to resolve a `contributors` module, if any
(`string`, default: [`file.cwd`][cwd] or `process.cwd()`).

###### `options.appendIfMissing`

Inject a `## Contributors` section if there is none (`boolean`, default:
`false`).

## Examples

### Example: CLI

It’s recommended to use `remark-git-contributors` on the CLI with
[`remark-cli`][cli].
Install both (and [`remark-gfm`][remark-gfm]) with [npm][]:

```sh
npm install remark-cli remark-gfm remark-git-contributors --save-dev
```

Let’s say we have an `example.md` with the following text:

```markdown
# Hello

Some text.

## Contributors
```

You can now use the CLI to format `example.md`:

```sh
npx remark --output --use remark-gfm --use remark-git-contributors example.md
```

This adds the table of contributors to `example.md`, which now contains (when
running in this project):

```markdown
# Hello

Some text.

## Contributors

| Name                | GitHub                                       | Social                                                |
| :------------------ | :------------------------------------------- | :---------------------------------------------------- |
| **Vincent Weevers** | [**@vweevers**](https://github.com/vweevers) | [**@vweevers@twitter**](https://twitter.com/vweevers) |
| **Titus Wormer**    | [**@wooorm**](https://github.com/wooorm)     | [**@wooorm@twitter**](https://twitter.com/wooorm)     |
```

### Example: CLI in npm scripts

You can use `remark-git-contributors` and [`remark-cli`][cli] in an npm script
to format markdown in your project.
Install both (and [`remark-gfm`][remark-gfm]) with [npm][]:

```sh
npm install remark-cli remark-gfm remark-git-contributors --save-dev
```

Then, add a format script and configuration to `package.json`:

```js
{
  // …
  "scripts": {
    // …
    "format": "remark . --quiet --output",
    // …
  },
  "remarkConfig": {
    "plugins": [
      "remark-gfm",
      "remark-git-contributors"
    ]
  },
  // …
}
```

> 💡 **Tip**: Add other tools such as prettier or ESLint to check and format
> other files.
>
> 💡 **Tip**: Run `./node_modules/.bin/remark --help` for help with
> `remark-cli`.

Now you format markdown in your project with:

```sh
npm run format
```

### Example: `appendIfMissing`

The default behavior of this plugin is to not generate lists of Git
contributors if there is no `## Contributors` (case- and level-insensitive).
You can change that by configuring the plugin with
[`appendIfMissing: true`][append-if-missing].

The reason for not generating contributors by default is that as we saw in the
previous example (CLI in npm scripts) remark and this plugin often run on
several files.
You can choose where to add the list by explicitly adding `## Contributors`
in the main file (`readme.md`) and other docs won’t be touched.
Or, when you have many contributors, add a specific `contributors.md` file,
with a primary `# Contributors` heading, and the list will be generated there.

To turn `appendIfMissing` mode on, pass it like so on the API:

```js
  // …
  .use(remarkGitContributors, {appendIfMissing: true})
  // …
```

Or on the CLI (in `package.json`):

```js
  // …
  "remarkConfig": {
    "plugins": [
      // …
      [
        "remark-git-contributors",
        {"appendIfMissing": true}
      ]
    ]
  },
  // …
```

### Example: metadata

The data gathered from Git is only includes names and emails.
To add more metadata, either add it to `package.json` (used in this project’s
[`package.json`][package-json]) or configure `options.contributors`.
On the API, that’s done like so:

```js
  // …
  .use(remarkGitContributors, {contributors: /* value */})
  // …
```

Or on the CLI (in `package.json`):

```js
  // …
  "remarkConfig": {
    "plugins": [
      // …
      [
        "remark-git-contributors",
        {"contributors": /* value */}
      ]
    ]
  },
  // …
```

The value for `contributors` is either:

*   an array in the form of `[{ email, name, … }, … ]`;
*   a module id, or path to a file, that exports `contributors` as the default
    export or as a `contributors` named export

> 👉 **Note**: contributors that are not in Git history are excluded.
> This way the `contributors` metadata can be reused in multiple projects.

Each contributor should at least have an `email` property to match against Git
email addresses.
If you’re experiencing people showing up multiple times from Git history, for
example because they switched email addresses while contributing to the project,
or if their name or email are wrong, you can “merge” and fix contributors in Git
by using a [`.mailmap` file][mailmap].

The supported properties on contributors are:

*   `name` — person’s name (example: `Sara`)
*   `email` — person’s email (example: `sara@example.com`)
*   `github` — GitHub username (example: `sara123`)
*   `twitter` — Twitter username (example: `the_sara`)
*   `mastodon` — Mastodon (`@user@domain`)

An example of a reusable module is [`level-community`][level-community] by the
`level-js` community.

```js
  // …
  .use(remarkGitContributors, {contributors: 'level-community'})
  // …
```

## Types

This package is fully typed with [TypeScript][].
It exports an `Options` type which models the interface of the accepted options.

## Compatibility

Projects maintained by the unified collective are compatible with all maintained
versions of Node.js.
As of now, that is Node.js 12.20+, 14.14+, and 16.0+.
Our projects sometimes work with older versions, but this is not guaranteed.

This plugin works with `unified` version 6+ and `remark` version 7+.

## Security

`remark-git-contributors` is typically used in a trusted environment.
This section explains potential attack vectors and how to mitigate them if the
environment is not (fully) trusted.

`options.contributors` (or `contributors` in `package.json`) and `author` from
`package.json` are used and injected into the tree.
`git log` also runs in the current working directory.
This could open you up to a [cross-site scripting (XSS)][xss] attack if you pass
user provided content in or store user provided content in `package.json` or
Git.

This may become a problem if the markdown later transformed to **[rehype][]**
(**[hast][]**) or opened in an unsafe markdown viewer.

If `contributors` is a string, it is handled as a module identifier and
imported.
This could also be very dangerous if an attacker was able to inject code in that
package.

## Contribute

See [`contributing.md`][contributing] in [`remarkjs/.github`][health] for ways
to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## Contributors

| Name                | GitHub                                       | Social                                                |
| :------------------ | :------------------------------------------- | :---------------------------------------------------- |
| **Vincent Weevers** | [**@vweevers**](https://github.com/vweevers) | [**@vweevers@twitter**](https://twitter.com/vweevers) |
| **Titus Wormer**    | [**@wooorm**](https://github.com/wooorm)     | [**@wooorm@twitter**](https://twitter.com/wooorm)     |

## License

[MIT][license] © Vincent Weevers

<!-- Definitions -->

[version-badge]: http://img.shields.io/npm/v/remark-git-contributors.svg

[version]: https://www.npmjs.org/package/remark-git-contributors

[build-badge]: https://github.com/remarkjs/remark-git-contributors/workflows/main/badge.svg

[build]: https://github.com/remarkjs/remark-git-contributors/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark-git-contributors.svg

[coverage]: https://codecov.io/github/remarkjs/remark-git-contributors

[downloads-badge]: https://img.shields.io/npm/dm/remark-git-contributors.svg

[downloads]: https://www.npmjs.com/package/remark-git-contributors

[size-badge]: https://img.shields.io/bundlephobia/minzip/remark-git-contributors.svg

[size]: https://bundlephobia.com/result?p=remark-git-contributors

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/remarkjs/remark/discussions

[npm]: https://docs.npmjs.com/cli/install

[health]: https://github.com/remarkjs/.github

[contributing]: https://github.com/remarkjs/.github/blob/HEAD/contributing.md

[support]: https://github.com/remarkjs/.github/blob/HEAD/support.md

[coc]: https://github.com/remarkjs/.github/blob/HEAD/code-of-conduct.md

[license]: license

[remark]: https://github.com/remarkjs/remark

[unified]: https://github.com/unifiedjs/unified

[typescript]: https://www.typescriptlang.org

[xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[rehype]: https://github.com/rehypejs/rehype

[hast]: https://github.com/syntax-tree/hast

[remark-contributors]: https://github.com/remarkjs/remark-contributors

[remark-gfm]: https://github.com/remarkjs/remark-gfm

[package-json]: package.json

[cli]: https://github.com/remarkjs/remark/tree/HEAD/packages/remark-cli

[mailmap]: https://git-scm.com/docs/git-shortlog#_mapping_authors

[cwd]: https://github.com/vfile/vfile#vfilecwd

[level-community]: https://www.npmjs.com/package/level-community

[append-if-missing]: #optionsappendifmissing

[all-contributors]: https://github.com/all-contributors/all-contributors
