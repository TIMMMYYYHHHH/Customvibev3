import {routeStyleCatalogue,composeRouteStyles} from '../shared/route-styles.mjs';
import {readFile,rename,rm,writeFile,mkdir,copyFile} from 'node:fs/promises';
await rename('dist/admin/admin/index.html','dist/admin/index.html');await rename('dist/admin/admin/themes.html','dist/admin/themes.html');await rename('dist/admin/admin/preview.html','dist/admin/preview.html');await rm('dist/admin/admin',{recursive:true});for(const name of ['_routes.json','_redirects','_headers','sitemap.xml','content.json'])await rm('dist/admin/'+name,{force:true});await writeFile('dist/admin/robots.txt','User-agent: *\nDisallow: /\n');

// The sign-in screen uses the same local brand fonts before authentication.
await mkdir('dist/admin/admin-brand',{recursive:true});
await copyFile('src/assets/fonts/fredoka-latin-wght-normal.woff2','dist/admin/admin-brand/fredoka.woff2');
await copyFile('src/assets/fonts/dm-sans-latin-wght-normal.woff2','dist/admin/admin-brand/dm-sans.woff2');
await writeFile('dist/admin/admin-brand/fonts.css',"@font-face{font-family:'Fredoka Variable';font-style:normal;font-weight:300 700;font-display:swap;src:url('./fredoka.woff2') format('woff2')}@font-face{font-family:'DM Sans Variable';font-style:normal;font-weight:100 1000;font-display:swap;src:url('./dm-sans.woff2') format('woff2')}");

await copyFile('public/coming-soon/puzzle-logo-v2.png','dist/admin/admin-brand/puzzle-logo-v2.png');

const routeStyles=routeStyleCatalogue(JSON.parse(await readFile('dist/admin/.vite/manifest.json','utf8')),'admin/preview.html');
for(const href of routeStyles.checkout)await readFile('dist/admin'+href);
const preview=await readFile('dist/admin/preview.html','utf8');
await writeFile('dist/admin/preview.html',composeRouteStyles(preview,routeStyles,'/'));
