'use strict';
/* からだ手帳 v1 — 端末内(IndexedDB)のみ保存。外部送信は地図タイルのみ。 */
const $=s=>document.querySelector(s);
function h(tag,attrs,...kids){const e=document.createElement(tag);if(attrs)for(const[k,v]of Object.entries(attrs)){if(v==null||v===false)continue;if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='class')e.className=v;else e.setAttribute(k,v===true?'':v)}for(const c of kids.flat()){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(String(c)))}return e}
const Q=new URLSearchParams(location.search);const DEMO=Q.get('demo')==='1';
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
function today(){const t=Q.get('today');return /^\d{4}-\d{2}-\d{2}$/.test(t||'')&&validDate(t)?t:ymd(new Date())}
function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const[y,m,d]=s.split('-').map(Number);const x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d&&y>=2000&&y<=2100}
const dOf=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=dOf(s);d.setDate(d.getDate()+n);return ymd(d)};
const diffDays=(a,b)=>Math.round((dOf(b)-dOf(a))/864e5);
const monday=s=>{const d=dOf(s);const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return ymd(d)};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const WD=['日','月','火','水','木','金','土'];
const EXM=Object.fromEntries(EX.map(e=>[e.id,e]));

/* ---------- 保存 ---------- */
const DBN='karada',KEY=DEMO?'demo':'state';let db;
function idb(){return new Promise((ok,ng)=>{const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>ng(r.error)})}
function idbGet(k){return new Promise((ok,ng)=>{const t=db.transaction('kv').objectStore('kv').get(k);t.onsuccess=()=>ok(t.result);t.onerror=()=>ng(t.error)})}
function idbPut(k,v){return new Promise((ok,ng)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>ok();tx.onerror=()=>ng(tx.error);tx.onabort=()=>ng(tx.error)})}
function fresh(){return{version:1,settings:{weightKg:75,waistCm:85,provisional:true,heightCm:null,equip:{tube:false,dumbbell:false,mat:true},week:{1:'A',2:'run',3:'M',4:'B',5:'M',6:'run',0:'rest'},remindOn:false,remindTime:'20:00',hardOn:false},block:{start:monday(today()),no:1},prog:{},variant:{},logs:[],body:[],pain:{date:'',areas:[]},courses:[]}}
let S=fresh();
async function save(){try{await idbPut(KEY,S)}catch(e){alert('保存に失敗しました：'+e.message)}}
const LIMIT=4*1024*1024;

/* ---------- 検証（復元・読込用） ---------- */
const isNum=(v,a,b)=>typeof v==='number'&&isFinite(v)&&v>=a&&v<=b;
const isStr=(v,max)=>typeof v==='string'&&v.length<=max;
function validate(o){
 const E=m=>{throw new Error(m)};
 if(!o||typeof o!=='object'||Array.isArray(o))E('形式が違います');
 if(o.app!=='karada-techo'||o.version!==1)E('このアプリのバックアップではありません');
 const d=o.data;if(!d||typeof d!=='object')E('data がありません');
 const n=fresh();const st=d.settings||{};
 if(st.weightKg!=null){if(!isNum(st.weightKg,20,300))E('体重の設定が範囲外');n.settings.weightKg=st.weightKg}
 if(st.waistCm!=null){if(!isNum(st.waistCm,40,200))E('腹囲の設定が範囲外');n.settings.waistCm=st.waistCm}
 if(st.provisional!=null){if(typeof st.provisional!=='boolean')E('仮フラグが不正');n.settings.provisional=st.provisional}
 if(st.heightCm!=null){if(!isNum(st.heightCm,80,250))E('身長が範囲外');n.settings.heightCm=st.heightCm}
 if(st.equip){for(const k of['tube','dumbbell','mat']){if(st.equip[k]!=null){if(typeof st.equip[k]!=='boolean')E('器具設定が不正');n.settings.equip[k]=st.equip[k]}}}
 if(st.week){for(let i=0;i<7;i++){const v=st.week[i];if(v!=null){if(!['A','B','M','Q','H','N','run','rest'].includes(v))E('週の予定が不正');n.settings.week[i]=v}}}
 if(st.hardOn!=null){if(typeof st.hardOn!=='boolean')E('きつめ設定が不正');n.settings.hardOn=st.hardOn}
 if(st.remindOn!=null){if(typeof st.remindOn!=='boolean')E('通知設定が不正');n.settings.remindOn=st.remindOn}
 if(st.remindTime!=null){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(st.remindTime))E('通知時刻が不正');n.settings.remindTime=st.remindTime}
 if(d.block){if(!validDate(d.block.start)||!isNum(d.block.no,1,999)||!Number.isInteger(d.block.no))E('ブロック情報が不正');n.block={start:d.block.start,no:d.block.no}}
 for(const[key,max]of[['prog',100],['variant',10]]){const p=d[key]||{};if(typeof p!=='object'||Array.isArray(p))E(key+'が不正');for(const[k,v]of Object.entries(p)){if(!EXM[k])continue;if(!Number.isInteger(v)||v<0||v>max)E(key+'の値が不正');if(key==='variant'&&v>=EXM[k].levels.length)E('レベルが不正');n[key][k]=v}}
 const ids=new Set();const fixId=x=>{let i=isStr(x,40)&&x?x:uid();while(ids.has(i))i=uid();ids.add(i);return i};
 if(!Array.isArray(d.logs||[]))E('記録が不正');
 for(const l of d.logs||[]){if(!l||typeof l!=='object')E('記録に空の行');if(!validDate(l.date))E('記録の日付が不正：'+String(l.date).slice(0,20));if(!['session','run','walk'].includes(l.type))E('記録の種類が不正');
  if(!isNum(l.durSec,0,86400))E('記録の時間が不正');if(!isNum(l.kcal,0,10000))E('消費カロリーが不正');
  const x={id:fixId(l.id),date:l.date,type:l.type,durSec:Math.round(l.durSec),kcal:Math.round(l.kcal)};
  if(l.type==='session'){if(!SESSIONS[l.session]&&l.session!=='free')E('セッション名が不正');x.session=l.session;if(!Array.isArray(l.items))E('種目一覧が不正');x.items=l.items.map(it=>{if(!it||!EXM[it.ex])E('不明な種目');if(!isNum(it.done,0,9999)||!Number.isInteger(it.done))E('回数が不正');if(it.variant!=null&&(!Number.isInteger(it.variant)||it.variant<0||it.variant>=EXM[it.ex].levels.length))E('種目レベルが不正');return{ex:it.ex,done:it.done,variant:it.variant||0}});if(l.rpe!=null){if(!Number.isInteger(l.rpe)||l.rpe<1||l.rpe>5)E('きつさが不正');x.rpe=l.rpe}}
  else{if(!isNum(l.distKm,0,300))E('距離が不正');x.distKm=l.distKm;if(l.route!=null){if(!Array.isArray(l.route)||l.route.length>5000)E('ルートが不正');x.route=l.route.map(p=>{if(!Array.isArray(p)||!isNum(p[0],-90,90)||!isNum(p[1],-180,180))E('ルートの座標が不正');return[p[0],p[1]]})}}
  if(l.note!=null){if(!isStr(l.note,500))E('メモが長すぎます');x.note=l.note}
  n.logs.push(x)}
 if(!Array.isArray(d.body||[]))E('体の記録が不正');
 for(const b of d.body||[]){if(!b||!validDate(b.date))E('体の記録の日付が不正');const x={id:fixId(b.id),date:b.date};if(b.weightKg!=null){if(!isNum(b.weightKg,20,300))E('体重が範囲外');x.weightKg=b.weightKg}if(b.waistCm!=null){if(!isNum(b.waistCm,40,200))E('腹囲が範囲外');x.waistCm=b.waistCm}if(x.weightKg==null&&x.waistCm==null)E('体の記録が空');n.body.push(x)}
 if(d.pain){if(d.pain.date!==''&&!validDate(d.pain.date))E('痛みの日付が不正');if(!Array.isArray(d.pain.areas)||d.pain.areas.some(a=>!AREAS[a]))E('痛みの部位が不正');n.pain={date:d.pain.date,areas:[...new Set(d.pain.areas)]}}
 if(!Array.isArray(d.courses||[]))E('コースが不正');
 for(const c of d.courses||[]){if(!c||!isStr(c.name,60)||!c.name.trim())E('コース名が不正');if(!Array.isArray(c.pts)||c.pts.length<2||c.pts.length>500)E('コースの点が不正');const pts=c.pts.map(p=>{if(!Array.isArray(p)||!isNum(p[0],-90,90)||!isNum(p[1],-180,180))E('コースの座標が不正');return[p[0],p[1]]});n.courses.push({id:fixId(c.id),name:c.name,pts,km:routeKm(pts)})}
 return n}

