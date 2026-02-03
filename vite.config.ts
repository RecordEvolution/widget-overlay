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
        conditions: ['browser']
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
            output: {
                banner: '/* @license Copyright (c) 2025 Record Evolution GmbH. All rights reserved.*/'
            }
        }
    }
})
