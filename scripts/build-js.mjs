#!/usr/bin/env node

// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import path from 'node:path'
import esbuild from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { entryChunksPlugin } from 'esbuild-plugin-entry-chunks'
import minimist from 'minimist'
import glob from 'fast-glob'

const argv = minimist(process.argv.slice(2), {
  default: {
    entry: './src/index.ts',
    external: 'node:*',
    bundle: 'src', // 'all' | 'none'
    license: 'eof',
    minify: false,
    sourcemap: false,
    target: 'node12',
    cwd: process.cwd(),
  },
  boolean: ['minify', 'sourcemap'],
  string: ['entry', 'external', 'bundle', 'license', 'map', 'cwd'],
})
const { entry, external, bundle, minify, sourcemap, license, cwd: _cwd } = argv

const plugins = []
const cwd = Array.isArray(_cwd) ? _cwd[_cwd.length - 1] : _cwd
const entries = entry.split(/,\s?/)
const entryPoints = entry.includes('*')
  ? await glob(entries, { absolute: false, onlyFiles: true, cwd, root: cwd })
  : entries.map((p) => path.relative(cwd, path.resolve(cwd, p)))

const _bundle = bundle !== 'none' && !process.argv.includes('--no-bundle')
const _external = _bundle ? external.split(',') : undefined // https://github.com/evanw/esbuild/issues/1466

if (_bundle && entryPoints.length > 1) {
  plugins.push(entryChunksPlugin())
}

// https://github.com/evanw/esbuild/issues/619
// https://github.com/pradel/esbuild-node-externals/pull/52
if (bundle === 'src') {
  plugins.push(nodeExternalsPlugin())
}

const config = {
  absWorkingDir: cwd,
  entryPoints,
  outdir: './build',
  bundle: _bundle,
  external: _external,
  minify,
  sourcemap,
  sourcesContent: false,
  platform: 'node',
  target: 'esnext',
  format: 'esm',
  plugins,
  legalComments: license,
  tsconfig: './tsconfig.json',
}

console.log('esbuild config:', config)

await esbuild.build(config).catch(() => process.exit(1))

process.exit(0)
