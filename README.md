# Shoulder

[![NPM version](https://img.shields.io/npm/v/shoulder.svg)](https://www.npmjs.com/package/shoulder)
[![Build Status](https://img.shields.io/travis/alexjeffburke/shoulder/master.svg)](https://travis-ci.org/alexjeffburke/shoulder)
[![Coverage Status](https://img.shields.io/coveralls/alexjeffburke/shoulder/master.svg)](https://coveralls.io/r/alexjeffburke/shoulder?branch=master)

Automatically find projects dependent on a particular package.

## Use

To check the dependent projects of a particular package the Shoulder binary can be invoked via `npx`
and supplied a package name:

```
npx shoulder fugl
```

### devDependencies via Libraries.IO

By default, Shoulder uses dependents information from npm. One limitation of this data is that it
only includes information about modules listed as direct depedents.

In order to fetch `devDependencies`, the tool is also integrated with [Libraries.IO](https://libraries.io).
Signing up for this tool will provide you with an API key which can be used with Shoulder as follows:

```
npx shoulder fugl --librariesio <api_key>
```

## Metrics

Shoulder supports a number of methods for determing the popularity of the dependent packages.
The chosen metric is used to order the dependent packages in descending order of popularity.

> Defaults to **downloads**

### Downloads

Use npm downloads statistics over the last week.

```
npx shoulder unexpected --metric downloads
```

### Stars

Use the total number of repository stars on GitHub.

```
npx shoulder unexpected --metric stars
```
