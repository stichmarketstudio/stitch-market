import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const now = () => new Date().toISOString();
export const id = (prefix = '') => `${prefix}${crypto.randomUUID().slice(0, 8)}`;

function seedData() {
  const designerId = 'usr_maya';
  const buyerId = 'usr_noor';
  const created = '2026-07-18T10:00:00.000Z';
  const base = {
    description: '', category: 'Other', difficulty: 'Beginner', sizes: ['One size'],
    materials: [], tools: [], instructions: [], measurements: [], notes: '', images: [], coverImage: '',
    garmentType: '', sizeChart: [], pieces: [], seamAllowance: '1.5 cm', paperSize: 'A4', tileGuide: true,
    yarnType: '', yarnWeight: '', hookSize: '', gauge: '', abbreviations: [], rows: [], diagram: [],
    status: 'published', favorites: [], collections: [], createdAt: created, updatedAt: created,
  };
  const patterns = [
    {
      ...base, id: 'pat_linen', userId: designerId, type: 'sewing', title: 'The Marlow Linen Dress',
      description: 'A relaxed everyday midi dress with sculptural sleeves, generous pockets and beautifully finished seams.',
      category: 'Dresses', difficulty: 'Intermediate', sizes: ['XS','S','M','L','XL','2XL'], garmentType: 'Midi dress',
      materials: [{name:'Medium-weight linen', quantity:'2.8 m'}, {name:'Matching thread', quantity:'1 spool'}, {name:'Lightweight interfacing', quantity:'0.5 m'}],
      tools: ['Sewing machine','Fabric scissors','Iron','Pins'],
      measurements: [{name:'Bust', value:'84–124', unit:'cm'}, {name:'Waist', value:'66–106', unit:'cm'}, {name:'Finished length', value:'118', unit:'cm'}],
      sizeChart: [{size:'XS', bust:'84', waist:'66', hip:'92'}, {size:'S', bust:'89', waist:'71', hip:'97'}, {size:'M', bust:'94', waist:'76', hip:'102'}, {size:'L', bust:'102', waist:'84', hip:'110'}, {size:'XL', bust:'112', waist:'94', hip:'120'}, {size:'2XL', bust:'124', waist:'106', hip:'132'}],
      pieces: [{name:'Front bodice',width:42,height:58,quantity:1,seamAllowance:'1.5 cm',label:'Cut 1 on fold',markings:'Bust dart, waist notch'}, {name:'Back bodice',width:40,height:58,quantity:1,seamAllowance:'1.5 cm',label:'Cut 1 on fold',markings:'Shoulder notch'}, {name:'Sleeve',width:58,height:46,quantity:2,seamAllowance:'1.5 cm',label:'Cut 2 mirrored',markings:'Front/back notches'}],
      instructions: [{title:'Prepare the bodice',body:'Stay-stitch the neckline, then sew bust darts toward the apex. Press darts downward.'},{title:'Join shoulders and sides',body:'With right sides together, stitch shoulder and side seams. Finish seam allowances and press toward the back.'},{title:'Set the sleeves',body:'Gather sleeve heads between notches. Match the shoulder point and underarm seams, then stitch around the armscye.'},{title:'Finish',body:'Attach the neckline facing, understitch and turn. Hem sleeves and skirt using a narrow double-fold hem.'}],
      price: 14, featured: true, favorites:[buyerId], salesCount: 38,
    },
    {
      ...base, id: 'pat_cardigan', userId: designerId, type: 'crochet', title: 'Cloudline Cardigan',
      description: 'A soft, size-inclusive crochet cardigan with airy texture, drop shoulders and a clean ribbed edge.',
      category: 'Garments', difficulty: 'Confident beginner', sizes: ['XS/S','M/L','XL/2XL','3XL/4XL'],
      materials: [{name:'Merino blend yarn',quantity:'900–1450 m'}, {name:'Stitch markers',quantity:'6'}, {name:'Buttons',quantity:'5'}],
      tools:['Tapestry needle','Scissors','Measuring tape'], yarnType:'Merino blend', yarnWeight:'DK / 3', hookSize:'5 mm', gauge:'16 dc × 9 rows = 10 cm',
      abbreviations:[{term:'ch',meaning:'chain'},{term:'dc',meaning:'double crochet'},{term:'fpdc',meaning:'front post double crochet'},{term:'sl st',meaning:'slip stitch'}],
      rows:[{number:'Foundation',instruction:'Ch 76 (84, 92, 100), turn.',stitchCount:'76 (84, 92, 100)'},{number:'Row 1',instruction:'Dc in 4th ch from hook and each ch across. Turn.',stitchCount:'74 (82, 90, 98)'},{number:'Row 2',instruction:'Ch 3, *skip 1 st, 2 dc in next st; repeat from * across.',stitchCount:'74 (82, 90, 98)'},{number:'Rows 3–42',instruction:'Repeat Row 2, maintaining established texture.',stitchCount:'Even'}],
      instructions:[{title:'Back panel',body:'Work the foundation and texture rows to the length specified for your size. Fasten off after a wrong-side row.'},{title:'Front panels',body:'Make two mirrored panels. Begin neckline shaping 12 cm before the final row.'},{title:'Assembly',body:'Block pieces to measurements. Seam shoulders, set sleeve panels, then close side and sleeve seams.'},{title:'Ribbed edge',body:'Join yarn at lower front edge. Work post-stitch ribbing evenly around fronts and neckline.'}],
      diagram:[['○','○','○','○','○','○'],['†','·','†','·','†','·'],['†','†','†','†','†','†']],
      price: 11, featured: true, favorites:[], salesCount: 61,
    },
    {
      ...base, id:'pat_tote', userId:buyerId, type:'sewing', title:'Market Day Tote', description:'A sturdy lined tote with boxed corners and an interior pocket.', category:'Bags', difficulty:'Beginner', sizes:['One size'], garmentType:'Tote bag',
      materials:[{name:'Canvas',quantity:'1 m'},{name:'Cotton lining',quantity:'1 m'}], tools:['Sewing machine','Ruler'],
      pieces:[{name:'Main panel',width:48,height:52,quantity:2,seamAllowance:'1 cm',label:'Cut 2 outer + 2 lining',markings:'Box corners at 6 cm'}],
      instructions:[{title:'Cut and prepare',body:'Cut all panels and transfer corner markings.'},{title:'Assemble',body:'Sew outer and lining bags, box corners, then join at the top edge.'}], price:7, featured:false, favorites:[designerId], salesCount:12,
    },
    {
      ...base, id:'pat_blossom', userId:buyerId, type:'crochet', title:'Blossom Baby Blanket', description:'A modern floral-motif baby blanket with a simple join-as-you-go border.', category:'Home', difficulty:'Intermediate', sizes:['Cot','Throw'], yarnType:'Organic cotton', yarnWeight:'Worsted / 4', hookSize:'5.5 mm', gauge:'One motif = 12 cm',
      materials:[{name:'Organic cotton yarn',quantity:'1200 m'}], tools:['Hook','Tapestry needle'], abbreviations:[{term:'sc',meaning:'single crochet'},{term:'dc',meaning:'double crochet'}],
      rows:[{number:'Round 1',instruction:'Into magic ring: ch 3, 11 dc, join.',stitchCount:'12 dc'},{number:'Round 2',instruction:'Ch 1, 2 sc in each stitch around, join.',stitchCount:'24 sc'}],
      instructions:[{title:'Make motifs',body:'Work rounds 1–6 for each floral square.'},{title:'Join',body:'Join motifs on the final round following the layout chart.'}], price:9, featured:true, favorites:[], salesCount:24,
    },
    {
      ...base, id:'pat_wrap_draft', userId:designerId, type:'sewing', title:'Solstice Wrap Top', description:'An elegant wrap top currently in development.', category:'Tops', difficulty:'Intermediate', sizes:['XS','S','M','L','XL'], garmentType:'Wrap top', status:'draft', price:12, featured:false, salesCount:0,
      materials:[{name:'Viscose or silk',quantity:'1.8 m'}], tools:['Sewing machine'], instructions:[{title:'Test construction',body:'Baste side seams and check wrap coverage before finishing.'}],
    },
  ];
  return {
    users: [
      {id:designerId,name:'Maya Chen',studio:'Thread & Form Studio',email:'maya@stitch.market',passwordHash:bcrypt.hashSync('demo123',10),bio:'Independent pattern designer creating thoughtful, wearable pieces.',location:'Portland, OR',avatarColor:'#d16f52',joinedAt:created},
      {id:buyerId,name:'Noor Ahmad',studio:'Soft Loop Patterns',email:'noor@stitch.market',passwordHash:bcrypt.hashSync('demo123',10),bio:'Crochet maker and slow-fashion enthusiast.',location:'Islamabad, PK',avatarColor:'#5d7f78',joinedAt:created},
    ],
    patterns,
    orders:[{id:'ord_seed1',buyerId,patternId:'pat_linen',sellerId:designerId,amount:14,status:'paid',createdAt:'2026-08-12T12:10:00.000Z'}],
    reviews:[{id:'rev_seed1',userId:buyerId,patternId:'pat_linen',rating:5,comment:'Beautifully drafted and the instructions are exceptionally clear.',createdAt:'2026-08-14T09:00:00.000Z'}],
  };
}

