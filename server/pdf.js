import PDFDocument from 'pdfkit';

const C = { ink:'#173f3a', coral:'#d77559', cream:'#f7f2e9', sage:'#bdd0c8', text:'#253633', muted:'#687a75', line:'#d9e2de', white:'#ffffff' };
const safe = (value, fallback='—') => value == null || value === '' ? fallback : String(value);

function addSectionTitle(doc, eyebrow, title) {
  if (doc.y > doc.page.height - 135) doc.addPage();
  doc.moveDown(.45).fillColor(C.coral).font('Helvetica-Bold').fontSize(8).text(String(eyebrow).toUpperCase(), {characterSpacing:1.4});
  doc.moveDown(.3).fillColor(C.ink).font('Helvetica-Bold').fontSize(19).text(title);
  doc.moveDown(.35).strokeColor(C.sage).lineWidth(1).moveTo(doc.x,doc.y).lineTo(doc.page.width-doc.page.margins.right,doc.y).stroke();
  doc.moveDown(.65);
}

function labelValue(doc, label, value, width=150) {
  const y=doc.y;
  doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(),doc.x,y,{width});
  doc.fillColor(C.text).font('Helvetica').fontSize(10).text(safe(value),doc.x+width,y,{width:doc.page.width-doc.page.margins.right-doc.x-width});
  doc.moveDown(.65);
}

function list(doc, items) {
  (items||[]).forEach((item)=>{
    if(doc.y>doc.page.height-85) doc.addPage();
    doc.fillColor(C.coral).fontSize(10).text('•',doc.x,doc.y,{continued:true});
    doc.fillColor(C.text).font('Helvetica').text(`  ${typeof item==='string'?item:safe(item.name)}${typeof item==='object'&&item.quantity?` — ${item.quantity}`:''}`);
    doc.moveDown(.25);
  });
}

function table(doc, headers, rows, widths) {
  const startX=doc.x;
  const rowH=24;
  const drawRow=(cells,header=false)=>{
    if(doc.y>doc.page.height-90) doc.addPage();
    const y=doc.y;
    doc.rect(startX,y,widths.reduce((a,b)=>a+b,0),rowH).fill(header?C.ink:(rows.indexOf(cells)%2?C.cream:C.white));
    let x=startX;
    cells.forEach((cell,i)=>{
      doc.fillColor(header?C.white:C.text).font(header?'Helvetica-Bold':'Helvetica').fontSize(8).text(safe(cell,''),x+6,y+8,{width:widths[i]-12,ellipsis:true});
      x+=widths[i];
    });
    doc.y=y+rowH;
  };
  drawRow(headers,true); rows.forEach(r=>drawRow(r));
  doc.moveDown(.7);
}

function tryCoverImage(doc, dataUrl, x, y, w, h) {
  try {
    if(!dataUrl?.startsWith('data:image/')) return false;
    const raw=dataUrl.split(',')[1];
    doc.image(Buffer.from(raw,'base64'),x,y,{fit:[w,h],align:'center',valign:'center'});
    return true;
  } catch { return false; }
}

function drawPatternPiece(doc,piece,index) {
  if(doc.y>doc.page.height-240) doc.addPage();
  const maxW=doc.page.width-doc.page.margins.left-doc.page.margins.right;
  const w=Math.min(maxW,Math.max(180,Number(piece.width||40)*4.7));
  const h=Math.min(185,Math.max(100,Number(piece.height||50)*2.6));
  const x=doc.page.margins.left+(maxW-w)/2, y=doc.y+12;
  doc.save().roundedRect(x,y,w,h,18).fillAndStroke('#f0eee6',C.ink).restore();
  doc.save().dash(5,{space:4}).strokeColor(C.coral).roundedRect(x+9,y+9,w-18,h-18,13).stroke().undash().restore();
  doc.strokeColor(C.ink).moveTo(x+w/2,y+18).lineTo(x+w/2,y+h-18).strokeOpacity(.2).stroke().strokeOpacity(1);
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(15).text(`${index+1}. ${safe(piece.name,'Pattern piece')}`,x+20,y+h/2-18,{width:w-40,align:'center'});
  doc.fillColor(C.muted).font('Helvetica').fontSize(8).text(`${piece.label||`Cut ${piece.quantity||1}`}  •  ${piece.width||'—'} × ${piece.height||'—'} cm  •  SA ${piece.seamAllowance||'—'}`,x+20,y+h/2+8,{width:w-40,align:'center'});
  doc.fillColor(C.coral).circle(x+20,y+h/2,3).fill(); doc.circle(x+w-20,y+h/2,3).fill();
  doc.y=y+h+18;
}

