import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  return {
    plugins: [
      vue(),
      ...(isLib
        ? [
            dts({
              insertTypesEntry: true,
              include: ['src/**/*'],
              exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts']
            })
          ]
        : [])
    ],
    ...(isLib
      ? {
          build: {
            lib: {
              entry: resolve(__dirname, 'src/index.ts'),
              name: 'BasicComponents',
              formats: ['es', 'cjs'],
              fileName: (format) => `index.${format === 'es' ? 'esm' : 'js'}.js`
            },
            rollupOptions: {
              external: ['vue', 'element-plus', 'vxe-table', 'axios'],
              output: {
                globals: {
                  vue: 'Vue',
                  'element-plus': 'ElementPlus',
                  'vxe-table': 'VxeTable',
                  axios: 'axios'
                }
              }
            }
          }
        }
      : {}),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  }
})

