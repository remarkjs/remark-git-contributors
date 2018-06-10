# remark-git-contributors

> Asynchronous [`remark`](https://github.com/remarkjs/remark) plugin to inject `git` contributors into a markdown table. Collects contributors from `git` history, deduplicates them, augments it with metadata found in options, a module or `package.json` and calls [`remark-contributors`](https://github.com/hughsk/remark-contributors) to render the markdown table.

[![npm status](http://img.shields.io/npm/v/remark-git-contributors.svg?style=flat-square)](https://www.npmjs.org/package/remark-git-contributors)
[![node](https://img.shields.io/node/v/remark-git-contributors.svg?style=flat-square)](https://www.npmjs.org/package/remark-git-contributors)
[![Travis build status](https://img.shields.io/travis/vweevers/remark-git-contributors.svg?style=flat-square&label=travis)](http://travis-ci.org/vweevers/remark-git-contributors)
[![AppVeyor build status](https://img.shields.io/appveyor/ci/vweevers/remark-git-contributors.svg?style=flat-square&label=appveyor)](https://ci.appveyor.com/project/vweevers/remark-git-contributors)
[![Dependency status](https://img.shields.io/david/vweevers/remark-git-contributors.svg?style=flat-square)](https://david-dm.org/vweevers/remark-git-contributors)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg?style=flat-square)](https://standardjs.com)

## Table of Contents

-   [Usage](#usage)
-   [API](#api)
-   [Install](#install)
-   [Contributors](#contributors)
-   [License](#license)

## Usage

With [`remark-cli`](https://www.npmjs.com/package/remark-cli), modifying a markdown file in place (`-o`):

    remark --use remark-git-contributors README.md -o

### Injection

Injecting a contributors section is opt-in: if a `## Contributors` heading is not found in the markdown (case- and level-insensitive), the plugin is a noop. It differs from `remark-contributors` in this regard.

If the plugin is run on a `README.md` (case- and extension-insensitive), it will render the top 10 contributors (by commit count). Otherwise it renders all contributors - for example to a `CONTRIBUTORS.md` file.

What you might want to do: prior to running `remark`, add a `# Contributors` heading to a `CONTRIBUTORS.md` but not to `README.md`. This way you can use the same pipeline (possibly with other plugins) on both files, only injecting contributors into one:

    remark --use remark-git-contributors README.md CONTRIBUTORS.md -o

### Metadata

To augment user metadata, configure the plugin in your `package.json`:

```json
"remarkConfig": {
  "plugins": {
    "remark-git-contributors": <options>
  }
}
```

Where `options` is either:

-   An object in the form of `{ contributors }`;
-   A module id (or path to a file) that exports `contributors` or `{ contributors }`. Resolved relative to the [`cwd`](https://github.com/vfile/vfile#vfilecwd) of the markdown file or `process.cwd()` if it doesn't resolve.

An an example, `level-js` uses metadata stored in [`level-community`](https://www.npmjs.com/package/level-community):

```json
"remarkConfig": {
  "plugins": {
    "remark-git-contributors": "level-community"
  }
}
```

Alternatively, add the metadata inline:

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

The `contributors` value should be an array in the form of:

```js
[{ email, name, .. }, ..]
```

The `email` property is required.

### Package Metadata

You can also add metadata to the [`author` or `contributors` fields](https://docs.npmjs.com/files/package.json#people-fields-author-contributors) in `package.json`. For example:

```json
"author": {
  "name": "Sara",
  "email": "sara@example.com",
  "github": "sara",
  "twitter": "sara"
}
```

### Supported Metadata

-   `name`: overrides the name stored in git commits
-   `github`: GitHub username
-   `twitter`: twitter username
-   `mastodon`: mastodon with format `@user@domain`

## API

### `contributors([options])`

## Install

With [npm](https://npmjs.org) do:

    npm install remark-git-contributors

## Contributors

| Name                | GitHub                                       | Social                                                |
| ------------------- | -------------------------------------------- | ----------------------------------------------------- |
| **Vincent Weevers** | [**@vweevers**](https://github.com/vweevers) | [**@vweevers@twitter**](https://twitter.com/vweevers) |

## License

[MIT](http://opensource.org/licenses/MIT) © 2018-present Vincent Weevers