function drawCrochetDiagram(doc, diagram) {
  const rows=diagram?.length?diagram:[['○','○','○','○','○','○'],['†','·','†','·','†','·'],['†','†','†','†','†','†']];
  const x=doc.x, y=doc.y+10, cell=34;
  rows.forEach((row,r)=>row.forEach((sym,c)=>{
    doc.rect(x+c*cell,y+r*cell,cell,cell).strokeColor(C.line).stroke();
    doc.fillColor(C.ink).font('Helvetica').fontSize(15).text(sym,x+c*cell,y+r*cell+8,{width:cell,align:'center'});
  }));
  doc.y=y+rows.length*cell+18;
}

// Drafted piece dimensions are rendered at true physical scale (72 points/inch).
// Each clipped page is one home-print tile and can be taped using its row/column code.
function addActualSizeTiles(doc, pieces=[]) {
  const ptPerCm=72/2.54;
  pieces.forEach((piece,pieceIndex)=>{
    const pieceW=Math.min(200,Math.max(1,Number(piece.width)||1))*ptPerCm;
    const pieceH=Math.min(250,Math.max(1,Number(piece.height)||1))*ptPerCm;
    const pageW=doc.page.width,pageH=doc.page.height;
    const tileX=28,tileY=52,tileW=pageW-56,tileH=pageH-135;
    const cols=Math.ceil(pieceW/tileW),rows=Math.ceil(pieceH/tileH);
    if(cols*rows>100)return;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      doc.addPage();
      const code=`${String.fromCharCode(65+row)}${col+1}`;
      doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9).text(`STITCH MARKET  /  ${safe(piece.name,'PATTERN PIECE').toUpperCase()}`,28,18,{width:pageW-120});
      doc.fillColor(C.coral).text(`TILE ${code}  ·  ${pieceIndex+1}/${pieces.length}`,pageW-150,18,{width:122,align:'right'});
      doc.fillColor(C.muted).font('Helvetica').fontSize(6.5).text('Print at 100% / Actual size · Do not fit to page',28,32);
      doc.save().dash(4,{space:3}).strokeColor('#9eb2ac').rect(tileX,tileY,tileW,tileH).stroke().undash().restore();
      // Corner registration crosses.
      [[tileX,tileY],[tileX+tileW,tileY],[tileX,tileY+tileH],[tileX+tileW,tileY+tileH]].forEach(([x,y])=>{
        doc.strokeColor(C.coral).lineWidth(.7).moveTo(x-6,y).lineTo(x+6,y).stroke().moveTo(x,y-6).lineTo(x,y+6).stroke();
      });
      const offsetX=tileX-col*tileW,offsetY=tileY-row*tileH;
      doc.save().rect(tileX,tileY,tileW,tileH).clip();
      doc.fillColor('#f5f0e8').opacity(.45).roundedRect(offsetX,offsetY,pieceW,pieceH,Math.min(40,pieceW/5,pieceH/5)).fill().opacity(1);
      doc.strokeColor(C.ink).lineWidth(1.2).roundedRect(offsetX,offsetY,pieceW,pieceH,Math.min(40,pieceW/5,pieceH/5)).stroke();
      const seamCm=Math.max(0,Number.parseFloat(piece.seamAllowance)||0),seam=seamCm*ptPerCm;
      if(seam>0&&pieceW>seam*2&&pieceH>seam*2)doc.dash(5,{space:4}).strokeColor(C.coral).lineWidth(.8).roundedRect(offsetX+seam,offsetY+seam,pieceW-seam*2,pieceH-seam*2,Math.max(4,Math.min(34,pieceW/5-seam,pieceH/5-seam))).stroke().undash();
      const centerX=offsetX+pieceW/2,centerY=offsetY+pieceH/2;
      doc.strokeColor(C.ink).lineWidth(.7).moveTo(centerX,offsetY+35).lineTo(centerX,offsetY+pieceH-35).stroke();
      doc.moveTo(centerX,offsetY+35).lineTo(centerX-4,offsetY+43).moveTo(centerX,offsetY+35).lineTo(centerX+4,offsetY+43).stroke();
      doc.moveTo(centerX,offsetY+pieceH-35).lineTo(centerX-4,offsetY+pieceH-43).moveTo(centerX,offsetY+pieceH-35).lineTo(centerX+4,offsetY+pieceH-43).stroke();
      doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(12).text(safe(piece.name,'Pattern piece'),centerX-100,centerY-26,{width:200,align:'center'});
      doc.fillColor(C.muted).font('Helvetica').fontSize(7).text(`${piece.label||`Cut ${piece.quantity||1}`}\n${safe(piece.markings,'Transfer all markings')}\nSeam allowance ${piece.seamAllowance||'not included'}`,centerX-100,centerY-8,{width:200,align:'center',lineGap:2});
      doc.restore();
      // 2 cm calibration square sits outside the tiled drawing area.
      const sq=2*ptPerCm,sx=pageW-28-sq,sy=pageH-72;
      doc.strokeColor(C.ink).lineWidth(.7).rect(sx,sy,sq,sq).stroke();
      doc.fillColor(C.muted).font('Helvetica').fontSize(5.5).text('2 cm TEST',sx,sy+sq/2-3,{width:sq,align:'center'});
      doc.text(`${code} · ${cols} columns × ${rows} rows`,28,pageH-23,{width:pageW-130});
    }
  });
}

