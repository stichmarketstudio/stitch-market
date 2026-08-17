import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createStore, blankPattern, id } from './store.js';
import { streamPatternPdf } from './pdf.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'..');
const SECRET=process.env.JWT_SECRET||'stitch-market-local-development-secret';
const cleanUser=({passwordHash,...user})=>user;
const stamp=()=>new Date().toISOString();

export function createApp({dbPath=path.join(root,'data','db.json')}={}){
  const app=express();
  const store=createStore(dbPath);
  app.locals.store=store;
  app.use(express.json({limit:'10mb'}));

  const sign=user=>jwt.sign({id:user.id,email:user.email},SECRET,{expiresIn:'7d'});
  const auth=(req,res,next)=>{
    const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');
    if(!token) return res.status(401).json({error:'Please sign in to continue.'});
    try{
      const payload=jwt.verify(token,SECRET);
      const user=store.data.users.find(u=>u.id===payload.id);
      if(!user) throw new Error('Unknown user');
      req.user=user; next();
    }catch{return res.status(401).json({error:'Your session has expired. Please sign in again.'});}
  };
  const optionalAuth=(req,_res,next)=>{
    const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');
    try{if(token){const p=jwt.verify(token,SECRET); req.user=store.data.users.find(u=>u.id===p.id);}}catch{}
    next();
  };
  const owned=(req,res)=>{
    const p=store.data.patterns.find(x=>x.id===req.params.id);
    if(!p) {res.status(404).json({error:'Pattern not found.'});return null;}
    if(p.userId!==req.user.id){res.status(403).json({error:'You do not have permission to edit this pattern.'});return null;}
    return p;
  };
  const enrich=p=>{
    const creator=store.data.users.find(u=>u.id===p.userId);
    const reviews=store.data.reviews.filter(r=>r.patternId===p.id);
    return {...p,creator:creator?{id:creator.id,name:creator.name,studio:creator.studio,avatarColor:creator.avatarColor}:null,
      rating:reviews.length?reviews.reduce((s,r)=>s+r.rating,0)/reviews.length:0,reviewCount:reviews.length};
  };

  app.get('/api/health',(_req,res)=>res.json({ok:true,service:'Stitch Market API'}));

  app.post('/api/auth/register',async(req,res)=>{
    const {name,email,password,studio=''}=req.body||{};
    if(!name?.trim()||!email?.trim()||!password) return res.status(400).json({error:'Name, email and password are required.'});
    if(password.length<6) return res.status(400).json({error:'Password must be at least 6 characters.'});
    if(store.data.users.some(u=>u.email.toLowerCase()===email.trim().toLowerCase())) return res.status(409).json({error:'An account with this email already exists.'});
    const user={id:id('usr_'),name:name.trim(),email:email.trim().toLowerCase(),passwordHash:await bcrypt.hash(password,10),studio:studio.trim(),bio:'',location:'',avatarColor:'#d77559',joinedAt:stamp()};
    store.insert('users',user);
    res.status(201).json({token:sign(user),user:cleanUser(user)});
  });

  app.post('/api/auth/login',async(req,res)=>{
    const {email,password}=req.body||{};
    const user=store.data.users.find(u=>u.email.toLowerCase()===String(email||'').trim().toLowerCase());
    if(!user||!await bcrypt.compare(String(password||''),user.passwordHash)) return res.status(401).json({error:'Incorrect email or password.'});
    res.json({token:sign(user),user:cleanUser(user)});
  });

  app.get('/api/auth/me',auth,(req,res)=>res.json(cleanUser(req.user)));
  app.put('/api/profile',auth,(req,res)=>{
    const allowed=['name','studio','bio','location','avatarColor'];
    allowed.forEach(k=>{if(req.body[k]!==undefined)req.user[k]=String(req.body[k]).trim();});
    store.touch(); res.json(cleanUser(req.user));
  });

  app.get('/api/dashboard',auth,(req,res)=>{
    const patterns=store.data.patterns.filter(p=>p.userId===req.user.id);
    const sales=store.data.orders.filter(o=>o.sellerId===req.user.id&&o.status==='paid');
    const revenue=sales.reduce((sum,o)=>sum+Number(o.amount||0),0);
    const recent=[...patterns].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,4).map(enrich);
    res.json({stats:{patterns:patterns.length,drafts:patterns.filter(p=>p.status==='draft').length,published:patterns.filter(p=>p.status==='published').length,sales:sales.length,revenue},recent});
  });

  app.get('/api/patterns',auth,(req,res)=>{
    const {status,type,search,category,collection,favorite}=req.query;
    // Favorites may belong to other creators; the regular library remains owner-only.
    let items=favorite==='true'
      ? store.data.patterns.filter(p=>p.status==='published'&&p.favorites?.includes(req.user.id))
      : store.data.patterns.filter(p=>p.userId===req.user.id);
    if(status&&status!=='all')items=items.filter(p=>p.status===status);
    if(type&&type!=='all')items=items.filter(p=>p.type===type);
    if(category&&category!=='all')items=items.filter(p=>p.category===category);
    if(collection)items=items.filter(p=>p.collections?.includes(collection));
    if(favorite==='true')items=items.filter(p=>p.favorites?.includes(req.user.id));
    if(search){const q=search.toLowerCase();items=items.filter(p=>`${p.title} ${p.description} ${p.category}`.toLowerCase().includes(q));}
    items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    res.json(items.map(enrich));
  });

  app.post('/api/patterns',auth,(req,res)=>{
    if(!['sewing','crochet'].includes(req.body.type)) return res.status(400).json({error:'Choose sewing or crochet.'});
    const pattern=blankPattern(req.user.id,req.body);
    store.insert('patterns',pattern); res.status(201).json(enrich(pattern));
  });

  app.get('/api/patterns/:id',optionalAuth,(req,res)=>{
    const p=store.data.patterns.find(x=>x.id===req.params.id);
    if(!p) return res.status(404).json({error:'Pattern not found.'});
    if(p.status!=='published'&&p.userId!==req.user?.id) return res.status(404).json({error:'Pattern not found.'});
    res.json(enrich(p));
  });

  app.put('/api/patterns/:id',auth,(req,res)=>{
    const p=owned(req,res); if(!p)return;
    const allowed=['type','title','description','category','difficulty','sizes','materials','tools','instructions','measurements','notes','images','coverImage','garmentType','sizeChart','pieces','seamAllowance','paperSize','tileGuide','yarnType','yarnWeight','hookSize','gauge','abbreviations','rows','diagram','status','price','collections'];
    allowed.forEach(k=>{if(req.body[k]!==undefined)p[k]=req.body[k];});
    p.price=Math.max(0,Number(p.price)||0);
    if(!['draft','published'].includes(p.status))p.status='draft';
    p.updatedAt=stamp(); store.touch(); res.json(enrich(p));
  });

  app.delete('/api/patterns/:id',auth,(req,res)=>{
    const p=owned(req,res); if(!p)return;
    if(store.data.orders.some(o=>o.patternId===p.id&&o.status==='paid')) return res.status(409).json({error:'Patterns with sales cannot be deleted. Unpublish it instead.'});
    store.remove('patterns',x=>x.id===p.id); res.status(204).end();
  });

  app.post('/api/patterns/:id/favorite',auth,(req,res)=>{
    const p=store.data.patterns.find(x=>x.id===req.params.id);
    if(!p||p.status!=='published')return res.status(404).json({error:'Pattern not found.'});
    p.favorites=p.favorites||[];
    const on=p.favorites.includes(req.user.id);
    p.favorites=on?p.favorites.filter(x=>x!==req.user.id):[...p.favorites,req.user.id];
    store.touch(); res.json({favorite:!on,count:p.favorites.length});
  });

  app.get('/api/collections',auth,(req,res)=>{
    const names=[...new Set(store.data.patterns.filter(p=>p.userId===req.user.id).flatMap(p=>p.collections||[]))];
    res.json(names.map(name=>({name,count:store.data.patterns.filter(p=>p.userId===req.user.id&&p.collections?.includes(name)).length})));
  });

  app.get('/api/patterns/:id/export',auth,(req,res)=>{
    const p=store.data.patterns.find(x=>x.id===req.params.id);
    if(!p)return res.status(404).json({error:'Pattern not found.'});
    const hasOrder=store.data.orders.some(o=>o.patternId===p.id&&o.buyerId===req.user.id&&o.status==='paid');
    if(p.userId!==req.user.id&&p.price>0&&!hasOrder)return res.status(403).json({error:'Purchase this pattern to download it.'});
    const creator=store.data.users.find(u=>u.id===p.userId);
    streamPatternPdf(res,p,creator,req.query.format==='letter'?'letter':'a4');
  });

  app.get('/api/marketplace',optionalAuth,(req,res)=>{
    let items=store.data.patterns.filter(p=>p.status==='published');
    const {type,category,difficulty,search,sort='featured'}=req.query;
    if(type&&type!=='all')items=items.filter(p=>p.type===type);
    if(category&&category!=='all')items=items.filter(p=>p.category===category);
    if(difficulty&&difficulty!=='all')items=items.filter(p=>p.difficulty===difficulty);
    if(search){const q=search.toLowerCase();items=items.filter(p=>`${p.title} ${p.description} ${p.category}`.toLowerCase().includes(q));}
    if(sort==='price-low')items.sort((a,b)=>a.price-b.price);
    else if(sort==='popular')items.sort((a,b)=>(b.salesCount||0)-(a.salesCount||0));
    else if(sort==='newest')items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    else items.sort((a,b)=>Number(b.featured)-Number(a.featured)||(b.salesCount||0)-(a.salesCount||0));
    res.json(items.map(p=>({...enrich(p),isFavorite:!!req.user&&p.favorites?.includes(req.user.id)})));
  });

  app.get('/api/marketplace/:id',optionalAuth,(req,res)=>{
    const p=store.data.patterns.find(x=>x.id===req.params.id&&x.status==='published');
    if(!p)return res.status(404).json({error:'Product not found.'});
    const reviews=store.data.reviews.filter(r=>r.patternId===p.id).map(r=>({...r,user:cleanUser(store.data.users.find(u=>u.id===r.userId))}));
    const purchased=!!req.user&&store.data.orders.some(o=>o.patternId===p.id&&o.buyerId===req.user.id&&o.status==='paid');
    res.json({...enrich(p),reviews,isFavorite:!!req.user&&p.favorites?.includes(req.user.id),purchased});
  });

  app.post('/api/patterns/:id/reviews',auth,(req,res)=>{
    const p=store.data.patterns.find(x=>x.id===req.params.id&&x.status==='published');
    if(!p)return res.status(404).json({error:'Product not found.'});
    const purchased=store.data.orders.some(o=>o.patternId===p.id&&o.buyerId===req.user.id&&o.status==='paid');
    if(!purchased)return res.status(403).json({error:'Only verified buyers can review this pattern.'});
    if(store.data.reviews.some(r=>r.patternId===p.id&&r.userId===req.user.id))return res.status(409).json({error:'You have already reviewed this pattern.'});
    const review={id:id('rev_'),userId:req.user.id,patternId:p.id,rating:Math.min(5,Math.max(1,Number(req.body.rating)||5)),comment:String(req.body.comment||'').trim(),createdAt:stamp()};
    store.insert('reviews',review); res.status(201).json(review);
  });

  app.post('/api/orders',auth,(req,res)=>{
    const p=store.data.patterns.find(x=>x.id===req.body.patternId&&x.status==='published');
    if(!p)return res.status(404).json({error:'Product not found.'});
    if(p.userId===req.user.id)return res.status(400).json({error:'You already own this pattern as its creator.'});
    const existing=store.data.orders.find(o=>o.patternId===p.id&&o.buyerId===req.user.id&&o.status==='paid');
    if(existing)return res.json({...existing,pattern:enrich(p)});
    // Test-payment adapter: production swaps this immediate success for a provider intent + verified webhook.
    const order={id:id('ord_'),buyerId:req.user.id,patternId:p.id,sellerId:p.userId,amount:Number(p.price)||0,status:'paid',paymentMode:'test',createdAt:stamp()};
    p.salesCount=(p.salesCount||0)+1;
    store.insert('orders',order); res.status(201).json({...order,pattern:enrich(p)});
  });

  app.get('/api/orders',auth,(req,res)=>{
    const orders=store.data.orders.filter(o=>o.buyerId===req.user.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    res.json(orders.map(o=>({...o,pattern:enrich(store.data.patterns.find(p=>p.id===o.patternId))})));
  });

  app.get('/api/orders/:id/download',auth,(req,res)=>{
    const order=store.data.orders.find(o=>o.id===req.params.id&&o.buyerId===req.user.id&&o.status==='paid');
    if(!order)return res.status(403).json({error:'A paid order is required for this download.'});
    const p=store.data.patterns.find(x=>x.id===order.patternId),creator=store.data.users.find(u=>u.id===p.userId);
    streamPatternPdf(res,p,creator,req.query.format==='letter'?'letter':'a4');
  });

  app.get('/api/sales',auth,(req,res)=>{
    const orders=store.data.orders.filter(o=>o.sellerId===req.user.id&&o.status==='paid').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const revenue=orders.reduce((s,o)=>s+o.amount,0);
    const byPattern=store.data.patterns.filter(p=>p.userId===req.user.id).map(p=>{
      const sales=orders.filter(o=>o.patternId===p.id);return {id:p.id,title:p.title,type:p.type,count:sales.length,revenue:sales.reduce((s,o)=>s+o.amount,0)};
    }).sort((a,b)=>b.revenue-a.revenue);
    res.json({summary:{orders:orders.length,revenue,average:orders.length?revenue/orders.length:0},orders:orders.map(o=>({...o,pattern:enrich(store.data.patterns.find(p=>p.id===o.patternId)),buyer:cleanUser(store.data.users.find(u=>u.id===o.buyerId))})),byPattern});
  });

  app.use('/api',(req,res)=>res.status(404).json({error:'API route not found.'}));
  app.use((err,_req,res,_next)=>{console.error(err);if(!res.headersSent)res.status(500).json({error:'Something went wrong.'});});
  return app;
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const app=createApp();
  const port=Number(process.env.PORT)||5173;
  if(process.env.NODE_ENV==='production'){
    app.use(express.static(path.join(root,'dist')));
    app.use((_req,res)=>res.sendFile(path.join(root,'dist','index.html')));
    app.listen(port,'0.0.0.0',()=>console.log(`Stitch Market running on http://0.0.0.0:${port}`));
  }else{
    const {createServer}=await import('vite');
    const vite=await createServer({root,server:{middlewareMode:true,host:'0.0.0.0',allowedHosts:true},appType:'spa'});
    app.use(vite.middlewares);
    app.listen(port,'0.0.0.0',()=>console.log(`Stitch Market development server on http://0.0.0.0:${port}`));
  }
}
