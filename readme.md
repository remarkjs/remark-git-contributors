# remark-git-contributors

[![Version][version-badge]][version]
[![Node][node-badge]][node]
[![Travis][travis-badge]][travis]
[![AppVeyor][appveyor-badge]][appveyor]
[![Coverage][coverage-badge]][coverage]
[![Dependencies][dependencies-badge]][dependencies]
[![JavaScript Style Guide][standard-badge]][standard]
[![Chat][chat-badge]][chat]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]

Asynchronous [`remark`][remark] plugin to inject Git contributors into a
markdown table.
Collects contributors from Git history, deduplicates them, augments it with
metadata found in options, a module or `package.json` and calls
[`remark-contributors`][contributors] to render the markdown table.

## Table of Contents

*   [Installation](#installation)
*   [Usage](#usage)
    *   [Injection](#injection)
    *   [Metadata](#metadata)
*   [Supported Properties](#supported-properties)
*   [API](#api)
    *   [contributors(\[options\])](#contributorsoptions)
*   [Contribute](#contribute)
*   [Contributors](#contributors)
*   [License](#license)

## Installation

[npm][]:

```bash
npm install remark-git-contributors
```

## Usage

With [`remark-cli`][cli], modifying a markdown file in place (`-o`):

```sh
remark --use remark-git-contributors readme.md -o
```

### Injection

Injecting a contributors section is opt-in: if a `Contributors` heading is not
found in the markdown (case- and level-insensitive), the plugin is a noop,
unless [`appendIfMissing`][api] is set.

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
        "contributors": /* ... */
      }
    ]
  ]
}
```

Where `contributors` is either:

*   An array in the form of `[{ email, name, .. }, ..]`;
*   A module id or path to a file that exports `contributors` or `{ contributors }`.

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

## Supported Properties

*   `name`: overrides the name stored in git commits
*   `github`: GitHub username
*   `twitter`: Twitter username
*   `mastodon`: Mastodon with format `@user@domain`

## API

### `contributors([options])`

The options object may contain the following properties:

*   `limit`: number.
    Only render the top `<limit>` contributors, sorted by commit count.
    By default, all contributors are included.
*   `contributors`: array or module id.
    See above.
*   `cwd`: working directory from which to resolve `contributors` module (if
    any).
    Defaults to [`cwd`][cwd] of the file, falling back to `process.cwd()` if
    it doesn’t resolve.
*   `appendIfMissing`: boolean.
    Inject Contributors section if there is none.
    Default is `false`.

## Contribute

See [`contributing.md` in `remarkjs/remark`][contributing] for ways to get
started.

This organisation has a [Code of Conduct][coc].  By interacting with this
repository, organisation, or community you agree to abide by its terms.

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

[node-badge]: https://img.shields.io/node/v/remark-git-contributors.svg

[node]: https://www.npmjs.org/package/remark-git-contributors

[travis-badge]: https://img.shields.io/travis/remarkjs/remark-git-contributors.svg?label=travis

[travis]: https://travis-ci.org/remarkjs/remark-git-contributors

[appveyor-badge]: https://img.shields.io/appveyor/ci/remarkjs/remark-git-contributors.svg?label=appveyor

[appveyor]: https://ci.appveyor.com/project/remarkjs/remark-git-contributors

[coverage-badge]: https://img.shields.io/codecov/c/github/remarkjs/remark-git-contributors.svg

[coverage]: https://codecov.io/github/remarkjs/remark-git-contributors

[dependencies-badge]: https://img.shields.io/david/remarkjs/remark-git-contributors.svg

[dependencies]: https://david-dm.org/remarkjs/remark-git-contributors

[standard-badge]: https://img.shields.io/badge/code_style-standard-brightgreen.svg

[standard]: https://standardjs.com

[chat-badge]: https://img.shields.io/badge/join%20the%20community-on%20spectrum-7b16ff.svg

[chat]: https://spectrum.chat/unified/remark

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[remark]: https://github.com/remarkjs/remark

[contributors]: https://github.com/remarkjs/remark-contributors

[npm]: https://docs.npmjs.com/cli/install

[cli]: https://github.com/remarkjs/remark/tree/master/packages/remark-cli

[api]: #api

[level-community]: https://www.npmjs.com/package/level-community

[fields]: https://docs.npmjs.com/files/package.json#people-fields-author-contributors

[cwd]: https://github.com/vfile/vfile#vfilecwd

[contributing]: https://github.com/remarkjs/remark/blob/master/contributing.md

[coc]: https://github.com/remarkjs/remark/blob/master/code-of-conduct.md

[license]: license
