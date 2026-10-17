// Embedded licensed font bytes make print rendering independent of protected font requests.
import font0 from '@fontsource-variable/fredoka/files/fredoka-hebrew-wght-normal.woff2?inline';
import font1 from '@fontsource-variable/fredoka/files/fredoka-latin-ext-wght-normal.woff2?inline';
import font2 from '@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2?inline';
import font3 from '@fontsource-variable/dm-sans/files/dm-sans-latin-ext-wght-normal.woff2?inline';
import font4 from '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?inline';
let ready;
export function loadArtworkFonts(){return ready ||= Promise.all([{source:font0,family:'CustomVibe Print Heading',weight:'300 700',unicodeRange:'U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F'},{source:font1,family:'CustomVibe Print Heading',weight:'300 700',unicodeRange:'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'},{source:font2,family:'CustomVibe Print Heading',weight:'300 700',unicodeRange:'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'},{source:font3,family:'CustomVibe Print Body',weight:'100 1000',unicodeRange:'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'},{source:font4,family:'CustomVibe Print Body',weight:'100 1000',unicodeRange:'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'}].map(async ({source,family,...descriptors})=>{
 const bytes=Uint8Array.from(atob(source.split(',')[1]),c=>c.charCodeAt(0));
 const face=new FontFace(family,bytes,descriptors);await face.load();document.fonts.add(face);
})).catch(error=>{ready=null;throw error});}
