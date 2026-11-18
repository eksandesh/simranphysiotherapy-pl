import {build} from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import {readFile,writeFile} from 'node:fs/promises'
await build({stdin:{contents:`import {createRoot} from 'react-dom/client';import Workspace from './components/clinic-workspace';createRoot(document.getElementById('clinic')).render(<Workspace/>);`,loader:'tsx',resolveDir:process.cwd()},outfile:'public/offline-app.js',bundle:true,jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'}})
const css=await postcss([tailwind()]).process(await readFile('app/globals.css','utf8'),{from:'app/globals.css'})
await writeFile('public/offline-app.css',css.css)
