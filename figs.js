'use strict';
/* フォーム図（SVG・自作ベクター）。横から見た図が基本。座標：viewBox 200×150、床 y=146、右向き。
   角度：0=右, 90=下, -90=上。手足はIK（関節の曲がる向きを f/b/u/d/o で指定）。*/
const FL={tr:46,nk:7,hr:9,th:38,sh:36,ft:13,ua:28,fa:27};
const rad=a=>a*Math.PI/180,P2=(o,a,l)=>[o[0]+l*Math.cos(rad(a)),o[1]+l*Math.sin(rad(a))];
function ik(r,t,l1,l2,side){let dx=t[0]-r[0],dy=t[1]-r[1],d=Math.hypot(dx,dy);const mx=l1+l2-.01;if(d>mx){t=[r[0]+dx/d*mx,r[1]+dy/d*mx];d=mx}if(d<Math.abs(l1-l2)+.01)d=Math.abs(l1-l2)+.01;
 const b=Math.atan2(dy,dx),a=Math.acos(Math.min(1,Math.max(-1,(l1*l1+d*d-l2*l2)/(2*l1*d))));const m1=[r[0]+l1*Math.cos(b+a),r[1]+l1*Math.sin(b+a)],m2=[r[0]+l1*Math.cos(b-a),r[1]+l1*Math.sin(b-a)];
 const k={f:m=>m[0],b:m=>-m[0],u:m=>-m[1],d:m=>m[1],o:m=>Math.abs(m[0]-r[0]),i:m=>-Math.abs(m[0]-r[0])}[side||'f'];const m=k(m1)>=k(m2)?m1:m2;const e=[m[0]+(t[0]-m[0])*l2/Math.hypot(t[0]-m[0],t[1]-m[1]),m[1]+(t[1]-m[1])*l2/Math.hypot(t[0]-m[0],t[1]-m[1])];return[m,e]}
function solve(p){const J={};J.P=p.P;const tr=p.S?Math.atan2(p.S[1]-p.P[1],p.S[0]-p.P[0])*180/Math.PI:(p.tr??-90);J.tr=tr;
 if(p.front){J.S=P2(p.P,-90,FL.tr);J.Sr=[J.S[0]+15,J.S[1]+2];J.Sl=[J.S[0]-15,J.S[1]+2];J.Pr=[p.P[0]+9,p.P[1]];J.Pl=[p.P[0]-9,p.P[1]];
  const hd=p.hd??-90;J.H=P2(J.S,hd,FL.nk+FL.hr);[J.E,J.W]=ik(J.Sr,p.W,FL.ua,FL.fa,p.eb||'o');[J.E2,J.W2]=ik(J.Sl,p.W2,FL.ua,FL.fa,p.eb2||'i');
  [J.K,J.A]=ik(J.Pr,p.A,FL.th,FL.sh,p.kb||'o');[J.K2,J.A2]=ik(J.Pl,p.A2,FL.th,FL.sh,p.kb2||'i');J.T=P2(J.A,p.ft??90,6);J.T2=P2(J.A2,p.ft2??90,6);return J}
 J.S=P2(p.P,tr,FL.tr);const hd=p.hd??tr;J.H=P2(P2(J.S,tr,FL.nk*0.6),hd,FL.nk*0.4+FL.hr);if(p.hx)J.H=[J.H[0]+p.hx,J.H[1]];J.hd=hd;
 const tg=(t)=>typeof t==='string'?J[t]:t;
 if(p.A2){[J.K2,J.A2]=ik(p.P,tg(p.A2),FL.th,FL.sh,p.kb2||p.kb);J.T2=P2(J.A2,p.ft2??p.ft??15,FL.ft)}
 [J.K,J.A]=ik(p.P,tg(p.A),FL.th,FL.sh,p.kb);J.T=P2(J.A,p.ft??15,FL.ft);
 if(p.W2){[J.E2,J.W2]=ik(J.S,tg(p.W2),FL.ua,FL.fa,p.eb2||p.eb)}[J.E,J.W]=ik(J.S,tg(p.W),FL.ua,FL.fa,p.eb);return J}
