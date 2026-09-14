const {JSDOM}=require('jsdom'); const fs=require('fs'); const Papa=require('papaparse');
const errs=[]; let mem=null;
const dom=new JSDOM(fs.readFileSync('/mnt/user-data/outputs/prop_model_2026.html','utf8'),
 {runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.Papa=Papa;w.fetch=()=>Promise.reject(new Error('x'));
  w.confirm=()=>true;w.alert=()=>{};w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
  w.storage={get:async()=>mem?{value:mem}:null,set:async(k,v)=>{mem=v;return true;}};
  w.addEventListener('error',e=>errs.push(e.message));}});
const w=dom.window,d=w.document;
setTimeout(()=>{
  const S=w.eval('S'), F=n=>w.eval(n);
  const ne=S.sched.find(x=>x.w===1&&x.h==='SEA'), cin=S.sched.find(x=>x.w===1&&x.h==='CIN');
  console.log('today',new Date().toISOString().slice(0,10),'| NE@SEA started?',F('gameStarted')(ne),'| TB@CIN (Sun) started?',F('gameStarted')(cin));
  const rows=[...d.querySelectorAll('.game')];
  console.log('list row NE@SEA:',rows[0].textContent.replace(/\s+/g,' ').trim().slice(0,70));
  // locked page: no checkboxes
  d.querySelector('[data-game="'+ne.id+'"]').click();
  [...d.querySelectorAll('.plrbtn')][0].click();
  console.log('locked page checkboxes:',d.querySelectorAll('[data-leg]').length,'| notice:',d.getElementById('gameView').querySelectorAll('.card')[1].textContent.replace(/\s+/g,' ').slice(0,80));
  // try to add a leg via toggleLeg directly -> must refuse
  const pid=Object.values(S.players).find(p=>p.team==='SEA'&&p.grp==='QB').id;
  F('toggleLeg')(ne.id+'|'+pid+'|passing_yards',200,ne,'over',false);
  console.log('leg added to started game?',Object.keys(S.parlay).length>0);
  // build a parlay on Sunday's game and save/lock
  d.getElementById('backBtn').click(); d.querySelector('[data-game="'+cin.id+'"]').click();
  const open=n=>[...d.querySelectorAll('.plrbtn')].find(b=>b.querySelector('.who').textContent.startsWith(n)).click();
  open('Joe Burrow');
  const cb=[...d.querySelectorAll('[data-leg]')].find(x=>x.dataset.main==='1'&&x.dataset.side==='under'&&x.dataset.leg.endsWith('passing_yards'));
  cb.checked=true; cb.dispatchEvent(new w.Event('change'));
  open("Ja'Marr Chase");
  const cb2=[...d.querySelectorAll('.statblk')].find(x=>x.querySelector('h4').textContent.includes('Receiving yards')).querySelector('[data-k="60"]');
  cb2.checked=true; cb2.dispatchEvent(new w.Event('change'));
  d.querySelector('[data-tab="parlay"]').click();
  console.log('\nbuilder legs:',Object.keys(S.parlay).length,'| save button enabled:',!d.getElementById('pSave').disabled);
  console.log('saved section before:',d.getElementById('savedCard').textContent.replace(/\s+/g,' ').slice(0,60));
  d.getElementById('pSave').click();
  console.log('after save: builder legs',Object.keys(S.parlay).length,'| saved',S.saved.length,'| status',F('settleParlay')(S.saved[0]).status);
  console.log('saved card:',d.getElementById('savedCard').textContent.replace(/\s+/g,' ').slice(0,120));
  // simulate uploading week 1 stats -> settlement + results on the locked page
  const stats=Papa.parse(fs.readFileSync('fake_wk1.csv','utf8'),{header:true,skipEmptyLines:true}).data;
  F('ingestStats')(stats); F('renderAll')();
  const s=F('settleParlay')(S.saved[0]);
  console.log('\nafter stats upload: parlay',s.status,'legs',s.legs.join(','));
  const a=F('actualFor')(1,S.saved[0].legs[0].pid); console.log('Burrow actual pass yds',a&&a.passing_yards,'vs line',S.saved[0].legs[0].k,S.saved[0].legs[0].side);
  d.querySelector('[data-tab="slate"]').click(); d.querySelector('[data-game="'+ne.id+'"]').click();
  [...d.querySelectorAll('.plrbtn')][0].click();
  const h4=d.querySelector('.statblk h4'); console.log('locked page stat header:',h4.textContent.replace(/\s+/g,' '));
  console.log('result marks on page:',d.querySelectorAll('.res.win').length,'wins',d.querySelectorAll('.res.loss').length,'misses');
  console.log('summary line:',d.querySelector('.plrbtn .sum').textContent.replace(/\s+/g,' ').slice(0,90));
  // clear saved
  d.querySelector('[data-tab="parlay"]').click(); d.getElementById('savedClear').click();
  console.log('\nafter clear: saved',S.saved.length);
  console.log('errors:',errs.length?errs:'none');
},1800);