/* ---------- 計算 ---------- */
function hav(a,b){const R=6371,r=x=>x*Math.PI/180;const dl=r(b[0]-a[0]),dn=r(b[1]-a[1]);const x=Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function routeKm(p){let s=0;for(let i=1;i<p.length;i++)s+=hav(p[i-1],p[i]);return Math.round(s*1000)/1000}
// Compendium of Physical Activities 2011（ウォーキング・ランニング、速度別）
const SPEED_MET=[[0,2.0],[3.2,2.8],[4.0,3.0],[4.8,3.5],[5.6,4.3],[6.4,5.0],[7.0,6.0],[8.0,8.3],[8.4,9.0],[9.7,9.8],[10.8,10.5],[11.3,11.0],[12.1,11.8],[13.8,12.3],[14.5,12.8],[16.1,14.5]];
function speedMet(kmh){let m=2.0;for(const[s,v]of SPEED_MET)if(kmh>=s)m=v;return m}
const kcal=(met,kg,sec)=>met*kg*sec/3600;
function blockWeek(d){const w=Math.floor(diffDays(S.block.start,d)/7);return w<0?0:w}
const MULT=[1,1.1,1.2,0.7];const WEEKNAME=['1週目：土台','2週目：少し増やす','3週目：いちばん頑張る週','4週目：回復週（軽め）'];
function target(exId,d){const e=EXM[exId];const p=S.prog[exId]||0;const w=blockWeek(d)%4;return Math.max(1,Math.round((e.base+e.step*p)*MULT[w]))}
function painToday(){return S.pain.date===today()?S.pain.areas:[]}
function allowed(e){if(e.hard&&!S.settings.hardOn)return false;if(e.equip&&!S.settings.equip[e.equip])return false;return!e.load.some(a=>painToday().includes(a))}
const WARM=['armcircle','catcow'],COOL=['hamstretch','kneerock'];const LIMIT_MIN=30,REST=20;
function sessionItems(key){return SESSIONS[key].items.map(id=>EXM[id]).filter(allowed)}
function exSec(e,d){return e.unit==='sec'?target(e.id,d):target(e.id,d)*3}
function warmCool(key){if(key==='Q'||key==='N')return{w:[],c:[]};const f=a=>a.map(id=>EXM[id]).filter(allowed);return{w:f(WARM),c:f(COOL).filter(e=>!SESSIONS[key].items.includes(e.id))}}
function plan30(key,d){d=d||today();const it=sessionItems(key);const{w,c}=warmCool(key);const ws=w.reduce((t,e)=>t+e.base*(e.unit==='sec'?1:3)+10,0),cs=c.reduce((t,e)=>t+e.base*(e.unit==='sec'?1:3)+10,0);
 let sets=SESSIONS[key].sets;const one=it.reduce((t,e)=>t+exSec(e,d)+REST,0);const LIM=(SESSIONS[key].limit||LIMIT_MIN)*60;while(sets>1&&ws+cs+one*sets>LIM)sets--;
 let items=it.slice();while(items.length>1&&ws+cs+items.reduce((t,e)=>t+exSec(e,d)+REST,0)*sets>LIM)items.pop();
 const main=items.reduce((t,e)=>t+exSec(e,d)+REST,0)*sets;return{items,sets,w,c,wMin:Math.ceil(ws/60),mMin:Math.ceil(main/60),cMin:Math.ceil(cs/60),total:Math.ceil((ws+cs+main)/60)}}
function hasBody(){return S.body.some(x=>x.weightKg)}
function curWeight(){const b=[...S.body].filter(x=>x.weightKg).sort((a,b)=>a.date<b.date?-1:1);return b.length?b[b.length-1].weightKg:S.settings.weightKg}
const fmtT=s=>Math.floor(s/60)+'分'+pad(Math.round(s%60))+'秒';
function doneOn(d){return S.logs.filter(l=>l.date===d)}
function didSession(d,key){return doneOn(d).some(l=>key==='run'?l.type!=='session':l.session===key)}

/* ---------- ルーティング ---------- */
const TABS=[['home','今日'],['plan','計画'],['progress','成長'],['run','ラン'],['more','その他']];
let timer=null,runner=null;
function nav(){const v=(location.hash||'#home').slice(1);render(v)}
function render(v){v=v||(location.hash||'#home').slice(1);const view=$('#view');view.replaceChildren();if(map&&!v.startsWith('run')){map.remove();map=null}
 const f={home:vHome,plan:vPlan,progress:vProgress,run:vRun,more:vMore,menu:vMenu,body:vBody,settings:vSettings,safety:vSafety,go:vGo}[v.split('/')[0]]||vHome;
 f(view,v);$('#tabs').replaceChildren(...TABS.map(([k,n])=>h('a',{href:'#'+k,class:'tab'+(v.split('/')[0]===k?' on':'')},n)));if(DEMO)view.prepend(h('div',{class:'demo'},'見本モード：見本データです。ここでの変更は保存されず、本番データにも影響しません。'))}
window.addEventListener('hashchange',nav);

/* ---------- 今日 ---------- */
const CHEERS=['はよやろけど、無理はあかんで？','今日の数分が、4週間後の浩二さんを作るんやで。','前の自分よりちょびっとでええねん。','続けた分だけ、体はちゃんと応えてくれるからな。','子ども抱っこできる体、それだけで立派やで。','疲れてる日は休むのも計画のうちやで。'];
const LINES={rest:['今日はお休みの日や。ゆっくりしいや〜','休むのも体づくりのうちやで。ちゃんと寝てな？'],pain:['あら、痛いとこあるん？そこ使う種目は外しといたで。','痛みが続くようやったら、ちゃんとお医者さん行ってな？うち心配やねん。'],done:['おつかれさん！ようがんばったなぁ。','えらいえらい！今日のぶん、ちゃんと積み上がったで。'],pr:['すごいやん！自己ベスト更新や！','見てたで〜、記録更新！ほんま頼もしいわ。'],hard:['きつかったなぁ。次は目標どおりやなくてもええからな。'],progress:['ほら見てみ、ちゃんと積み上がってるやろ？','コツコツが一番強いんやで。']};
const pick=(a,seed)=>a[(seed??diffDays('2026-01-01',today()))%a.length];
function coach(mood,line){return h('div',{class:'coach'},h('img',{src:'img/mamie_'+mood+'.webp',alt:'メイミー',width:'72',height:'72'}),h('p',{class:'bubble'},line))}
function vHome(el){const d=today();const wd=dOf(d).getDay();const key=S.settings.week[wd];const w=blockWeek(d);
 el.append(h('h1',null,d.slice(5).replace('-','/')+'（'+WD[wd]+'）'),h('p',{class:'sub'},'ブロック'+S.block.no+'・'+WEEKNAME[w%4]));
 const pa0=painToday();el.append(pa0.length?coach('worried',pick(LINES.pain)):key==='rest'?coach('sleepy',pick(LINES.rest)):didSession(d,key)?coach('happy',pick(LINES.done)):coach('cheer',pick(CHEERS)));
 // 今日痛いとこ
 const pa=painToday();const pc=h('div',{class:'card'},h('h2',null,'今日痛いとこ、ある？'),h('p',{class:'sub'},'選んだ部位に負担がかかる種目は今日のメニューから外します。'));
 const chips=h('div',{class:'chips'});for(const[k,n]of Object.entries(AREAS)){chips.append(h('button',{class:'chip'+(pa.includes(k)?' on':''),'aria-pressed':pa.includes(k)?'true':'false',onclick:async()=>{const cur=new Set(painToday());cur.has(k)?cur.delete(k):cur.add(k);S.pain={date:d,areas:[...cur]};await save();render()}},n))}
 pc.append(chips);if(pa.length)pc.append(h('p',{class:'warn'},'痛みが続く・強い・しびれがある時は運動を中止して医療機関に相談してください。'));el.append(pc);
 // 今日の予定
 const c=h('div',{class:'card main'});
 if(key==='rest'){c.append(h('h2',null,'今日はお休みの日'),h('p',null,'しっかり休むのも体づくりの一部です。動きたければ「すきま5分ケア」もどうぞ。'),h('a',{class:'btn ghost',href:'#go/Q'},'すきま5分ケア'))}
 else if(key==='run'){c.append(h('h2',null,'今日はラン・ウォークの日'),h('p',null,'目安は20〜30分（最初の5分は歩いて準備、最後に歩いて整理）。歩きまじりでも立派な有酸素運動です。'),h('a',{class:'btn',href:'#run'},'ランを始める'))}
 else if(SESSIONS[key].hard&&!S.settings.hardOn){c.append(h('h2',null,SESSIONS[key].name),h('p',null,'きつめメニューがOFFなので、今日は「ほぐし」にしときましょう。'),h('a',{class:'btn',href:'#go/M'},'ほぐし10分'))}
 else{const P=plan30(key,d);const it=P.items;c.append(h('h2',null,SESSIONS[key].name),h('p',{class:'sub'},'約'+P.total+'分（準備'+P.wMin+'分＋本番'+P.mMin+'分＋整理'+P.cMin+'分）・'+it.length+'種目×'+P.sets+'セット'),h('ul',{class:'list'},it.map(e=>h('li',null,e.name+'　'+target(e.id,d)+(e.unit==='sec'?'秒':'回')))),didSession(d,key)?h('p',{class:'ok'},'✓ 今日のぶんは完了！おつかれさま。'):h('a',{class:'btn',href:'#go/'+key},'はじめる'))}
 el.append(c);
 // 今週まだのもの（やさしい振替）
 const mon=monday(d);const left=[];for(let i=0;i<diffDays(mon,d);i++){const dd=addDays(mon,i);const k=S.settings.week[dOf(dd).getDay()];if(k!=='rest'&&!didSession(dd,k)&&!(left.includes(k)))left.push(k)}
 const leftK=left.filter(k=>k!==key&&!thisWeekDone(k));
 if(leftK.length)el.append(h('div',{class:'card soft'},h('h2',null,'今週、気が向いたら'),h('p',{class:'sub'},'できなかった日の分は、ここに回しておきました。やらなくても大丈夫。'),leftK.map(k=>h('a',{class:'btn ghost',href:k==='run'?'#run':'#go/'+k},k==='run'?'ラン・ウォーク':SESSIONS[k].name))));
 el.append(h('div',{class:'card soft'},h('p',{class:'sub'},'今週の実施：'+weekCount(d)+'回 / 今日の消費 約'+Math.round(doneOn(d).reduce((s,l)=>s+l.kcal,0))+'kcal')));
 el.append(h('div',{class:'row'},h('a',{class:'btn ghost',href:'#go/Q'},'すきま5分'),h('a',{class:'btn ghost',href:'#go/N'},'あご・首5分')),h('div',{class:'row'},h('a',{class:'btn ghost',href:'#go/M'},'ほぐし10分'),S.settings.hardOn?h('a',{class:'btn ghost',href:'#go/H'},'HIIT 約15分'):null));
 if(!hasBody())el.prepend(h('div',{class:'card soft'},h('p',null,'体重 '+S.settings.weightKg+'kg・腹囲 '+S.settings.waistCm+'cm は「仮」の値です。測れたら記録してな、カロリー計算が正確になるで。'),h('a',{class:'btn ghost',href:'#body'},'体重・腹囲を測って記録')));
 remindBanner(el)}
function thisWeekDone(k){const d=today();const mon=monday(d);for(let i=0;i<=diffDays(mon,d);i++)if(didSession(addDays(mon,i),k))return true;return false}
function weekCount(d){const mon=monday(d);let n=0;for(let i=0;i<7;i++)n+=doneOn(addDays(mon,i)).length;return n}
function estMin(key){return plan30(key).total}

/* ---------- 実行（タイマーとガイド） ---------- */
let wake=null;
async function lockOn(){try{wake=await navigator.wakeLock?.request('screen')}catch(e){}}
function beep(){try{const a=new (window.AudioContext||window.webkitAudioContext)();const o=a.createOscillator();o.frequency.value=880;o.connect(a.destination);o.start();o.stop(a.currentTime+.15)}catch(e){}navigator.vibrate?.(200)}
function vGo(el,v){const key=v.split('/')[1];if(!SESSIONS[key]){location.hash='#home';return}
 if(SESSIONS[key].hard&&!S.settings.hardOn){el.append(h('h1',null,SESSIONS[key].name),coach('worried','これはきつめのメニューやで。設定の「きつめメニューを入れる」をONにしてからな。'),h('a',{class:'btn',href:'#settings'},'設定をひらく'),h('a',{class:'btn ghost',href:'#home'},'戻る'));return}
 const P=plan30(key);const items=P.items;if(!items.length){el.append(h('p',null,'今日の痛みの設定で、できる種目がありません。今日は休みましょう。'),h('a',{class:'btn',href:'#home'},'戻る'));return}
 const seq=[];for(const e of P.w)seq.push({e,set:0,ph:'準備',fixed:e.base});for(let s=0;s<P.sets;s++)for(const e of items)seq.push({e,set:s+1});for(const e of P.c)seq.push({e,set:0,ph:'整理',fixed:e.base});
 const R={i:0,done:{},sec:{},start:Date.now(),rest:0,paused:false};lockOn();
 const box=h('div',{class:'go'});el.append(box);
 const stopBtn=()=>h('button',{class:'btn stop',onclick:()=>{if(confirm('中止しますか？（ここまでの分は記録できます）'))finish(true)}},'中止');
 function show(){clearInterval(timer);box.replaceChildren();
  if(R.i>=seq.length)return finish(false);
  const{e,set,ph,fixed}=seq[R.i];const tg=fixed||target(e.id,today());const vi=S.variant[e.id]||0;
  box.append(h('p',{class:'sub'},(R.i+1)+' / '+seq.length+'　'+(ph?ph+'運動':set+'セット目')),h('h1',null,e.name,e.hard?h('span',{class:'hard'},'つよめ'):null),h('p',{class:'lv'},'レベル：'+e.levels[vi]),formBox(e),h('ol',{class:'steps'},e.steps.map(s=>h('li',null,s))),e.cautions.length?h('p',{class:'sub'},'注意：'+e.cautions.join('・')):null,h('p',{class:'warn small'},'やめる合図：'+e.stop.join('・')));
  if(e.unit==='sec'){let left=tg;const big=h('div',{class:'big'},left+'秒');const pb=h('button',{class:'btn ghost',onclick:()=>{R.paused=!R.paused;pb.textContent=R.paused?'再開':'一時停止'}},'一時停止');
   box.append(big,h('div',{class:'row'},pb,h('button',{class:'btn ghost',onclick:()=>{rec(e,tg-left);next()}},'次へ'),stopBtn()));R.paused=false;
   timer=setInterval(()=>{if(R.paused)return;left--;big.textContent=left+'秒';if(left<=0){beep();rec(e,tg);next()}},1000)}
  else{let n=tg;const big=h('div',{class:'big'},n+'回');box.append(h('p',{class:'sub'},'目標 '+tg+'回。できた回数に合わせてね。'),big,h('div',{class:'row'},h('button',{class:'btn ghost',onclick:()=>{n=Math.max(0,n-1);big.textContent=n+'回'}},'−1'),h('button',{class:'btn ghost',onclick:()=>{n=Math.min(999,n+1);big.textContent=n+'回'}},'＋1')),h('div',{class:'row'},h('button',{class:'btn',onclick:()=>{rec(e,n);next()}},'できた → 次へ'),stopBtn()))}}
 function rec(e,n){if(seq[R.i]&&seq[R.i].ph)return;R.done[e.id]=Math.max(R.done[e.id]||0,n);R.sec[e.id]=(R.sec[e.id]||0)}
 function next(){clearInterval(timer);R.i++;if(R.i>=seq.length)return finish(false);let r=20;box.replaceChildren(h('h1',null,'休憩'),h('div',{class:'big'},r+'秒'),h('p',{class:'sub'},'次：'+seq[R.i].e.name),h('button',{class:'btn ghost',onclick:show},'休憩をとばす'));const big=box.querySelector('.big');timer=setInterval(()=>{r--;big.textContent=r+'秒';if(r<=0){beep();show()}},1000)}
 function finish(stopped){clearInterval(timer);wake?.release?.();const dur=Math.round((Date.now()-R.start)/1000);box.replaceChildren();
  const its=Object.entries(R.done).map(([ex,done])=>({ex,done:Math.round(done),variant:S.variant[ex]||0}));
  const met=its.length?its.reduce((s,i)=>s+(EXM[i.ex].met||MET[EXM[i.ex].cat]),0)/its.length:3;const k=Math.round(kcal(met,curWeight(),dur));
  box.append(h('h1',null,stopped?'ここまでおつかれさま':'完了！おつかれさま'),h('p',null,fmtT(dur)+'・約'+k+'kcal'),h('h2',null,'きつさは？'));let rpe=3;
  const rs=h('div',{class:'chips'});['1 楽','2 やや楽','3 ちょうど','4 きつい','5 限界'].forEach((t,i)=>rs.append(h('button',{class:'chip'+(i===2?' on':''),onclick:ev=>{rpe=i+1;rs.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));ev.target.classList.add('on')}},t)));
  const note=h('textarea',{maxlength:'500',placeholder:'メモ（任意・体調など）'});
  box.append(rs,note,h('button',{class:'btn',onclick:async()=>{if(!its.length&&!confirm('記録する種目がありません。記録しますか？'))return;const prs=newPRs(its);S.logs.push({id:uid(),date:today(),type:'session',session:key,durSec:dur,kcal:k,items:its,rpe,note:note.value.slice(0,500)});await save();
   box.replaceChildren(h('img',{src:prs.length?'img/mamie_chibi.webp':'img/mamie_happy.webp',alt:'メイミー',class:'hero'}),h('h1',null,'記録しました'),prs.length?coach('proud',pick(LINES.pr,Date.now()%7)):rpe>=4?coach('worried',LINES.hard[0]):coach('happy',pick(LINES.done,Date.now()%7)),prs.length?h('p',{class:'ok'},'自己ベスト更新：'+prs.join('、')):null,h('a',{class:'btn',href:'#home'},'今日へ戻る'))}},'記録する'))}
 show()}