const NS='http://www.w3.org/2000/svg';
function el(t,a,txt){const e=document.createElementNS(NS,t);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);if(txt!=null)e.textContent=txt;return e}
const C={body:'#d7e0db',line:'#3d4a43',far:'#eef2ef',farLine:'#93a39a',tint:'#e0663a',cue:'#2a7d5f',bad:'#b23b3b'};
function limb(g,pts,w,tint,far){const d='M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L');g.append(el('path',{d,fill:'none',stroke:far?C.farLine:C.line,'stroke-width':w+2.4,'stroke-linecap':'round','stroke-linejoin':'round'}));g.append(el('path',{d,fill:'none',stroke:tint?C.tint:(far?C.far:C.body),'stroke-width':w,'stroke-linecap':'round','stroke-linejoin':'round','stroke-opacity':tint&&far?.55:1}))}
function seg(g,a,b,w,tint,far){limb(g,[a,b],w,tint,far)}
function drawPose(p,tint,opt={}){const J=solve(p);const g=el('g',{});const T=k=>tint.includes(k);
 if(p.front){seg(g,J.Pl,J.K2,12,T('thigh'));seg(g,J.K2,J.A2,9,T('calf'));seg(g,J.Pr,J.K,12,T('thigh'));seg(g,J.K,J.A,9,T('calf'));
  const tp=`M${J.Sl[0]-2} ${J.Sl[1]-3} L${J.Sr[0]+2} ${J.Sr[1]-3} L${J.Pr[0]+4} ${J.Pr[1]+4} L${J.Pl[0]-4} ${J.Pl[1]+4}Z`;g.append(el('path',{d:tp,fill:T('core')||T('chest')?C.tint:C.body,stroke:C.line,'stroke-width':1.6,'stroke-linejoin':'round'}));
  if(T('upperback')||T('shoulder'))[J.Sl,J.Sr].forEach(s=>g.append(el('circle',{cx:s[0],cy:s[1]+2,r:5,fill:C.tint})));
  limb(g,[J.Sr,J.E,J.W],8,T('arm'));limb(g,[J.Sl,J.E2,J.W2],8,T('arm'));seg(g,J.S,P2(J.S,p.hd??-90,FL.nk),7,T('neck'));
  g.append(el('circle',{cx:J.H[0],cy:J.H[1],r:FL.hr,fill:C.body,stroke:C.line,'stroke-width':1.6}));return{g,J}}
 // 奥側の手足
 if(J.K2){limb(g,[J.P,J.K2,J.A2,J.T2],11,T('thigh')||T('farleg'),true)}
 if(J.E2)limb(g,[J.S,J.E2,J.W2],7,T('arm'),true);
 // 胴体（cv=背中側へのカーブ）
 const n=rad(J.tr-90),cv=p.cv||0;const mid=[(J.P[0]+J.S[0])/2+Math.cos(n)*cv*2,(J.P[1]+J.S[1])/2+Math.sin(n)*cv*2];
 const td=`M${J.P[0].toFixed(1)} ${J.P[1].toFixed(1)} Q${mid[0].toFixed(1)} ${mid[1].toFixed(1)} ${J.S[0].toFixed(1)} ${J.S[1].toFixed(1)}`;
 g.append(el('path',{d:td,fill:'none',stroke:C.line,'stroke-width':20.4,'stroke-linecap':'round'}));g.append(el('path',{d:td,fill:'none',stroke:C.body,'stroke-width':18,'stroke-linecap':'round'}));
 // 胴体の部位色：前側(chest/core)・背中側(back/upperback)
 const half=(side,from,to)=>{const off=side*5;const o=[Math.cos(n)*off,Math.sin(n)*off];const q=t=>{const a=1-t;return[a*a*J.P[0]+2*a*t*mid[0]+t*t*J.S[0]+o[0],a*a*J.P[1]+2*a*t*mid[1]+t*t*J.S[1]+o[1]]};const pts=[];for(let i=0;i<=8;i++)pts.push(q(from+(to-from)*i/8));g.append(el('path',{d:'M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L'),fill:'none',stroke:C.tint,'stroke-width':8,'stroke-linecap':'round','stroke-opacity':.9}))};
 if(T('core'))half(-1,.15,.6);if(T('chest'))half(-1,.6,.9);if(T('back'))half(1,.1,.55);if(T('upperback'))half(1,.55,.92);
 if(T('glute')){const gp=P2(J.P,J.tr+150,4);g.append(el('circle',{cx:gp[0],cy:gp[1],r:8,fill:C.tint,'fill-opacity':.9}))}
 if(T('hipflex')){const hp=P2(J.P,J.tr-60,6);g.append(el('circle',{cx:hp[0],cy:hp[1],r:6,fill:C.tint}))}
 // 手前の脚
 limb(g,[J.P,J.K],13,T('thigh')||T('quad')||T('ham'));limb(g,[J.K,J.A],10,T('calf'));limb(g,[J.A,J.T],6,false);
 if(T('quad')||T('ham')){const n2=Math.atan2(J.K[1]-J.P[1],J.K[0]-J.P[0])+(T('quad')?-1:1)*Math.PI/2*(p.flipq?-1:1);const o=[Math.cos(n2)*3.5,Math.sin(n2)*3.5];g.append(el('path',{d:`M${J.P[0]+o[0]} ${J.P[1]+o[1]} L${J.K[0]+o[0]} ${J.K[1]+o[1]}`,stroke:C.tint,'stroke-width':6,'stroke-linecap':'round'}))}
 // 首と頭
 seg(g,J.S,P2(J.S,J.tr,FL.nk*0.6),8,T('neck'));seg(g,P2(J.S,J.tr,FL.nk*0.5),P2(J.H,J.hd+180,FL.hr*0.6),8,T('neck'));
 g.append(el('circle',{cx:J.H[0],cy:J.H[1],r:FL.hr,fill:C.body,stroke:C.line,'stroke-width':1.6}));
 const fd=p.face??(J.hd+90);const nose=P2(J.H,fd,FL.hr);g.append(el('circle',{cx:nose[0],cy:nose[1],r:2.2,fill:C.line}));
 if(T('shoulder')){g.append(el('circle',{cx:J.S[0],cy:J.S[1],r:6,fill:C.tint}))}
 limb(g,[J.S,J.E,J.W],8,T('arm'));
 return{g,J}}
