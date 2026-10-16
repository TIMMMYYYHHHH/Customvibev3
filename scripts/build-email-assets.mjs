// Regenerate decorative email artwork only. The wordmark, heading and signoff are live HTML.
// Uses sharp from the authoring environment; normal builds use checked-in PNGs.
import {copyFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
await copyFile(new URL('../public/icon-192.png',import.meta.url),new URL('../server/email-assets/icon.png',import.meta.url));
// Transparent canvas, no cream rectangle or light outline. Mid-tone berry works on light and dark.
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 506 58" width="1048" height="120"><path d="M0 35 C100 8 174 55 242 30 C280 14 256 0 249 17 C239 40 330 50 500 17" fill="none" stroke="#a66b83" stroke-width="2.5" stroke-linecap="round"/><path d="M433 20 C429 15 422 11 423 7 C424 1 431 2 433 7 C436 1 442 2 442 7 C442 12 436 17 433 20" fill="none" stroke="#a66b83" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
await writeFile(new URL('../server/email-assets/thread.png',import.meta.url),await sharp(Buffer.from(svg)).png().toBuffer());