function formBox(e){const f=formFigure(e.id);f.classList.add('tap');f.setAttribute('role','button');f.setAttribute('tabindex','0');f.setAttribute('aria-label',e.name+'のフォーム図を拡大');
 const open=()=>{const ov=h('div',{class:'zoom',role:'dialog','aria-label':e.name+'のフォーム図'},h('h2',null,e.name),formFigure(e.id),h('button',{class:'btn',onclick:()=>ov.remove()},'閉じる'));ov.addEventListener('click',ev=>{if(ev.target===ov)ov.remove()});document.body.append(ov)};
 f.addEventListener('click',open);f.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();open()}});return h('div',null,f,h('p',{class:'sub small'},'図をタップで拡大'))}
function newPRs(its){const r=[];for(const i of its){const prev=S.logs.flatMap(l=>l.items||[]).filter(x=>x.ex===i.ex&&(x.variant||0)===i.variant).reduce((m,x)=>Math.max(m,x.done),0);if(prev>0&&i.done>prev)r.push(EXM[i.ex].name+' '+i.done+(EXM[i.ex].unit==='sec'?'秒':'回'))}return r}
// 図（外部素材なし：SVGの棒人間）
function fig(e){const ns='http://www.w3.org/2000/svg';const s=document.createElementNS(ns,'svg');s.setAttribute('viewBox','0 0 120 70');s.setAttribute('class','fig');s.setAttribute('aria-hidden','true');
 const P={strength:'M60 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M60 18 L60 40 M60 26 L44 34 M60 26 L76 34 M60 40 L48 52 L48 64 M60 40 L72 52 L72 64',stretch:'M30 14 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M30 20 L44 44 M44 44 L96 50 M34 28 L80 46 M44 44 L40 62',mobility:'M60 10 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M60 16 L60 42 M60 24 L42 10 M60 24 L78 10 M60 42 L50 64 M60 42 L70 64',care:'M60 14 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M60 20 L60 44 M60 28 L48 40 M60 28 L72 40 M44 46 L76 46 M52 46 L52 64 M68 46 L68 64'};
 const p=document.createElementNS(ns,'path');p.setAttribute('d',P[e.cat]);p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','3');p.setAttribute('stroke-linecap','round');s.append(p);return s}

/* ---------- 計画 ---------- */
function vPlan(el){const d=today();const w=blockWeek(d);
 el.append(h('h1',null,'計画（4週ブロック）'),h('p',{class:'sub'},'ブロック'+S.block.no+'（'+S.block.start.slice(5).replace('-','/')+'〜）'));
 const bar=h('div',{class:'blk'});for(let i=0;i<4;i++)bar.append(h('div',{class:'wk'+(i===w%4?' on':'')+(i===3?' de':'')},h('b',null,(i+1)+'週'),h('span',null,['土台','+10%','+20%','回復'][i])));el.append(bar);
 el.append(h('p',{class:'sub'},'目標回数は1→2→3週で少しずつ増え、4週目は軽めにして回復します。ブロックを終えたら回数が少し増え、2回上がったら次のレベル（より難しい動き）に進みます。時間は伸ばさず、どの日も30分以内に収まるよう自動で調整します。'));
 if(w>=4){el.append(h('div',{class:'card main'},h('h2',null,'ブロック'+S.block.no+' 完了！'),h('p',null,'4週間おつかれさまでした。実施した種目の目標を上げて、次のブロックへ進みましょう。'),h('button',{class:'btn',onclick:async()=>{const up=levelUp();S.block={start:monday(d),no:S.block.no+1};await save();alert(up.length?'レベルアップ：'+up.join('、'):'次のブロックを始めます');render()}},'次のブロックへ')))}
 const mon=monday(d);const t=h('div',{class:'card'},h('h2',null,'今週の予定'));
 for(let i=0;i<7;i++){const dd=addDays(mon,i);const wd=dOf(dd).getDay();const k=S.settings.week[wd];const done=k!=='rest'&&didSession(dd,k);
  const sel=h('select',{'aria-label':WD[wd]+'曜の予定',onchange:async ev=>{S.settings.week[wd]=ev.target.value;await save();render()}},[['A',SESSIONS.A.name],['B',SESSIONS.B.name],['M',SESSIONS.M.name],['Q',SESSIONS.Q.name],['N',SESSIONS.N.name],['H',SESSIONS.H.name+(S.settings.hardOn?'':'（OFF中）')],['run','ラン・ウォーク'],['rest','休み']].map(([v,n])=>h('option',{value:v,selected:v===k},n)));
  t.append(h('div',{class:'day'+(dd===d?' today':'')},h('span',{class:'dn'},WD[wd]+' '+dd.slice(8)),sel,h('span',{class:'st'},done?'✓':(dd<d&&k!=='rest'?'→振替':''))))}
 el.append(t,h('p',{class:'sub'},'「→振替」はできなかった日。今日の画面の「気が向いたら」に回ります。休んでもペナルティはありません。'))}
function levelUp(){const up=[];const st=S.block.start;const cnt={};for(const l of S.logs)if(l.date>=st&&l.type==='session')for(const i of l.items){cnt[i.ex]=(cnt[i.ex]||0)+1}
 for(const[ex,n]of Object.entries(cnt))if(n>=3){const e=EXM[ex];const p=S.prog[ex]||0;const vi=S.variant[ex]||0;
  if(p>=2&&vi<e.levels.length-1){S.variant[ex]=vi+1;S.prog[ex]=0;up.push(e.name+'→'+e.levels[vi+1])}
  else if(p<2){S.prog[ex]=p+1;up.push(e.name+'（回数アップ）')}}return up}

/* ---------- 成長 ---------- */
function vProgress(el){const d=today();el.append(h('h1',null,'成長の記録'),coach('proud',pick(LINES.progress)));
 const sess=S.logs.filter(l=>l.type==='session').length,runs=S.logs.filter(l=>l.type!=='session');const km=runs.reduce((s,l)=>s+l.distKm,0);const kc=S.logs.reduce((s,l)=>s+l.kcal,0);
 el.append(h('div',{class:'stats'},stat('トレーニング',sess+'回'),stat('ラン・ウォーク',km.toFixed(1)+'km'),stat('消費合計',Math.round(kc)+'kcal'),stat('続けた週',activeWeeks()+'週')));
 el.append(calendar(d));
 // 体
 const b=[...S.body].sort((a,b)=>a.date<b.date?-1:1);const bw=b.filter(x=>x.weightKg),bc=b.filter(x=>x.waistCm);
 const card=h('div',{class:'card'},h('h2',null,'体重・腹囲'));
 if(bw.length>=2)card.append(chart(bw.map(x=>[x.date,x.weightKg]),'kg'));
 const ba=(arr,k,u)=>arr.length>=2?h('p',null,(k==='weightKg'?'体重':'腹囲')+'：'+arr[0][k]+u+'（'+arr[0].date.slice(5)+'）→ '+arr[arr.length-1][k]+u+'（'+arr[arr.length-1].date.slice(5)+'）　'+sgn(arr[arr.length-1][k]-arr[0][k])+u):null;
 card.append(ba(bw,'weightKg','kg'),ba(bc,'waistCm','cm'),b.length<2?h('p',{class:'sub'},'2回以上記録すると、ビフォー・アフターが出ます。'):null,h('a',{class:'btn ghost',href:'#body'},'体重・腹囲を記録'));el.append(card);
 // レベルとPR
 const lv=h('div',{class:'card'},h('h2',null,'種目ごとの強さ'));const used=new Set(S.logs.flatMap(l=>(l.items||[]).map(i=>i.ex)));
 if(!used.size)lv.append(h('p',{class:'sub'},'トレーニングをすると、ここに自己ベストとレベルが並びます。'));
 for(const ex of used){const e=EXM[ex];const pr=S.logs.flatMap(l=>l.items||[]).filter(i=>i.ex===ex).reduce((m,i)=>Math.max(m,i.done),0);lv.append(h('div',{class:'lvrow'},h('span',null,e.name),h('span',{class:'sub'},e.levels[S.variant[ex]||0]+'・段階'+((S.prog[ex]||0)/2+1)),h('b',null,'PR '+pr+(e.unit==='sec'?'秒':'回'))))}
 el.append(lv,badges())}
const sgn=v=>(v>0?'+':'')+(Math.round(v*10)/10);
const stat=(a,b)=>h('div',{class:'stat'},h('span',null,a),h('b',null,b));
function activeWeeks(){return new Set(S.logs.map(l=>monday(l.date))).size}
function calendar(d){const c=h('div',{class:'card'},h('h2',null,d.slice(0,7).replace('-','年')+'月の実施'));const g=h('div',{class:'cal'});WD.slice(1).concat('日').forEach(w=>g.append(h('span',{class:'wh'},w)));
 const first=d.slice(0,8)+'01';const off=(dOf(first).getDay()+6)%7;for(let i=0;i<off;i++)g.append(h('span'));const dm=new Date(+d.slice(0,4),+d.slice(5,7),0).getDate();
 for(let i=1;i<=dm;i++){const dd=d.slice(0,8)+pad(i);const n=doneOn(dd).length;g.append(h('span',{class:'cd'+(n?' on':'')+(dd===d?' t':''),title:dd},String(i)))}c.append(g,h('p',{class:'sub'},'色の日＝何か体を動かした日。空いた日は休養日です。'));return c}
function chart(pts,u){const ns='http://www.w3.org/2000/svg';const W=320,H=140,P=28;const s=document.createElementNS(ns,'svg');s.setAttribute('viewBox',`0 0 ${W} ${H}`);s.setAttribute('class','chart');
 const vs=pts.map(p=>p[1]);let lo=Math.min(...vs),hi=Math.max(...vs);if(hi-lo<1){lo-=.5;hi+=.5}const t0=dOf(pts[0][0]).getTime(),t1=dOf(pts[pts.length-1][0]).getTime()||t0+1;
 const X=t=>P+(W-P*1.5)*((dOf(t).getTime()-t0)/Math.max(1,t1-t0)),Y=v=>H-P+(-(H-P*1.6))*(v-lo)/(hi-lo);
 const mk=(t,a)=>{const e=document.createElementNS(ns,t);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);s.append(e);return e};
 mk('polyline',{points:pts.map(p=>X(p[0])+','+Y(p[1])).join(' '),fill:'none',stroke:'#2a7d5f','stroke-width':2.5});pts.forEach(p=>mk('circle',{cx:X(p[0]),cy:Y(p[1]),r:3,fill:'#2a7d5f'}));
 [[hi,Y(hi)],[lo,Y(lo)]].forEach(([v,y])=>{const t=mk('text',{x:2,y:y+4,'font-size':10,fill:'#555'});t.textContent=(Math.round(v*10)/10)+u});
 [pts[0][0],pts[pts.length-1][0]].forEach((t,i)=>{const e=mk('text',{x:i?W-40:P,y:H-6,'font-size':10,fill:'#555'});e.textContent=t.slice(5)});return s}
