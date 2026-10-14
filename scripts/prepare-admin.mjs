import {rename,rm,writeFile} from 'node:fs/promises';
await rename('dist/admin/admin/index.html','dist/admin/index.html');await rm('dist/admin/admin',{recursive:true});for(const name of ['_routes.json','_redirects','_headers','sitemap.xml','content.json'])await rm('dist/admin/'+name,{force:true});await writeFile('dist/admin/robots.txt','User-agent: *\nDisallow: /\n');
