/* This browser's storage, and nothing beyond it.
 *
 * X's parlays and the X Bet Log are files in the repository (liveparlays/parlays.json and
 * liveparlays/xbets.json), which Claude edits from what the owner sends and every device reads,
 * read only, on every load. Nothing on this page writes anywhere but this browser's own storage:
 * there is no owner, no sign-in and no shared store. (Until 10 October 2026 a Firebase database
 * held both, written from the owner's devices; it is retired, and its last state is in the files.)
 *
 * Two things are left here, both run before the prop model's script.
 *
 * window.storage, which the prop model saves through when the page defines one: this browser's
 * localStorage and nothing else, with the prop model's builder, saved parlays, stake, book price
 * and margin read back without < > " and ` (no element, no way out of a quoted attribute), as
 * the page has always read them: a browser that kept a copy of the old shared document may hold
 * a string it took before the document was cleaned on the way in. Nothing a parlay holds uses
 * those four characters.
 *
 * And what the retired layers left in a browser, taken out once on load. Their flags go: the
 * owner link's secret (nflowner_v1), the sign-in session (nflsync_owner_v1), the device id
 * (nflsync_device_v1), the reader's mark (xparlays_v1) and the rev last seen (nflsync_v1). So do
 * their copies of the shared parlay document (nflsync_base_v1, a merge base, and xparlays_cache_v1,
 * a reader's last look), whose last state is in liveparlays/parlays.json. The section's old key
 * (live_parlays_v1: corrected lines, deletions, builders kept at kickoff, betting slips) goes only
 * where everything in it is in the file or was deleted: the one corrected line the store last
 * held (file|w3-dk-sgp-5|4 at 239.5, leg 4 of that parlay, which is the file's line), deletions,
 * and betting slips it deleted itself. Any other corrected line (on a parlay of the browser's own,
 * on another of X's legs, or on that leg at another number: a browser last opened before the store
 * may hold one), a kept builder, a slip it did not delete, or a key this page never wrote, and the
 * key stays where it is, unread. The X Bet Log's leftovers are
 * xbets.js's, once its file has been read. Nothing that holds a visitor's own data is touched: the
 * prop model's key (the builder, the saved parlays, the stake), my_parlays_v1, the betting app's
 * key and x_nfl_bets_preshare_<season> stay exactly as they are. */
(function(){
  /* the prop model's key: the build writes part2's own KEY over this default */
  const PROP_KEY=/*PROP_KEY*/'props_2026_v1', PROP_PARTS=['parlay','saved','stake','bookPrice','margin'];
  const ls={
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } },
    del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
  const parse=s=>{ try{ return s?JSON.parse(s):null; }catch(e){ return null; } };
  const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);

  /* a copy whose strings and keys have lost < > " and `, whose numbers are finite, and which nests
     no deeper than a parlay does */
  const BAD=/[<>"`]/g;
  function clean(v,d){
    d=d|0;
    if(typeof v==='string') return v.replace(BAD,'');
    if(typeof v==='number') return isFinite(v)?v:null;
    if(v==null||typeof v==='boolean') return v;
    if(d>=12||typeof v!=='object') return null;
    if(Array.isArray(v)) return v.map(x=>clean(x,d+1));
    const o={};
    for(const k of Object.keys(v)){ const kk=k.replace(BAD,''); if(kk!=='__proto__') o[kk]=clean(v[k],d+1); }
    return o;
  }

  /* ---- what the retired layers left ---- */
  for(const k of ['nflowner_v1','nflsync_owner_v1','nflsync_device_v1','xparlays_v1','nflsync_v1','nflsync_base_v1','xparlays_cache_v1']) ls.del(k);
  /* the section's old key: gone only where all it holds is in the file or was deleted. CARRIED is
     the store's last live.lines, which the file has (a line is settled only at exactly that value) */
  { const CARRIED={'file|w3-dk-sgp-5|4':239.5}, raw=ls.get('live_parlays_v1');
    if(raw!=null){
      const v=parse(raw), removed=isObj(v)&&isObj(v.removed)?v.removed:{};
      const only=(o,ok)=>o===undefined||(isObj(o)&&Object.keys(o).every(ok));
      const settled=isObj(v)
        &&Object.keys(v).every(k=>['lines','removed','kept','bet'].includes(k))
        &&only(v.lines,k=>Object.prototype.hasOwnProperty.call(CARRIED,k)&&typeof v.lines[k]==='number'&&v.lines[k]===CARRIED[k])
        &&only(v.removed,()=>true)
        &&only(v.kept,()=>false)
        &&only(v.bet,dev=>Array.isArray(v.bet[dev])&&v.bet[dev].every(s=>isObj(s)&&removed['bet|'+s.id]));
      if(settled) ls.del('live_parlays_v1');
    } }

  /* ---- the prop model's storage: this browser's own ---- */
  window.storage={
    async get(key){
      const raw=ls.get(key);
      if(raw==null) return null;
      if(key!==PROP_KEY) return {value:raw};
      const v=parse(raw);
      if(!isObj(v)) return {value:raw};
      for(const k of PROP_PARTS) if(v[k]!==undefined) v[k]=clean(v[k]);
      return {value:JSON.stringify(v)};
    },
    async set(key,value){
      if(!ls.set(key,String(value))) throw new Error('local storage refused the write');
    }
  };
})();