function badges(){const B=[];const L=S.logs;const km=L.filter(l=>l.type!=='session').reduce((s,l)=>s+l.distKm,0);
 const add=(ok,n,desc)=>B.push(h('div',{class:'badge'+(ok?' on':'')},h('b',null,n),h('span',null,desc)));
 add(L.length>=1,'はじめの一歩','初めて記録した');add(L.filter(l=>l.type==='session').length>=10,'10回目','トレーニング10回');add(S.block.no>=2,'1ブロック完走','4週間を走りきった');
 add(activeWeeks()>=8,'2か月の習慣','8週で体を動かした');add(km>=10,'10km','ラン・ウォーク合計10km');add(km>=42.195,'フルマラソン分','合計42.195km');
 const bw=[...S.body].filter(x=>x.weightKg).sort((a,b)=>a.date<b.date?-1:1);add(bw.length>=2&&bw[0].weightKg-bw[bw.length-1].weightKg>=2,'−2kg','記録開始から2kg減');
 return h('div',{class:'card'},h('h2',null,'しるし'),h('div',{class:'badges'},B))}

/* ---------- 体重・腹囲 ---------- */
function vBody(el){el.append(h('h1',null,'体重・腹囲を記録'));const dt=h('input',{type:'date',value:today()}),w=h('input',{type:'number',step:'0.1',min:'20',max:'300',inputmode:'decimal',placeholder:'例 72.5'}),wa=h('input',{type:'number',step:'0.1',min:'40',max:'200',inputmode:'decimal',placeholder:'例 85'});
 el.append(h('label',null,'日付',dt),h('label',null,'体重（kg）',w),h('label',null,'腹囲・へそ回り（cm）',wa),h('button',{class:'btn',onclick:async()=>{const x={id:uid(),date:dt.value};if(!validDate(dt.value))return alert('日付が正しくありません');
  if(w.value!==''){const v=+w.value;if(!isNum(v,20,300))return alert('体重は20〜300kgで入れてください');x.weightKg=Math.round(v*10)/10}
  if(wa.value!==''){const v=+wa.value;if(!isNum(v,40,200))return alert('腹囲は40〜200cmで入れてください');x.waistCm=Math.round(v*10)/10}
  if(x.weightKg==null&&x.waistCm==null)return alert('体重か腹囲を入れてください');S.body.push(x);await save();location.hash='#progress'}},'記録する'));
 const list=h('div',{class:'card'},h('h2',null,'これまで'));[...S.body].sort((a,b)=>a.date<b.date?1:-1).slice(0,30).forEach(b=>list.append(h('div',{class:'lvrow'},h('span',null,b.date),h('span',null,(b.weightKg!=null?b.weightKg+'kg ':'')+(b.waistCm!=null?b.waistCm+'cm':'')),h('button',{class:'mini',onclick:async()=>{if(!confirm('この記録を消しますか？'))return;S.body=S.body.filter(x=>x.id!==b.id);await save();render()}},'消す'))));el.append(list)}

