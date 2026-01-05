import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import replace from '@rollup/plugin-replace'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
    server: {
        open: '/demo/',
        port: 8000
    },
    resolve: {
        conditions: ['browser', 'development']
    },
    plugins: [
        replace({
            versionplaceholder: pkg.version,
            preventAssignment: true
        })
    ],
    build: {
        lib: {
            entry: 'src/widget-overlay.ts',
            formats: ['es'],
            fileName: 'widget-overlay'
        },
        sourcemap: true,
        rollupOptions: {
            external: ['lit', 'lit/decorators.js', 'lit/static-html.js'],
            output: {
                banner: '/* @license Copyright (c) 2023 Record Evolution GmbH. All rights reserved.*/'
            }
        }
    }
})
