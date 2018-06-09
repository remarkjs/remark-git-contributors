# remark-gh-contributors [wip]

> Asynchronous [`remark`](https://github.com/remarkjs/remark) plugin to inject GitHub contributors into a markdown table. Pulls contributors from the GitHub API, augments it with metadata found in options, a module or `package.json` and calls [`remark-contributors`](https://github.com/hughsk/remark-contributors) to render the markdown table.

[![npm status](http://img.shields.io/npm/v/remark-gh-contributors.svg?style=flat-square)](https://www.npmjs.org/package/remark-gh-contributors)
[![node](https://img.shields.io/node/v/remark-gh-contributors.svg?style=flat-square)](https://www.npmjs.org/package/remark-gh-contributors)
[![Travis build status](https://img.shields.io/travis/vweevers/remark-gh-contributors.svg?style=flat-square&label=travis)](http://travis-ci.org/vweevers/remark-gh-contributors)
[![AppVeyor build status](https://img.shields.io/appveyor/ci/vweevers/remark-gh-contributors.svg?style=flat-square&label=appveyor)](https://ci.appveyor.com/project/vweevers/remark-gh-contributors)
[![Dependency status](https://img.shields.io/david/vweevers/remark-gh-contributors.svg?style=flat-square)](https://david-dm.org/vweevers/remark-gh-contributors)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg?style=flat-square)](https://standardjs.com)

## Table of Contents

-   [Usage](#usage)
-   [API](#api)
-   [Install](#install)
-   [Contributors](#contributors)
-   [License](#license)

## Usage

With [`remark-cli`](https://www.npmjs.com/package/remark-cli), modifying a markdown file in place (`-o`):

    GITHUB_TOKEN=xx remark --use remark-gh-contributors README.md -o

If no token is provided, the plugin is a noop. The GitHub repository URL is taken from a nearby `package.json`.

### Injection

Injecting a contributors section is opt-in: if a `## Contributors` heading is not found in the markdown (case- and level-insensitive), the plugin is a noop. It differs from `remark-contributors` in this regard.

If the plugin is run on a `README.md` (case- and extension-insensitive), it will render the top 10 contributors. Otherwise it renders all contributors - for example to a `CONTRIBUTORS.md` file.

What you might want to do: prior to running `remark`, add a `# Contributors` heading to a `CONTRIBUTORS.md` but not to `README.md`. This way you can use the same pipeline (possibly with other plugins) on both files, only injecting contributors into one:

    remark --use remark-gh-contributors README.md CONTRIBUTORS.md -o

### Metadata

To augment or override GitHub user profile data, configure the plugin in your `package.json`:

```json
"remarkConfig": {
  "plugins": {
    "remark-gh-contributors": <options>
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
    "remark-gh-contributors": "level-community"
  }
}
```

Alternatively, add the metadata inline:

```json
"remarkConfig": {
  "plugins": {
    "remark-gh-contributors": {
      "contributors": [
        { "name": "Sara", "github": "sara" }
      ]
    }
  }
}
```

The `contributors` value should be either:

-   An array in the form of `[{ github: 'vweevers', name: 'Vincent Weevers' }]`;
-   An object in the form of `{ vweevers: { name: 'Vincent Weevers' } }`.

### Package Metadata

You can also add metadata to the [`author` or `contributors` fields](https://docs.npmjs.com/files/package.json#people-fields-author-contributors) in `package.json`. For example:

```json
"author": {
  "name": "Sara",
  "github": "sara",
  "twitter": "sara"
}
```

### Supported Metadata

-   `name`: overrides the name from the GitHub profile
-   `twitter`: a twitter username or URL

## API

### `contributors([options])`

## Install

With [npm](https://npmjs.org) do:

    npm install remark-gh-contributors

## Contributors

| Name                | GitHub                                       | Social                                                |
| ------------------- | -------------------------------------------- | ----------------------------------------------------- |
| **Vincent Weevers** | [**@vweevers**](https://github.com/vweevers) | [**@vweevers@twitter**](https://twitter.com/vweevers) |

## License

[MIT](http://opensource.org/licenses/MIT) © 2018-present Vincent Weevers
