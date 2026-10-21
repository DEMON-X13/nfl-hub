/* The admin link (the owner's call of 20 October 2026): https://demon-x13.github.io/nfl-hub/#owner=<his Odds API key>
 * makes the browser it is opened in the site owner's, "hide only". On his devices X Parlays and the X Bet Log are
 * on the tab bar and the parlay card offers Pull from DraftKings; on everyone else's they are not, and the page
 * reads neither file. The files themselves stay where they are and stay public: this hides two tabs, it protects
 * nothing in them. Anyone could write a record under the key below by hand and see the two tabs. What it protects
 * is the KEY, which never leaves this browser except to api.the-odds-api.com.
 *
 * Taking the link. Only the address's fragment counts (#owner=K, or #xparlays&owner=K, which keeps #xparlays),
 * never ?owner=, which a browser sends to GitHub's servers. The key is taken off the address at once, before
 * anything else on the page reads it (this runs in the page's <head>, before every style, the body and every
 * other script): history.replaceState, or, where that throws (a page opened from disk in an older engine),
 * location.replace('#'+the rest). A link pasted into a tab already open is caught by this file's hashchange
 * listener, added before the tab bar's own, so the tab bar only ever sees the cleaned address. The link is still
 * in the browser's own history and its address-bar suggestions as it was opened, and this browser's storage is
 * shared by every page on demon-x13.github.io (all of the owner's hubs): the owner is told both.
 *
 * Checking it. A key that is not 16-64 letters and digits is refused with no request (the retired owner link's
 * secret, the-old-owner-secret, among them). Any other is checked once, free: GET /v4/sports/?apiKey=K, which
 * spends no credit. 200: kept, checked. 401 with INVALID_KEY, DEACTIVATED_KEY or MISSING_KEY: refused, nothing
 * kept, one line in the header says so for this load. 401 OUT_OF_USAGE_CREDITS: a real key with no credits left,
 * kept so. A 429, a 5xx, a timeout, a network failure or anything else: kept as not checked yet (ok:null), and
 * checked again quietly on each load until it is answered (a 200 marks it checked; a refusal signs this browser
 * out). Once kept, the page reloads (at the tab the link named: #xparlays&owner=K opens on X Parlays), so the X
 * tabs, their files and the frames only ever see the state a load began with. A link whose key is the one already
 * kept, and checked or waiting for its check, asks nothing: on a page that loaded as the admin's it costs nothing, no
 * request and no reload; on one that loaded as a visitor's (another tab of the site kept the key after this one
 * loaded) it reloads, once, at the tab the link named, so the link is never silently ignored.
 *
 * What is kept: this browser's own storage, under nflhub_admin_v1 alone (a name no retired layer used: storage.js
 * takes those out on every load), as JSON {k, at, ok, checked, left, leftAt}: the key, when it was kept, true
 * (checked), null (not checked yet) or false (The Odds API refused it since), when it was checked, and the credits
 * left as of when. A record whose ok is false loads as a visitor. Anything else under the key, or storage that
 * throws, reads as a visitor and throws nothing. Never the prop model's S, never any other key, never the page.
 *
 * window.HUB_ADMIN, the only code on the page that holds the key or sends it, and only to The Odds API:
 *   on()                      true where this load began as the admin's (and until Sign out)
 *   info()                    {ok, at, checked, left, leftAt} of the kept record, or null: never the key
 *   odds(path, params, signal) a GET of sports/americanfootball_nfl/events, or of an event's odds (the same
 *                             path, then /<its 32 hex id>/odds), the key added here, no-store, no referrer; resolves {status, ok, json, code, left, used, last}
 *                             (the x-requests-* headers), rejects on a network failure or an abort (15 s unless a
 *                             signal is handed in). A 401 INVALID_KEY or DEACTIVATED_KEY marks the record refused
 *                             (ok:false, so the next load is a visitor's) and fires hub-admin {refused:true}
 *   credits()                 the free GET /v4/sports/: resolves {left, used} (null where unknown)
 *   signOut()                 forgets the key on this device, with no reload
 * and a 'hub-admin' event on the document (detail {on, refused}) whenever on() changes or the key is refused.
 *
 * The header: an empty #hubAdmin in its stamp, after the light/dark switch, filled here for the admin with an
 * Admin mark (its title says when the key was checked and the credits left) and a Sign out button, and for anyone
 * with the one line saying a link was refused. Sign out asks, then forgets the key: the two tabs leave the bar, an
 * open one lands on the Matchups board, and the card's Pull goes. Another tab of the site signing out is
 * followed here; one signing in waits for this tab's next load (or the link opened in this one). */
