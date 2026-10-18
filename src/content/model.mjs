import {hasPrintContract,isTemplateProduct,upgradeCollections} from '../designs/products.mjs';
export const defaultPricing={single:5000,six:25000,ten:40000};
export const groups = ['All collections', 'Learning & play', 'Everyday favourites', 'Gifts & occasions', 'Your photos', 'Business & work', 'Home & handy'];
const products = [
  {id:'alphabet', name:'The alphabet club', group:groups[1], image:'cutouts/alphabet-pack-glossy.webp', description:'Little letters. Big discoveries.', details:'An A–Z collection for spelling names, finding letters and playing with words.', tags:'abc letters preschool school'},
  {id:'counting', name:'Count on a little fun', group:groups[1], image:'cutouts/counting-pack-glossy.webp', description:'Little numbers. Big fun.', details:'Numbers and matching illustrations for counting together. The collection runs from 1 to 10.', tags:'123 numbers dots preschool maths'},
  {id:'words', name:'My first words', group:groups[1], image:'collections/first-words.webp', description:'See it. Say it. Stick it.', details:'Friendly pictures paired with simple words. Choose from nine everyday words, including apple, tree, sun, cat and dog.', tags:'apple tree sun cat preschool vocabulary reading'},
  {id:'colours', name:'The colour club', group:groups[1], image:'collections/colour-club.webp', description:'A little colour. A lot to discover.', details:'Nine colours with friendly illustrations and easy-to-read names. Choose your favourites or the full set.', tags:'colors colours green blue pink orange learning cards'},
  {id:'reminders', name:'Little reminders', group:groups[2], image:'collections/little-reminders.webp', description:'A little lift, every day.', details:'Small reminders for your kitchen, desk or someone who needs a lift: you’ve got this, one thing at a time, good things ahead, and make room for joy.', tags:'adult quotes encouragement affirmations home office'},
  {id:'thanks', name:'Little thank-yous', group:groups[3], image:'collections/little-thank-yous.webp', description:'For your favourite kind of human.', details:'Thoughtful little gifts for friends, hosts and everyday heroes. Designs include thank you, my favourite human, you are loved, and best day ever.', tags:'adult gifts friendship wedding birthday thank you'},
  {id:'photos', name:'Your favourite weirdos', group:groups[4], image:'cutouts/05-sunglasses-square.webp', description:'Your photos. Your magnets.', href:'/studio', tags:'personal custom photo magnets'},
  {id:'puzzle', name:'Your picture puzzle', group:groups[4], description:'One photo. A little bigger picture.', href:'/puzzle', tags:'personal puzzle 3x3 5x5 9 25 square'}
];


export const defaultContent={version:1,revision:0,pricing:defaultPricing,images:{logo:'/assets/brand-icon.png',tray:'/assets/cutouts/hero-real-magnets-tray.webp',puzzle:'/assets/sample-coast.webp',hero0:'/assets/cutouts/05-sunglasses-square.webp',hero1:'/assets/cutouts/02-wedding-square.webp',hero2:'/assets/cutouts/03-beach-square.webp',hero3:'/assets/cutouts/04-pink-group-square.webp',hero4:'/assets/cutouts/01-restaurant-square.webp'},products:[...products.slice(0,2),products[6],...products.slice(2,6),products[7]].map(p=>({...p,name:p.id==='photos'?'Your photo magnets':p.name,image:p.image?'/assets/'+p.image:'',status:p.href?'available':'coming-soon',priceCents:null,count:p.id==='alphabet'?26:p.id==='counting'?10:p.href?1:4,featured:['alphabet','counting','puzzle'].includes(p.id),contents:p.id==='alphabet'?'26 uppercase letters, A–Z':p.id==='counting'?'10 number magnets, 1–10':p.href?'': 'Contents to be confirmed'}))};
defaultContent.products=upgradeCollections(defaultContent.products);
export const isPersonal=p=>['photos','puzzle'].includes(p.id);
export const canPurchase=p=>!!p&&!isPersonal(p)&&p.status==='available'&&(p.pricingMode==='per-magnet'?hasPrintContract(p):Number.isSafeInteger(p.priceCents)&&p.priceCents>0);
export function validImage(src){return typeof src==='string'&&(src===''||/^\/assets\/[a-zA-Z0-9_./%-]+$/.test(src)&&!src.includes('..')||/^https:\/\/[^\s]+$/.test(src)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src));}
export function validateContent(c){
 const fail=m=>{throw new Error(m)};
 if(!c||c.version!==1||!Number.isSafeInteger(c.revision)||c.revision<0)fail('Unsupported content file.');
 const p=c.pricing;
 if(!p||![p.single,p.six,p.ten].every(v=>Number.isSafeInteger(v)&&v>0&&v<=10000000)||p.six<5*p.single||p.six>6*p.single||p.ten<Math.round(p.six*1.5/100)*100||p.ten>p.six*10/6||p.ten%10)fail('Pricing must stay consistent: six cost between five and six singles; ten cost between nine and ten magnets at the six-pack rate. The ten-pack total must divide into whole cents.');
 if(!c.images||Object.keys(defaultContent.images).some(k=>!c.images[k]||!validImage(c.images[k])))fail('Choose a valid image for every website slot.');
 if(!Array.isArray(c.products)||c.products.length>100)fail('Use a catalogue of up to 100 products.');
 const ids=new Set();
 for(const p of c.products){
  if(!p||typeof p.id!=='string'||! /^[a-z][a-z0-9-]{0,49}$/.test(p.id)||ids.has(p.id))fail('Product IDs must be unique.');ids.add(p.id);
  for(const k of ['name','description','details','tags','contents'])if(p[k]!==undefined&&(typeof p[k]!=='string'||p[k].length>2000))fail('Keep product text under 2,000 characters.');
  if(!p.name?.trim()||!groups.slice(1).includes(p.group))fail('Every product needs a name and a category.');
  if(!['available','coming-soon','hidden'].includes(p.status))fail('Choose an availability status.');
  if(!Number.isSafeInteger(p.count)||p.count<1||p.count>1000)fail('Magnet count must be a whole number from 1 to 1,000.');
  if(!validImage(p.image)||(!p.image&&!isPersonal(p)&&!hasPrintContract(p)))fail('Choose a valid product image.');
  if(p.priceCents!==null&&(!Number.isSafeInteger(p.priceCents)||p.priceCents<=0||p.priceCents>10000000))fail('Enter a positive product price or leave it blank.');
  if(p.pricingMode!==undefined&&!['fixed','per-magnet'].includes(p.pricingMode))fail('Choose a supported pricing mode.');
  if(p.pricingMode==='per-magnet'&&!hasPrintContract(p))fail('Collection count and print version must match its complete artwork.');
  if(!isPersonal(p)&&p.status==='available'&&!canPurchase(p))fail('An available collection needs a confirmed price.');
  if(isPersonal(p)&&p.status!=='available')fail('Photo magnets and puzzles must remain available.');
  if(p.href&&p.href!==({'photos':'/studio','puzzle':'/puzzle'}[p.id]))fail('Use the built-in product links.');
 }
 if(!ids.has('photos')||!ids.has('puzzle'))fail('Keep the photos and puzzle products in the catalogue.');
 return c;
}
