import { build } from 'esbuild'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: [path.join(__dirname, 'src/widget.ts')],
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['es2018'],
  format: 'iife',
  define: {
    'process.env.WIDGET_API_URL': JSON.stringify(
      process.env.WIDGET_API_URL || 'https://smart-pdf-backend.onrender.com'
    ),
  },
  outfile: path.join(__dirname, '../frontend/public/widget.js'),
})

console.log('widget.js built → frontend/public/widget.js')