(function(){
  var KEY='nflhub_admin_v1', root=document.documentElement;
  var API='https://api.the-odds-api.com/v4/';
  var FORMAT=/^[A-Za-z0-9]{16,64}$/;
  var PATHS=/^sports\/americanfootball_nfl\/events(\/[0-9a-f]{32}\/odds)?$/;
  var REFUSED={INVALID_KEY:1,DEACTIVATED_KEY:1,MISSING_KEY:1};
  var CHECK_MS=8000, ODDS_MS=15000;
  var nowIso=function(){ return new Date().toISOString(); };
  var isObj=function(v){ return !!v&&typeof v==='object'&&!Array.isArray(v); };
  var num=function(v){ return typeof v==='number'&&isFinite(v)&&v>=0?v:null; };
  var str=function(v){ return typeof v==='string'?v:null; };

  /* ---- the kept record ---- */
  var read=function(){
    var raw=null; try{ raw=localStorage.getItem(KEY); }catch(e){ return null; }
    var v=null; try{ v=raw?JSON.parse(raw):null; }catch(e){ return null; }
    if(!isObj(v)||typeof v.k!=='string'||!FORMAT.test(v.k)||!(v.ok===true||v.ok===null||v.ok===false)) return null;
    return {k:v.k, at:str(v.at), ok:v.ok, checked:str(v.checked), left:num(v.left), leftAt:str(v.leftAt)};
  };
  var write=function(r){ try{ localStorage.setItem(KEY,JSON.stringify(r)); return true; }catch(e){ return false; } };
  /* a change to the record this load began with (the same key): credits left, a check, a refusal */
  var amend=function(k,ch){ var r=read(); if(!r||r.k!==k) return; for(var p in ch) if(Object.prototype.hasOwnProperty.call(ch,p)) r[p]=ch[p]; write(r); };

  var REC=read(), ON=!!REC&&REC.ok!==false, MSG=null;
  /* before the body is parsed, so the first paint is the admin's or the visitor's, never one then the other */
  if(ON) root.setAttribute('data-admin','on');

  /* ---- The Odds API: the one place the key goes ---- */
  var header=function(r,h){ var v=null; try{ v=r.headers.get(h); }catch(e){} var n=v==null||v===''?NaN:+v; return isFinite(n)?n:null; };
  var ask=function(k,path,params,signal,ms){
    var q='apiKey='+encodeURIComponent(k);
    for(var p in params||{}) if(Object.prototype.hasOwnProperty.call(params,p)&&params[p]!=null) q+='&'+encodeURIComponent(p)+'='+encodeURIComponent(String(params[p]));
    var ac=null, t=null;
    if(!signal){ try{ ac=new AbortController(); t=setTimeout(function(){ try{ ac.abort(); }catch(e){} },ms); }catch(e){ ac=null; } }
    return fetch(API+path+'?'+q,{cache:'no-store',referrerPolicy:'no-referrer',signal:signal||(ac?ac.signal:undefined)})
      .then(function(r){ if(t) clearTimeout(t);
        var out={status:r.status, ok:!!r.ok, json:null, code:null, left:header(r,'x-requests-remaining'), used:header(r,'x-requests-used'), last:header(r,'x-requests-last')};
        return Promise.resolve().then(function(){ return r.json(); }).then(function(j){ out.json=j; }, function(){})
          .then(function(){ out.code=out.json&&typeof out.json.error_code==='string'?out.json.error_code:null;
            if(out.code==='OUT_OF_USAGE_CREDITS'&&out.left==null) out.left=0;
            return out; }); },
      function(e){ if(t) clearTimeout(t); throw e; });
  };
  /* what a check of the key says: 'ok', 'refused' or 'unchecked', and the credits left where it says */
  var check=function(k){
    return ask(k,'sports/',null,null,CHECK_MS).then(function(a){
      if(a.status===200) return {v:'ok', left:a.left};
      if(a.status===401&&a.code&&REFUSED[a.code]) return {v:'refused'};
      if(a.status===401&&a.code==='OUT_OF_USAGE_CREDITS') return {v:'ok', left:0};
      return {v:'unchecked'};
    },function(){ return {v:'unchecked'}; });
  };
  var fire=function(d){ try{ document.dispatchEvent(new CustomEvent('hub-admin',{detail:d})); }catch(e){} };

  /* ---- the header: the Admin mark and Sign out, or the line saying a link was refused ---- */
  var when=function(iso){ var d=new Date(iso); return iso&&!isNaN(d)?d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):''; };
  var draw=function(){
    var el=document.getElementById('hubAdmin'); if(!el) return;
    var h='';
    if(ON){ var r=read()||REC||{}, t=r.ok===false?'The Odds API refused this admin key'+(when(r.checked)?' '+when(r.checked):'')
        :r.ok===true&&when(r.checked)?'Admin key checked '+when(r.checked):'Admin key not checked yet';
      if(r.left!=null&&r.ok!==false) t+='; '+r.left+' credit'+(r.left===1?'':'s')+' left'+(when(r.leftAt)?' as of '+when(r.leftAt):'');
      h='<span class="ha-mark" title="'+t.replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; })+'">Admin</span> <button type="button" class="ha-out" data-admin-out>Sign out</button>'; }
    if(MSG) h+='<span class="ha-msg" role="status">'+MSG+'</span>';
    el.innerHTML=h; el.hidden=!h;
  };
  /* f once the page is parsed: at once if it is, else when it is */
  var parsed=function(f){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',f); else f(); };
  var drawn=function(){ parsed(draw); };

  /* ---- signing out: this device forgets the key, with no reload ---- */
  var out=function(refused){
    if(!ON) return;
    ON=false; root.removeAttribute('data-admin'); draw();
    fire({on:false, refused:!!refused});
  };
  var signOut=function(){ try{ localStorage.removeItem(KEY); }catch(e){} out(false); };

  /* ---- a link: taken off the address at once, then checked and kept ---- */
  /* the reload into the admin's page, at the tab the link named (#xparlays&owner=K: X Parlays), which this load, a
     visitor's, lands on the board meanwhile: so once the page is parsed, and on a task of its own, after the
     hashchange this may run in has reached the tab bar's own listener (which writes a visitor's #xparlays over as
     #matchups, and runs after this file's), the link's tab is put back on the address and the page reloads there */
  var reloadAt=function(rest){
    setTimeout(function(){ parsed(function(){
      if(rest&&location.hash!=='#'+rest){ var to=location.pathname+location.search+'#'+rest;
        try{ history.replaceState(history.state,'',to); }catch(e){ try{ location.replace('#'+rest); }catch(e2){} } }
      try{ location.reload(); }catch(e){}
    }); },0);
  };
  var LINK=/^#(?:(.*?)&)?owner=([^&]*)(?:&(.*))?$/;
  var take=function(){
    var m=LINK.exec(location.hash||''); if(!m) return false;
    var rest=[m[1],m[3]].filter(function(x){ return !!x; }).join('&'), k='';
    try{ k=decodeURIComponent(m[2]).trim(); }catch(e){ k=''; }
    try{ history.replaceState(history.state,'',location.pathname+location.search+(rest?'#'+rest:'')); }
    catch(e){ try{ location.replace('#'+rest); }catch(e2){} }
    if(!FORMAT.test(k)){ MSG='That admin link was refused.'; drawn(); return true; }
    var r=read();
    /* the key already kept here, checked or waiting for its quiet check: nothing to ask. A page that loaded as the
       admin's is done; one that loaded as a visitor's (another tab of the site kept the key since) reloads into the
       admin's, with no request */
    if(r&&r.k===k&&r.ok!==false){ if(!ON) reloadAt(rest); return true; }
    check(k).then(function(c){
      if(c.v==='refused'){ MSG='The Odds API refused that admin link.'; drawn(); return; }
      var at=nowIso(), ok=c.v==='ok';
      if(!write({k:k, at:at, ok:ok?true:null, checked:ok?at:null, left:c.left!=null?c.left:null, leftAt:c.left!=null?at:null})){
        MSG='This browser would not keep the admin key.'; drawn(); return; }
      /* the admin from the next load on: the page as it loads is the only state the X tabs and their files see */
      reloadAt(rest);
    });
    return true;
  };
  take();
  window.addEventListener('hashchange',function(){ take(); });

  /* a key kept but not checked yet is checked again, quietly, on each load until it is answered */
  if(ON&&REC.ok===null){ var k0=REC.k;
    check(k0).then(function(c){
      if(c.v==='ok'){ var at=nowIso(); amend(k0,c.left!=null?{ok:true,checked:at,left:c.left,leftAt:at}:{ok:true,checked:at}); draw(); }
      else if(c.v==='refused'){ var r=read(); if(r&&r.k===k0){ try{ localStorage.removeItem(KEY); }catch(e){} } out(true); }
    }); }

  window.HUB_ADMIN={
    on:function(){ return ON; },
    info:function(){ var r=read(); return r?{ok:r.ok, at:r.at, checked:r.checked, left:r.left, leftAt:r.leftAt}:null; },
    odds:function(path,params,signal){
      var r=read();
      if(!ON||!r) return Promise.reject(new Error('not the admin’s browser'));
      if(r.ok===false) return Promise.reject(new Error('The Odds API refused the admin key'));
      if(typeof path!=='string'||!PATHS.test(path)) return Promise.reject(new Error('not an address the admin key may be sent to: '+path));
      if(params&&(!isObj(params)||Object.prototype.hasOwnProperty.call(params,'apiKey'))) return Promise.reject(new Error('the key is added here'));
      var k=r.k;
      return ask(k,path,params,signal,ODDS_MS).then(function(a){
        var at=nowIso();
        if(a.left!=null) amend(k,{left:a.left,leftAt:at});
        if(a.status===401&&a.code&&REFUSED[a.code]){ amend(k,{ok:false,checked:at}); draw(); fire({on:ON, refused:true}); }
        else draw();
        return a; });
    },
    credits:function(){
      var r=read();
      if(!ON||!r) return Promise.reject(new Error('not the admin’s browser'));
      var k=r.k;
      return ask(k,'sports/',null,null,CHECK_MS).then(function(a){
        if(a.left!=null){ amend(k,{left:a.left,leftAt:nowIso()}); draw(); }
        return {left:a.left, used:a.used}; });
    },
    signOut:signOut
  };

  /* Sign out in the header: asked first */
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest&&e.target.closest('[data-admin-out]'); if(!b) return;
    if(!window.confirm('Sign out of admin on this device?')) return;
    signOut();
    var to=document.querySelector('#tabs [aria-selected="true"]')||document.querySelector('[data-theme-toggle]');
    try{ if(to) to.focus(); }catch(err){}
  });
  /* another tab of the site signed out (or emptied the site's storage): this one follows, writing nothing */
  window.addEventListener('storage',function(e){ try{ if((e.key===KEY||e.key===null)&&ON&&!read()) out(false); }catch(err){} });
  drawn();
})();