/* ---------- ラン ---------- */
let map=null;const HOME=[34.7468,135.3965]; // 武庫之荘駅付近（住所ではなく地図の初期中心）
function vRun(el,v){const mode=v.split('/')[1]||'rec';el.append(h('h1',null,'ラン・ウォーク'),h('div',{class:'seg'},h('a',{href:'#run/rec',class:mode==='rec'?'on':''},'記録する'),h('a',{href:'#run/plan',class:mode==='plan'?'on':''},'コースを作る'),h('a',{href:'#run/list',class:mode==='list'?'on':''},'履歴')));
 if(mode==='list')return runList(el);
 const mdiv=h('div',{id:'map'});el.append(mdiv);
 if(window.L){if(map)map.remove();map=L.map(mdiv,{zoomControl:true}).setView(HOME,15);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map)}else mdiv.append(h('p',{class:'sub'},'地図を読み込めませんでした。'));
 mode==='plan'?runPlan(el):runRec(el)}
function runPlan(el){const pts=[];let line=null,marks=[];const info=h('div',{class:'big small'},'0.00 km');
 const upd=()=>{const km=routeKm(pts);info.textContent=km.toFixed(2)+' km';if(line)line.remove();if(map&&pts.length)line=L.polyline(pts,{color:'#e0663a',weight:5}).addTo(map)};
 if(map)map.on('click',ev=>{if(pts.length>=500)return;pts.push([+ev.latlng.lat.toFixed(6),+ev.latlng.lng.toFixed(6)]);marks.push(L.circleMarker(ev.latlng,{radius:5}).addTo(map));upd()});
 const name=h('input',{maxlength:'60',placeholder:'コース名（例：武庫川ぐるっと）'});
 el.append(h('p',{class:'sub'},'地図をタップして通る道に点を置くと距離が出ます（直線距離の合計）。'),info,h('div',{class:'row'},h('button',{class:'btn ghost',onclick:()=>{pts.pop();marks.pop()?.remove();upd()}},'1つ戻す'),h('button',{class:'btn ghost',onclick:()=>{if(pts.length<2)return;pts.push(pts[0]);upd()}},'スタートに戻る')),name,
  h('button',{class:'btn',onclick:async()=>{if(pts.length<2)return alert('点を2つ以上置いてください');const n=name.value.trim();if(!n)return alert('コース名を入れてください');S.courses.push({id:uid(),name:n.slice(0,60),pts:pts.slice(),km:routeKm(pts)});await save();alert('保存しました');location.hash='#run/list'}},'コースを保存'));
 const cl=h('div',{class:'card'},h('h2',null,'保存したコース'));S.courses.forEach(c=>cl.append(h('div',{class:'lvrow'},h('button',{class:'mini',onclick:()=>{if(map){const l=L.polyline(c.pts,{color:'#2a7d5f',weight:5}).addTo(map);map.fitBounds(l.getBounds())}}},'表示'),h('span',null,c.name),h('b',null,c.km.toFixed(2)+'km'),h('button',{class:'mini',onclick:async()=>{if(!confirm('消しますか？'))return;S.courses=S.courses.filter(x=>x.id!==c.id);await save();render()}},'消す'))));el.append(cl)}
