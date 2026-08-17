import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import request from 'supertest';
import {createApp} from '../server/index.js';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stitch-market-'));
const app=createApp({dbPath:path.join(dir,'test-db.json')});
const auth=token=>({Authorization:`Bearer ${token}`});
let sellerToken,buyerToken,patternId,orderId;

const binary=(res,callback)=>{
  res.setEncoding('binary');let data='';
  res.on('data',chunk=>data+=chunk);
  res.on('end',()=>callback(null,Buffer.from(data,'binary')));
};

test('health endpoint is available',async()=>{
  const res=await request(app).get('/api/health').expect(200);
  assert.equal(res.body.ok,true);
});

test('demo creator can log in and restore a safe profile',async()=>{
  const login=await request(app).post('/api/auth/login').send({email:'maya@stitch.market',password:'demo123'}).expect(200);
  sellerToken=login.body.token;
  assert.equal(login.body.user.name,'Maya Chen');
  assert.equal(login.body.user.passwordHash,undefined);
  const me=await request(app).get('/api/auth/me').set(auth(sellerToken)).expect(200);
  assert.equal(me.body.email,'maya@stitch.market');
});

test('registration validates input and creates buyer account',async()=>{
  await request(app).post('/api/auth/register').send({name:'Tiny',email:'tiny@example.com',password:'123'}).expect(400);
  const res=await request(app).post('/api/auth/register').send({name:'Aisha Maker',studio:'Aisha Makes',email:'aisha@example.com',password:'strongpass'}).expect(201);
  buyerToken=res.body.token;
  assert.ok(buyerToken);
});

test('creator can create, autosave-style update and publish a sewing pattern',async()=>{
  const made=await request(app).post('/api/patterns').set(auth(sellerToken)).send({type:'sewing',title:'Studio Test Apron'}).expect(201);
  patternId=made.body.id;
  assert.equal(made.body.status,'draft');
  const updated=await request(app).put(`/api/patterns/${patternId}`).set(auth(sellerToken)).send({
    title:'Studio Test Apron',description:'A polished cross-back studio apron.',category:'Apparel',difficulty:'Beginner',sizes:['S','M','L'],
    materials:[{name:'Linen canvas',quantity:'2 m'}],tools:['Sewing machine'],instructions:[{title:'Join the body',body:'Sew the front and back panels together.'}],
    garmentType:'Apron',sizeChart:[{size:'M',bust:'94',waist:'76',hip:'102'}],pieces:[{name:'Front',width:55,height:85,quantity:1,seamAllowance:'1 cm',label:'Cut 1 on fold',markings:'Pocket line'}],
    seamAllowance:'1 cm',tileGuide:true,price:8,status:'published'
  }).expect(200);
  assert.equal(updated.body.status,'published');
  assert.equal(updated.body.price,8);
  const mine=await request(app).get('/api/patterns?status=published&search=apron').set(auth(sellerToken)).expect(200);
  assert.ok(mine.body.some(p=>p.id===patternId));
});

test('published pattern is discoverable in marketplace filters',async()=>{
  const market=await request(app).get('/api/marketplace?type=sewing&difficulty=Beginner&search=apron').expect(200);
  assert.equal(market.body.length,1);
  assert.equal(market.body[0].id,patternId);
  assert.equal(market.body[0].creator.studio,'Thread & Form Studio');
});

test('owner PDF export returns a valid A4 PDF',async()=>{
  const res=await request(app).get(`/api/patterns/${patternId}/export?format=a4`).set(auth(sellerToken)).buffer(true).parse(binary).expect('Content-Type',/pdf/).expect(200);
  assert.equal(res.body.subarray(0,4).toString(),'%PDF');
  assert.ok(res.body.length>1000);
});

test('non-buyer cannot download a paid pattern',async()=>{
  const res=await request(app).get(`/api/patterns/${patternId}/export`).set(auth(buyerToken)).expect(403);
  assert.match(res.body.error,/Purchase/);
});

test('test checkout creates paid entitlement and protected download',async()=>{
  const bought=await request(app).post('/api/orders').set(auth(buyerToken)).send({patternId}).expect(201);
  orderId=bought.body.id;
  assert.equal(bought.body.status,'paid');
  assert.equal(bought.body.paymentMode,'test');
  const orders=await request(app).get('/api/orders').set(auth(buyerToken)).expect(200);
  assert.ok(orders.body.some(o=>o.id===orderId));
  const pdf=await request(app).get(`/api/orders/${orderId}/download?format=letter`).set(auth(buyerToken)).buffer(true).parse(binary).expect(200);
  assert.equal(pdf.body.subarray(0,4).toString(),'%PDF');
});

test('seller dashboard reflects the completed sale',async()=>{
  const sales=await request(app).get('/api/sales').set(auth(sellerToken)).expect(200);
  assert.ok(sales.body.summary.orders>=2); // one seeded order plus the integration-test order
  assert.ok(sales.body.byPattern.find(p=>p.id===patternId&&p.count===1));
});

test('verified buyer can review and favorite the product',async()=>{
  const review=await request(app).post(`/api/patterns/${patternId}/reviews`).set(auth(buyerToken)).send({rating:5,comment:'Clear and thoughtfully presented.'}).expect(201);
  assert.equal(review.body.rating,5);
  const favorite=await request(app).post(`/api/patterns/${patternId}/favorite`).set(auth(buyerToken)).expect(200);
  assert.equal(favorite.body.favorite,true);
  const detail=await request(app).get(`/api/marketplace/${patternId}`).set(auth(buyerToken)).expect(200);
  assert.equal(detail.body.purchased,true);
  assert.equal(detail.body.rating,5);
});

test('creator can update profile and dashboard totals',async()=>{
  const profile=await request(app).put('/api/profile').set(auth(sellerToken)).send({bio:'Patterns for everyday making.',location:'Test Studio'}).expect(200);
  assert.equal(profile.body.location,'Test Studio');
  const dash=await request(app).get('/api/dashboard').set(auth(sellerToken)).expect(200);
  assert.ok(dash.body.stats.patterns>=4);
  assert.ok(dash.body.stats.revenue>=8);
});