function extras(g,J,list){for(const x of list||[]){
 if(x.floor!==false&&x.t==='wall')g.append(el('rect',{x:x.x,y:x.y??0,width:6,height:146-(x.y??0),fill:'#c9d2cc'}));
 if(x.t==='mat'){g.append(el('rect',{x:20,y:40,width:170,height:106,rx:8,fill:'#eef3ef',stroke:'#c9d2cc'}));g.append(el('text',{x:26,y:54,'font-size':9,fill:'#7a8a80'},'床（上から）'))}
 if(x.t==='band')g.append(el('path',{d:`M${x.at[0]} ${x.at[1]} L${J.W[0]} ${J.W[1]}`,stroke:'#3a6ea5','stroke-width':2.5,fill:'none'}));
 if(x.t==='box')g.append(el('rect',{x:x.x,y:x.y,width:x.w,height:146-x.y,rx:3,fill:'#c9b79c',stroke:'#8a7556'}));
 if(x.t==='tube')g.append(el('path',{d:`M${J.T[0]} ${J.T[1]} L${J.W[0]} ${J.W[1]}`,stroke:'#3a6ea5','stroke-width':2.5,fill:'none'}));
 if(x.t==='db')g.append(el('rect',{x:J.W[0]-8,y:J.W[1]-3,width:16,height:7,rx:2,fill:'#555'}));
 if(x.t==='towel'){g.append(el('ellipse',{cx:J.K[0],cy:J.K[1]+9,rx:9,ry:4.5,fill:'#9ec5e8',stroke:'#3a6ea5'}))}
 if(x.t==='circle')g.append(el('circle',{cx:J.S[0],cy:J.S[1],r:x.r||18,fill:'none',stroke:C.cue,'stroke-width':1.5,'stroke-dasharray':'4 3'}));
 if(x.t==='arrow'){const[a,b]=[x.from,x.to];g.append(el('path',{d:`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`,stroke:C.cue,'stroke-width':2,fill:'none','marker-end':'url(#ah)'}))}
 if(x.t==='label')g.append(el('text',{x:x.x,y:x.y,'font-size':9,fill:C.cue,'font-weight':700},x.text));
 if(x.t==='mark'){const p=J[x.j];g.append(el('circle',{cx:p[0]+(x.dx||0),cy:p[1]+(x.dy||0),r:x.r||3,fill:x.c||C.cue}))}
}}
function cues(g,J,list,vb){const V=(vb||'0 0 200 150').split(' ').map(Number);for(const c of list||[]){const p=typeof c.j==='string'?(c.j==='Tm'?[(J.P[0]+J.S[0])/2,(J.P[1]+J.S[1])/2]:J[c.j]):c.j;const L=[p[0]+c.dx,p[1]+c.dy];
 g.append(el('circle',{cx:p[0],cy:p[1],r:3.2,fill:'#fff',stroke:C.cue,'stroke-width':2}));g.append(el('path',{d:`M${p[0]} ${p[1]} L${L[0]} ${L[1]}`,stroke:C.cue,'stroke-width':1.3}));
 const w=c.text.length*8.6+8;let x0=c.dx<0?L[0]-w:L[0];x0=Math.max(V[0]+1,Math.min(V[0]+V[2]-w-1,x0));g.append(el('rect',{x:x0,y:L[1]-8,width:w,height:14,rx:4,fill:'#fff',stroke:C.cue,'stroke-width':1}));g.append(el('text',{x:x0+4,y:L[1]+2.5,'font-size':8.6,fill:C.cue,'font-weight':700},c.text))}}