function runRec(el){const st=h('div',{class:'stats'});const msg=h('p',{class:'sub'},'アプリを開いたまま（画面ON）で記録します。画面を消したり他のアプリに切り替えると、Androidの制限で記録が止まることがあります。');
 const R=runner||{on:false,pts:[],km:0,t0:0,wid:null,line:null};runner=R;
 const draw=()=>{const sec=R.on?(Date.now()-R.t0)/1000:R.sec||0;const pace=R.km>0.05?sec/60/R.km:0;st.replaceChildren(stat('距離',R.km.toFixed(2)+'km'),stat('時間',fmtT(sec)),stat('ペース',pace?Math.floor(pace)+"'"+pad(Math.round(pace%1*60))+'"/km':'—'),stat('消費',Math.round(kcal(speedMet(sec?R.km/(sec/3600):0),curWeight(),sec))+'kcal'))};
 const btn=h('button',{class:'btn'},R.on?'終了して保存':'スタート');
 btn.onclick=async()=>{if(!R.on){if(!navigator.geolocation)return alert('この端末では位置情報が使えません');R.on=true;R.pts=[];R.km=0;R.t0=Date.now();lockOn();
   R.wid=navigator.geolocation.watchPosition(p=>{if(p.coords.accuracy>50)return;const pt=[+p.coords.latitude.toFixed(6),+p.coords.longitude.toFixed(6)];const last=R.pts[R.pts.length-1];if(last){const dk=hav(last,pt);if(dk<0.003)return;if(dk>0.5)return;R.km+=dk}R.pts.push(pt);if(map){if(R.line)R.line.remove();R.line=L.polyline(R.pts,{color:'#e0663a',weight:5}).addTo(map);map.setView(pt)}},e=>{msg.textContent='位置情報エラー：'+(e.code===1?'許可されていません。設定で位置情報を許可してください。':e.message)},{enableHighAccuracy:true,maximumAge:2000,timeout:20000});btn.textContent='終了して保存';R.iv=setInterval(draw,1000)}
  else{navigator.geolocation.clearWatch(R.wid);clearInterval(R.iv);wake?.release?.();R.on=false;const sec=Math.round((Date.now()-R.t0)/1000);R.sec=sec;const km=Math.round(R.km*1000)/1000;const kmh=sec?km/(sec/3600):0;
   const k=Math.round(kcal(speedMet(kmh),curWeight(),sec));S.logs.push({id:uid(),date:today(),type:kmh>=7?'run':'walk',durSec:sec,kcal:k,distKm:km,route:R.pts.slice(0,5000)});await save();runner=null;alert('保存しました：'+km.toFixed(2)+'km・約'+k+'kcal');location.hash='#run/list'}};
 draw();el.append(st,btn,msg,h('p',{class:'sub'},'手入力：'),manualRun())}
