/* The visitor's light or dark look (the owner's call of 17 October 2026: "keep this whole layout as dark
 * mode, and then make a light mode version that people can tab on and off on the top right").
 *
 * Dark is the look and every visitor's default, whatever the system's preference says. The switch at the
 * top right of the header ([data-theme-toggle], a 44px button named "Light mode", aria-pressed while the
 * light look is on) puts html[data-theme="light"] on the page, which theme.css's light palette answers,
 * and back again ("dark"). The choice is the visitor's own setting, kept in this browser alone under its
 * own key, nflhub_theme_v1 ('light' or 'dark'), and nothing else: never the prop model's S, never sent
 * anywhere. Storage that throws, or holds anything but 'light', reads as dark and throws nothing.
 *
 * This runs in the page's <head>, before the body is parsed, so a light visitor's page is light from its
 * first paint, never a dark flash. The click is answered by one listener on the document, so the switch
 * works the moment it is drawn, before the page's own scripts have run. The framed betting tabs (Team
 * Rankings, Pick'em Record, X Bet Log) carry theme.css too (THEME_FRAME_HEAD): frames() in
 * hub.html writes the current look into a frame's document when it is made, and a press here
 * switches every frame already open. */
(function(){
  var KEY='nflhub_theme_v1', root=document.documentElement;
  var stored=function(){ try{ return localStorage.getItem(KEY)==='light'?'light':'dark'; }catch(e){ return 'dark'; } };
  var now=function(){ return root.getAttribute('data-theme')==='light'?'light':'dark'; };
  /* the switch says what it is and whether it is on; its glyph (theme.css) is the look a press gives */
  var draw=function(){ var t=now(), bs=document.querySelectorAll('[data-theme-toggle]');
    for(var i=0;i<bs.length;i++){ bs[i].setAttribute('aria-pressed',t==='light'?'true':'false');
      bs[i].setAttribute('title',t==='light'?'Switch to dark mode':'Switch to light mode'); } };
  var frames=function(t){ var fs=document.querySelectorAll('iframe');
    for(var i=0;i<fs.length;i++){ try{ var d=fs[i].contentDocument; if(d&&d.documentElement) d.documentElement.setAttribute('data-theme',t); }catch(e){} } };
  var set=function(t){ t=t==='light'?'light':'dark'; root.setAttribute('data-theme',t);
    try{ localStorage.setItem(KEY,t); }catch(e){}
    frames(t); draw(); };
  if(stored()==='light') root.setAttribute('data-theme','light');
  window.hubTheme={ KEY:KEY, now:now, set:set, draw:draw };
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-theme-toggle]');
    if(b) set(now()==='light'?'dark':'light'); });
  /* another tab of the site switched: this one follows, writing nothing (the storage event fires only in the others) */
  window.addEventListener('storage',function(e){ try{ if(e.key===KEY||e.key===null){ var t=stored(); root.setAttribute('data-theme',t); frames(t); draw(); } }catch(err){} });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',draw); else draw();
})();