function svgBase(vb,cls){const s=el('svg',{viewBox:vb||'0 0 200 150',class:cls||'fsvg',role:'img'});const d=el('defs',{});const m=el('marker',{id:'ah',viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'});m.append(el('path',{d:'M0 0 L10 5 L0 10z',fill:C.cue}));d.append(m);s.append(d);return s}
function frame(F,p,tint,cueList,showFloor=true){const g=el('g',{});if(showFloor&&!F.nofloor)g.append(el('rect',{x:-50,y:146,width:300,height:40,fill:'#e7ece8'}));const{g:pg,J}=drawPose(p,tint);extras(g,J,(F.extras||[]).filter(x=>!x.f||x.f===p._f));g.append(pg);extras(g,J,(F.over||[]).filter(x=>!x.f||x.f===p._f));cues(g,J,cueList,F.vb);return g}
// 図の生成：アニメ（開始⇄終了）＋静止2コマ（動きを減らす設定用）＋よくある間違い
function formFigure(id,opts={}){const F=FORMS[id];const wrap=document.createElement('div');wrap.className='form';if(!F)return wrap;
 const a={...F.a,_f:'a'},b={...(F.b||F.a),_f:'b'};const ca=(F.cues||[]).filter(c=>c.f!=='b'),cb=(F.cues||[]).filter(c=>c.f!=='a');
 const anim=svgBase(F.vb,'fsvg anim'+(F.b?'':' still'));anim.setAttribute('aria-label',F.alt||'フォーム図');const ga=frame(F,a,F.tint,ca);ga.setAttribute('class','fa');anim.append(ga);if(F.b){const gb=frame(F,b,F.tint,cb);gb.setAttribute('class','fb');anim.append(gb)}
 wrap.append(anim);
 if(F.b){const st=document.createElement('div');st.className='fstatic';[['はじめ',a,ca],['おわり',b,cb]].forEach(([t,p,c])=>{const box=document.createElement('figure');const s=svgBase(F.vb,'fsvg');s.append(frame(F,p,F.tint,c));box.append(s);const cap=document.createElement('figcaption');cap.textContent=t;box.append(cap);st.append(box)});wrap.append(st)}
 if(F.bad&&!opts.noBad){const bd=document.createElement('div');bd.className='fbad';const s=svgBase(F.bad.vb||F.vb,'fsvg');s.append(frame(F,{...F.bad.p,_f:'x'},[],[]));const x=el('g',{});x.append(el('circle',{cx:22,cy:20,r:15,fill:'#fff',stroke:C.bad,'stroke-width':3}));x.append(el('path',{d:'M14 12 L30 28 M30 12 L14 28',stroke:C.bad,'stroke-width':4,'stroke-linecap':'round'}));s.append(x);if(F.bad.mark){const J=solve(F.bad.p);const p=J[F.bad.mark];s.append(el('circle',{cx:p[0],cy:p[1],r:12,fill:'none',stroke:C.bad,'stroke-width':2.5,'stroke-dasharray':'4 2'}))}
  const t=document.createElement('p');t.textContent='× '+F.bad.text;bd.append(s,t);wrap.append(bd)}
 if(F.view){const v=document.createElement('p');v.className='fview';v.textContent=F.view;wrap.append(v)}
 return wrap}