function manualRun(){const km=h('input',{type:'number',step:'0.01',min:'0',max:'300',placeholder:'距離 km'}),mn=h('input',{type:'number',min:'1',max:'1440',placeholder:'時間 分'});
 return h('div',{class:'row'},km,mn,h('button',{class:'btn ghost',onclick:async()=>{const k=+km.value,m=+mn.value;if(!isNum(k,0.01,300)||!isNum(m,1,1440))return alert('距離(0.01〜300km)と時間(1〜1440分)を入れてください');const kmh=k/(m/60);S.logs.push({id:uid(),date:today(),type:kmh>=7?'run':'walk',durSec:Math.round(m*60),kcal:Math.round(kcal(speedMet(kmh),curWeight(),m*60)),distKm:k});await save();location.hash='#run/list'}},'追加'))}
function runList(el){const L2=S.logs.filter(l=>l.type!=='session').sort((a,b)=>a.date<b.date?1:-1);const c=h('div',{class:'card'});if(!L2.length)c.append(h('p',{class:'sub'},'まだ記録がありません。'));
 L2.slice(0,50).forEach(l=>{const pace=l.distKm>0?l.durSec/60/l.distKm:0;c.append(h('div',{class:'lvrow'},h('span',null,l.date.slice(5)+' '+(l.type==='run'?'ラン':'ウォーク')),h('span',null,l.distKm.toFixed(2)+'km・'+fmtT(l.durSec)+(pace?'・'+Math.floor(pace)+"'"+pad(Math.round(pace%1*60))+'"':'')),h('b',null,l.kcal+'kcal')))});el.append(c)}

/* ---------- その他 ---------- */
function vMore(el){el.append(h('h1',null,'その他'),h('div',{class:'menu'},[['#menu','種目一覧（レベル変更）'],['#body','体重・腹囲を記録'],['#settings','設定・バックアップ'],['#safety','安全のために（必ずお読みください）']].map(([a,n])=>h('a',{class:'btn ghost',href:a},n))))}
function vMenu(el){el.append(h('h1',null,'種目一覧'),h('p',{class:'sub'},'器具の設定でOFFの種目、今日痛い部位に負担がかかる種目は灰色です。'));
 for(const[c,n]of Object.entries(CATS)){el.append(h('h2',null,n));for(const e of EX.filter(x=>x.cat===c)){const vi=S.variant[e.id]||0;const sel=h('select',{'aria-label':e.name+'のレベル',onchange:async ev=>{S.variant[e.id]=+ev.target.value;await save()}},e.levels.map((l,i)=>h('option',{value:i,selected:i===vi},'Lv'+(i+1)+' '+l)));
  el.append(h('details',{class:'card ex'+(allowed(e)?'':' off')},h('summary',null,e.name+'　',e.hard?h('span',{class:'hard'},'つよめ'):null,h('span',{class:'sub'},e.target)),formBox(e),h('ol',{class:'steps'},e.steps.map(s=>h('li',null,s))),h('p',{class:'sub'},'負担がかかる部位：'+(e.load.map(a=>AREAS[a]).join('・')||'少ない')+(e.equip?'　器具：'+{tube:'チューブ',dumbbell:'ダンベル'}[e.equip]:'')),e.cautions.length?h('p',{class:'sub'},'注意：'+e.cautions.join('・')):null,h('p',{class:'warn small'},'やめる合図：'+e.stop.join('・')),h('label',null,'レベル',sel)))}}}
function vSafety(el){el.append(h('h1',null,'安全のために'),h('div',{class:'card'},...[
 'このアプリは運動の記録と参考情報のためのもので、医療行為・診断・治療ではありません。','痛み・しびれ・めまい・息苦しさ・胸の痛みが出たら、すぐに中止してください。','痛みが続く・強くなる・しびれがある時は、整形外科などの医療機関に相談してください。','持病がある方、服薬中の方は、始める前に医師に相談してください。','強度は「少し物足りない」くらいから。反動をつけず、呼吸を止めないで行いましょう。','消費カロリーは身体活動のメッツ表（Compendium of Physical Activities／国立健康・栄養研究所）を使った目安です。'].map(t=>h('p',null,t))))}