export function streamPatternPdf(res, pattern, creator, format='a4') {
  const size=format.toLowerCase()==='letter'?'LETTER':'A4';
  const doc=new PDFDocument({size,margins:{top:54,bottom:58,left:54,right:54},bufferPages:true,info:{Title:pattern.title,Author:creator?.studio||creator?.name||'Stitch Market',Subject:`${pattern.type} pattern`}});
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`attachment; filename="${pattern.title.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()}-${format}.pdf"`);
  doc.pipe(res);
  let tileStart=Infinity;

  // Cover
  doc.rect(0,0,doc.page.width,doc.page.height).fill(C.cream);
  doc.rect(0,0,18,doc.page.height).fill(C.coral);
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(10).text('STITCH MARKET',54,55,{characterSpacing:2});
  doc.fillColor(C.coral).font('Helvetica-Bold').fontSize(9).text(`${pattern.type.toUpperCase()} PATTERN  •  ${safe(pattern.difficulty).toUpperCase()}`,54,115,{characterSpacing:1.1});
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(38).text(pattern.title,54,145,{width:doc.page.width-108,lineGap:3});
  const coverY=Math.max(290,doc.y+25), coverW=doc.page.width-108,coverH=250;
  if(!tryCoverImage(doc,pattern.coverImage,54,coverY,coverW,coverH)){
    doc.roundedRect(54,coverY,coverW,coverH,20).fill(pattern.type==='sewing'?C.sage:'#e8c6b9');
    doc.save().strokeColor(C.white).opacity(.58).lineWidth(2);
    if(pattern.type==='sewing'){
      doc.moveTo(110,coverY+195).bezierCurveTo(190,coverY+35,330,coverY+35,doc.page.width-105,coverY+195).stroke();
      doc.circle(doc.page.width/2,coverY+95,45).stroke();
      doc.moveTo(doc.page.width/2,coverY+140).lineTo(doc.page.width/2,coverY+215).stroke();
    } else {
      for(let r=20;r<105;r+=18) doc.circle(doc.page.width/2,coverY+125,r).stroke();
      doc.moveTo(100,coverY+55).lineTo(doc.page.width-100,coverY+205).stroke();
    }
    doc.restore();
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(12).text(pattern.type==='sewing'?'SEW • CUT • CREATE':'HOOK • LOOP • CREATE',54,coverY+112,{width:coverW,align:'center',characterSpacing:1.8});
  }
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(12).text(creator?.studio||creator?.name||'Independent creator',54,coverY+coverH+30);
  doc.fillColor(C.muted).font('Helvetica').fontSize(9).text(`Sizes: ${(pattern.sizes||[]).join(', ')||'One size'}  •  ${size==='A4'?'A4':'US Letter'} edition`,54,coverY+coverH+51);

  // Overview
  doc.addPage();
  addSectionTitle(doc,'01','Pattern overview');
  doc.fillColor(C.text).font('Helvetica').fontSize(11).text(safe(pattern.description,'A thoughtfully designed pattern from Stitch Market.'),{lineGap:4}); doc.moveDown(1);
  labelValue(doc,'Category',pattern.category); labelValue(doc,'Difficulty',pattern.difficulty); labelValue(doc,'Sizes',(pattern.sizes||[]).join(', '));
  if(pattern.type==='sewing') labelValue(doc,'Garment type',pattern.garmentType);
  else { labelValue(doc,'Yarn',`${safe(pattern.yarnType)} · ${safe(pattern.yarnWeight)}`); labelValue(doc,'Hook',pattern.hookSize); labelValue(doc,'Gauge',pattern.gauge); }
  addSectionTitle(doc,'02','Materials & tools');
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(11).text('Materials'); doc.moveDown(.4); list(doc,pattern.materials);
  doc.moveDown(.4).fillColor(C.ink).font('Helvetica-Bold').fontSize(11).text('Tools'); doc.moveDown(.4); list(doc,pattern.tools);

  if((pattern.measurements||[]).length || (pattern.sizeChart||[]).length){
    doc.addPage(); addSectionTitle(doc,'03','Measurements & sizing');
    if(pattern.measurements?.length) table(doc,['MEASUREMENT','VALUE','UNIT'],pattern.measurements.map(m=>[m.name,m.value,m.unit]),[180,130,100]);
    if(pattern.sizeChart?.length){
      doc.moveDown(.6).fillColor(C.ink).font('Helvetica-Bold').fontSize(12).text('Body size chart'); doc.moveDown(.5);
      table(doc,['SIZE','BUST','WAIST','HIP'],pattern.sizeChart.map(s=>[s.size,s.bust,s.waist,s.hip]),[90,105,105,105]);
    }
  }

  doc.addPage(); addSectionTitle(doc,'04','Step-by-step instructions');
  (pattern.instructions||[]).forEach((step,i)=>{
    if(doc.y>doc.page.height-145) doc.addPage();
    const y=doc.y; doc.circle(doc.x+15,y+15,15).fill(C.coral);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10).text(String(i+1),doc.x,y+11,{width:30,align:'center'});
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(13).text(safe(step.title,`Step ${i+1}`),doc.x+43,y+2);
    doc.moveDown(.35); doc.fillColor(C.text).font('Helvetica').fontSize(10).text(safe(step.body,''),doc.x+43,doc.y,{width:doc.page.width-doc.page.margins.right-doc.x-43,lineGap:3});
    doc.moveDown(1.2);
  });

  if(pattern.type==='sewing'){
    doc.addPage(); addSectionTitle(doc,'05','Printable pattern pieces');
    doc.fillColor(C.text).font('Helvetica').fontSize(9).text(`Seam allowance: ${safe(pattern.seamAllowance)}. Solid line indicates cut line; dashed line indicates stitch line. Print at 100% / actual size.`,{lineGap:3});
    (pattern.pieces||[]).forEach((piece,i)=>drawPatternPiece(doc,piece,i));
    doc.addPage(); addSectionTitle(doc,'06','Assembly & tile guide');
    doc.fillColor(C.text).font('Helvetica').fontSize(10).text(`This ${size==='A4'?'A4':'US Letter'} edition is prepared for home printing. Turn off “Fit to page” and confirm the test square before assembling.`,{lineGap:4}); doc.moveDown(1);
    ['Print pages at 100% scale.','Trim the right and bottom margins on each tile.','Match the letter-number registration marks.','Tape rows from left to right, then join the completed rows.','Cut your selected size along its indicated line.'].forEach((t,i)=>{
      doc.fillColor(C.coral).font('Helvetica-Bold').fontSize(10).text(`${i+1}`.padStart(2,'0'),{continued:true});
      doc.fillColor(C.text).font('Helvetica').text(`   ${t}`); doc.moveDown(.55);
    });
    if(pattern.pieces?.length){
      const beforeTiles=doc.bufferedPageRange();
      tileStart=beforeTiles.start+beforeTiles.count;
      addActualSizeTiles(doc,pattern.pieces);
    }
  } else {
    doc.addPage(); addSectionTitle(doc,'05','Rows & rounds');
    if(pattern.rows?.length) table(doc,['ROW / ROUND','INSTRUCTION','STITCH COUNT'],pattern.rows.map(r=>[r.number,r.instruction,r.stitchCount]),[85,245,90]);
    addSectionTitle(doc,'06','Stitch abbreviations');
    if(pattern.abbreviations?.length) table(doc,['TERM','MEANING'],pattern.abbreviations.map(a=>[a.term,a.meaning]),[100,310]);
    doc.addPage(); addSectionTitle(doc,'07','Crochet diagram'); drawCrochetDiagram(doc,pattern.diagram);
    doc.fillColor(C.muted).font('Helvetica').fontSize(9).text('Symbol key: ○ chain  •  · slip stitch  •  † double crochet. Read rounds from the center outward unless noted otherwise.');
  }

  if(pattern.notes){ doc.addPage(); addSectionTitle(doc,'Notes','Designer notes'); doc.fillColor(C.text).font('Helvetica').fontSize(10).text(pattern.notes,{lineGap:4}); }

  const range=doc.bufferedPageRange();
  for(let i=range.start;i<range.start+range.count;i++){
    doc.switchToPage(i);
    if(i===0 || i>=tileStart) continue;
    const footerY=doc.page.height-35;
    doc.strokeColor(C.line).moveTo(doc.page.margins.left,footerY-9).lineTo(doc.page.width-doc.page.margins.right,footerY-9).stroke();
    doc.fillColor(C.muted).font('Helvetica').fontSize(7).text(`© ${new Date().getFullYear()} ${creator?.studio||creator?.name||'Pattern creator'} · Personal use only`,doc.page.margins.left,footerY,{width:doc.page.width/2});
    doc.text(`${pattern.title}  ·  ${i+1}`,doc.page.width/2,footerY,{width:doc.page.width/2-doc.page.margins.right,align:'right'});
  }
  doc.end();
}
