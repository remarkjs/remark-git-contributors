# remark-git-contributors

[![Version][version-badge]][version]
[![Travis][travis-badge]][travis]
[![AppVeyor][appveyor-badge]][appveyor]
[![Coverage][coverage-badge]][coverage]
[![Dependencies][dependencies-badge]][dependencies]
[![JavaScript Style Guide][standard-badge]][standard]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[**remark**][remark] plugin to inject Git contributors into a Markdown table.
Collects contributors from Git history, deduplicates them, augments it with
metadata found in options, a module, or `package.json` and calls
[`remark-contributors`][contributors] to render the Markdown table.

## Contents

*   [Install](#install)
*   [Use](#use)
    *   [Inject](#inject)
    *   [Metadata](#metadata)
*   [Supported properties](#supported-properties)
*   [API](#api)
    *   [`remark().use(gitContributors[, options])`](#remarkusegitcontributors-options)
*   [Security](#security)
*   [Contribute](#contribute)
*   [Contributors](#contributors)
*   [License](#license)

## Install

[npm][]:

```sh
npm install remark-git-contributors
```

## Use

With [`remark-cli`][cli], modifying a Markdown file in place (`-o`):

```sh
remark --use remark-git-contributors readme.md -o
```

### Inject

Injecting a contributors section is opt-in: if a `Contributors` heading is not
found in the Markdown (case- and level-insensitive), the plugin doesn’t do
anything, unless [`appendIfMissing`][api] is set.

If the Git repository has many contributors, it is recommended to have them
listed in a `contributors.md` rather than `readme.md`.
To achieve this, add a `Contributors` heading to a `contributors.md` but not to
`readme.md`, prior to running `remark`.
This way you can use the same pipeline (possibly with other plugins) on both
files, only injecting contributors into one:

```sh
remark --use remark-git-contributors readme.md contributors.md -o
```

### Metadata

To augment user metadata, configure the plugin in your `package.json`:

```js
"remarkConfig": {
  "plugins": [
    [
      "remark-git-contributors",
      {
        "contributors": /* … */
      }
    ]
  ]
}
```

Where `contributors` is either:

*   An array in the form of `[{ email, name, … }, … ]`;
*   A module id or path to a file that exports `contributors` or
    `{ contributors }`.

Note that `remark-git-contributors` excludes people that are not in Git history.
This way the `contributors` metadata can be reused in multiple projects.
Each contributor should at least have an `email` property to match against Git
email addresses.
To counter the fact that people change their email address, contributors are
also matched by `name` if present.

As a shortcut you can replace the options object with a module id.
For example, `level-js` uses metadata stored in
[`level-community`][level-community]:

```json
"remarkConfig": {
  "plugins": {
    "remark-git-contributors": "level-community"
  }
}
```

Here’s an example of inline metadata:

```json
"remarkConfig": {
  "plugins": {
    "remark-git-contributors": {
      "contributors": [{
        "name": "Sara",
        "email": "sara@example.com",
        "github": "sara"
      }]
    }
  }
}
```

Alternatively, put the metadata in the [`author` or `contributors`
fields][fields] in `package.json`.
For example:

```json
"author": {
  "name": "Sara",
  "email": "sara@example.com",
  "github": "sara"
}
```

If you’re experiencing people showing up multiple times from the Git history,
for example because they switched email addresses while contributing to the
project, or if their name or email are wrong, you can “merge” and fix
contributors in Git by using a [`.mailmap` file][mailmap].

## Supported properties

*   `name`: overrides the name stored in git commits
*   `github`: GitHub username
*   `twitter`: Twitter username
*   `mastodon`: Mastodon with format `@user@domain`

## API

### `remark().use(gitContributors[, options])`

Inject Git contributors into a Markdown table.

##### `options`

###### `options.limit`

Limit the rendered contributors (`number`, default: `0`).
A limit of `0` (or lower) includes all contributors.
If `limit` is given, only the top `<limit>` contributors, sorted by commit
count, are rendered.

###### `options.contributors`

Contributor metadata (`Array` or `string`, default: `[]`).
Can be a list of contributor objects (see above).
Can be a module id, that resolves either to a list of contributors or to an
object with a `contributors` or `default` field that provides the list of
contributors.

###### `options.cwd`

Working directory from which to resolve a `contributors` module, if any
(`string`, default: [`file.cwd`][cwd] or `process.cwd()`).

###### `options.appendIfMissing`

Inject a Contributors section if there is none (`boolean`, default: `false`).

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

This may become a problem if the Markdown later transformed to
[**rehype**][rehype] ([**hast**][hast]) or opened in an unsafe Markdown viewer.

If `contributors` is a string, it is handled as a module identifier and
loaded with `require`.
This could also be very dangerous if an attacker was able to inject code in
that package.

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

[travis-badge]: https://img.shields.io/travis/remarkjs/remark-git-contributors/main.svg?label=travis

[travis]: https://travis-ci.org/remarkjs/remark-git-contributors

[appveyor-badge]: https://img.shields.io/appveyor/ci/remarkjs/remark-git-contributors.svg?label=appveyor

[appveyor]: https://ci.appveyor.com/project/remarkjs/remark-git-contributors

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark-git-contributors.svg

[coverage]: https://codecov.io/github/remarkjs/remark-git-contributors

[dependencies-badge]: https://img.shields.io/david/remarkjs/remark-git-contributors.svg

[dependencies]: https://david-dm.org/remarkjs/remark-git-contributors

[standard-badge]: https://img.shields.io/badge/code_style-standard-brightgreen.svg

[standard]: https://standardjs.com

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

[contributors]: https://github.com/remarkjs/remark-contributors

[cli]: https://github.com/remarkjs/remark/tree/HEAD/packages/remark-cli

[api]: #api

[level-community]: https://www.npmjs.com/package/level-community

[fields]: https://docs.npmjs.com/files/package.json#people-fields-author-contributors

[mailmap]: https://git-scm.com/docs/git-shortlog#_mapping_authors

[cwd]: https://github.com/vfile/vfile#vfilecwd

[xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[rehype]: https://github.com/rehypejs/rehype

[hast]: https://github.com/syntax-tree/hast