function vSettings(el){const st=S.settings;el.append(h('h1',null,'設定'));
 const w=h('input',{type:'number',step:'0.1',min:'20',max:'300',value:st.weightKg});w.onchange=async()=>{const v=+w.value;if(!isNum(v,20,300)){alert('20〜300kgで入れてください');w.value=st.weightKg;return}st.weightKg=Math.round(v*10)/10;await save()};
 el.append(h('div',{class:'card'},h('h2',null,'体重（カロリー計算用）'+(hasBody()?'':'【仮】')),h('p',{class:'sub'},'体重の記録があれば最新の記録を使います。まだ記録がないので仮の値（75kg・腹囲85cm）を使っています。'),w));
 const eq=h('div',{class:'card'},h('h2',null,'使える器具'),h('p',{class:'sub'},'基本は自重のみ。持っている器具をONにすると種目が増えます。'));
 [['tube','チューブ'],['dumbbell','ダンベル'],['mat','マット']].forEach(([k,n])=>eq.append(h('label',{class:'tg'},h('input',{type:'checkbox',checked:st.equip[k],onchange:async ev=>{st.equip[k]=ev.target.checked;await save()}}),n)));el.append(eq);
 el.append(h('div',{class:'card'},h('h2',null,'きつめメニュー'),h('label',{class:'tg'},h('input',{type:'checkbox',checked:st.hardOn,onchange:async ev=>{st.hardOn=ev.target.checked;await save()}}),'きつめメニューを入れる'),h('p',{class:'sub'},'ONにすると、マウンテンクライマー・バーピー・Vアップなど「つよめ」の種目と「しっかりHIIT（約15分）」が使えます。体調の悪い日・痛みのある日はOFFのままで。')));
 const rt=h('input',{type:'time',value:st.remindTime});rt.onchange=async()=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(rt.value))return;st.remindTime=rt.value;await save()};
 el.append(h('div',{class:'card'},h('h2',null,'お知らせ'),h('label',{class:'tg'},h('input',{type:'checkbox',checked:st.remindOn,onchange:async ev=>{st.remindOn=ev.target.checked;if(st.remindOn&&'Notification'in window&&Notification.permission==='default')await Notification.requestPermission();await save()}}),'毎日お知らせする'),h('label',null,'時刻',rt),
  h('p',{class:'sub'},'正直な注意：ホーム画面のアプリ（PWA）は、閉じている間に決まった時刻で通知を出す仕組みがAndroidでもまだ使えません。このアプリを開いた時に「今日まだ」の案内と通知を出します。確実に毎日知らせたい場合は、スマホの時計アプリのアラームを併用してください。')));
 el.append(h('div',{class:'card'},h('h2',null,'バックアップ'),h('p',{class:'sub'},'データはこのスマホの中だけにあります。機種変更や消去に備えて、ときどき書き出してください。'),
  h('button',{class:'btn',onclick:()=>download('karada-backup-'+today()+'.json',{app:'karada-techo',version:1,exported:new Date().toISOString(),data:S})},'全部を書き出す'),
  h('label',{class:'btn ghost'},'バックアップから復元',h('input',{type:'file',accept:'application/json,.json',class:'hide',onchange:restore})),
  h('button',{class:'btn ghost',onclick:()=>download('karada-daily-'+today()+'.json',dailyExport())},'日ごとの消費カロリー・体重を書き出す（家計アプリ連携用）')));
 el.append(h('div',{class:'card'},h('h2',null,'見本モード'),h('p',{class:'sub'},'見本データで画面を試せます。本番データには触れません。'),h('a',{class:'btn ghost',href:'?demo=1#home'},DEMO?'見本モード中':'見本モードを開く'),DEMO?h('a',{class:'btn ghost',href:location.pathname+'#home'},'本番に戻る'):null),h('p',{class:'sub'},'からだ手帳 v1.0'))}
function download(name,obj){const b=new Blob([JSON.stringify(obj,null,1)],{type:'application/json'});const a=h('a',{href:URL.createObjectURL(b),download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
function dailyExport(){const m={};const g=d=>m[d]||(m[d]={date:d,kcalBurned:0,exerciseMin:0,runKm:0,weightKg:null,waistCm:null});
 for(const l of S.logs){const x=g(l.date);x.kcalBurned+=l.kcal;x.exerciseMin+=Math.round(l.durSec/60);if(l.distKm)x.runKm=Math.round((x.runKm+l.distKm)*100)/100}
 for(const b of S.body){const x=g(b.date);if(b.weightKg!=null)x.weightKg=b.weightKg;if(b.waistCm!=null)x.waistCm=b.waistCm}
 return{format:'karada-daily',version:1,generated:new Date().toISOString(),unit:{kcalBurned:'kcal',exerciseMin:'min',runKm:'km',weightKg:'kg',waistCm:'cm'},days:Object.values(m).sort((a,b)=>a.date<b.date?-1:1)}}
async function restore(ev){const f=ev.target.files[0];ev.target.value='';if(!f)return;if(f.size>LIMIT)return alert('ファイルが大きすぎます（4MBまで）');
 let n;try{n=validate(JSON.parse(await f.text()))}catch(e){return alert('復元できません：'+e.message)}
 if(new Blob([JSON.stringify(n)]).size>LIMIT)return alert('データが大きすぎます');
 if(!confirm('今のデータをバックアップの内容に置き換えます。よろしいですか？'))return;
 try{await idbPut(KEY,n)}catch(e){return alert('保存できなかったので、元のデータのままにしました：'+e.message)}S=n;alert('復元しました');location.hash='#home';render('home')}
function remindBanner(el){const st=S.settings;if(!st.remindOn)return;const now=new Date();const[hh,mm]=st.remindTime.split(':').map(Number);if(now.getHours()*60+now.getMinutes()<hh*60+mm||doneOn(today()).length)return;
 el.prepend(h('div',{class:'card soft'},'お知らせ時刻を過ぎました。今日は数分だけでもどうですか？（休む日ならそれでOK）'));
 const k='notified-'+today();if('Notification'in window&&Notification.permission==='granted'&&!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');navigator.serviceWorker?.ready.then(r=>r.showNotification('からだ手帳',{body:'今日の数分、どうですか？',icon:'icon-192.png'})).catch(()=>{})}}

/* ---------- 見本データ ---------- */
function demoData(){const n=fresh();const t=today();n.block={start:addDays(monday(t),-14),no:2};n.settings.weightKg=74;n.settings.equip.tube=true;
 for(let i=40;i>=1;i--){const d=addDays(t,-i);const wd=dOf(d).getDay();const k=n.settings.week[wd];if(i%5===0)continue;
  if(k==='A'||k==='B'){const it=SESSIONS[k].items.map(id=>({ex:id,done:EXM[id].base+Math.floor((40-i)/8),variant:0}));n.logs.push({id:uid(),date:d,type:'session',session:k,durSec:900,kcal:70,items:it,rpe:3})}
  else if(k==='M')n.logs.push({id:uid(),date:d,type:'session',session:'M',durSec:600,kcal:30,items:SESSIONS.M.items.map(id=>({ex:id,done:EXM[id].base,variant:0})),rpe:2});
  else if(k==='run')n.logs.push({id:uid(),date:d,type:'run',durSec:1800,kcal:290,distKm:4.2})}
 for(let i=42;i>=0;i-=7)n.body.push({id:uid(),date:addDays(t,-i),weightKg:Math.round((76-(42-i)*0.05)*10)/10,waistCm:Math.round((90-(42-i)*0.04)*10)/10});
 n.courses.push({id:uid(),name:'見本：駅まわり',pts:[[34.7468,135.3965],[34.7500,135.3990],[34.7520,135.3940],[34.7468,135.3965]],km:0});n.courses[0].km=routeKm(n.courses[0].pts);n.prog={squat:2,pushup:2};return n}

/* ---------- 起動 ---------- */
(async()=>{try{db=await idb();if(DEMO){S=demoData()}else{const v=await idbGet(KEY);if(v){try{S=validate({app:'karada-techo',version:1,data:v})}catch(e){alert('保存データの一部が読めませんでした（'+e.message+'）。初期状態で開きます。元のデータは端末内に別名で退避しました。');await idbPut('broken-'+Date.now(),v);S=fresh();await save()}}else{S=fresh();await save()}}
 if(DEMO){const _s=save;save=async()=>{}}
 }catch(e){alert('保存領域を開けませんでした：'+e.message)}
 try{if(!DEMO&&navigator.storage?.persist&&!(await navigator.storage.persisted()))await navigator.storage.persist()}catch(e){}
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});nav()})();