export function createStore(filePath) {
  const absolute = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolute), {recursive:true});
  if (!fs.existsSync(absolute)) fs.writeFileSync(absolute, JSON.stringify(seedData(), null, 2));
  let data = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  const save = () => {
    const tmp = `${absolute}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, absolute);
  };
  return {
    get data(){ return data; },
    save,
    reset(){ data = seedData(); save(); },
    insert(collection, item){ data[collection].push(item); save(); return item; },
    remove(collection, predicate){ const before=data[collection].length; data[collection]=data[collection].filter(x=>!predicate(x)); if(before!==data[collection].length) save(); },
    touch(){ save(); },
  };
}

export function blankPattern(userId, input={}) {
  const stamp=now();
  return {
    id:id('pat_'), userId, type:input.type==='crochet'?'crochet':'sewing', title:input.title||'Untitled pattern',
    description:'', category:input.type==='crochet'?'Garments':'Apparel', difficulty:'Beginner', sizes:['One size'],
    materials:[], tools:[], instructions:[{title:'Getting started',body:''}], measurements:[], notes:'', images:[], coverImage:'',
    garmentType:'', sizeChart:[], pieces:[], seamAllowance:'1.5 cm', paperSize:'A4', tileGuide:true,
    yarnType:'', yarnWeight:'', hookSize:'', gauge:'', abbreviations:[], rows:[], diagram:[],
    status:'draft', price:0, featured:false, favorites:[], collections:[], salesCount:0, createdAt:stamp, updatedAt:stamp,
  };
}
