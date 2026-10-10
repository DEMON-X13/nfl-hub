/* Behaviour patches to the betting app, applied to the app's source as it is loaded, never to
 * the file: betting/app/x_nfl_betting_model.html is shipped from nfl-model-lab and stays as it
 * came.
 *
 *   require('./patches.js')(html)   the app with the patches in, for update.js and build.js
 *   require('./patches.js').season(html)   the season and storage key the app is built for
 *
 * Both the job (update.js, which grades the games and writes state.json) and the page
 * (build.js, which the Bets and Stats page frames) run the app through here, so a pick the job
 * grades and the pick the page shows come from the same rules. Each edit must match exactly
 * once: an app update that moves a line stops the job and the build rather than quietly
 * dropping a fix.
 *
 * What they change, and why:
 *
 *  1. Who starts at quarterback (qbUnavailable, expectedQB). The app took the highest QB on the
 *     depth chart not listed Out or Doubtful this week. Depth charts keep an injured starter at
 *     the top, and the game designations only come with the final report (Wednesday for a
 *     Thursday game, Friday for the rest), so from Tuesday until then every starter who missed
 *     his team's last game was counted back in: Baker Mayfield as TB's starter all week while
 *     he had not practised, Caleb Williams over Tyson Bagent while he was Out in weeks 3 and 4
 *     and DNP all of week 5. Now a quarterback who did not start his team's last game and was on
 *     that week's injury report is held out until this week's report clears him (a Full or
 *     Limited practice, no Out or Doubtful designation); while he is held, whoever started the
 *     last game is expected. Questionable with no practice on the final report is out too. A
 *     Questionable player who practised stays in, and the absences card says Q.
 *  2. The absences card and the graded games' notes name the starter a change replaced
 *     (stint.from): a fading change read "Jalon Daniels -> Jalon Daniels". A quarterback held
 *     out says so ("C.Williams not cleared"), and "returning" is kept for a starter coming back,
 *     not a new one. Under it, the date of the injury report and depth chart it was built on, or,
 *     before the season's first kickoff, that there is no injury report yet (filesDue: none is
 *     filed before the week of the opener, so its absence is not flagged as stale until then).
 *  3. Neutral sites (ingestGames): a game nflverse codes 'Home' that is played abroad is read
 *     as neutral (betting/neutral_sites.json), so PHI at JAX in London does not hand JAX home
 *     field in Alpha, the Challenger and the ratings.
 *  4. Freeze at kickoff (freezeAtKickoff, processResults, pickGrid). The job records each
 *     coming game's call on every run before its kickoff, and from kickoff on keeps the last
 *     one: the game is graded on the pick a reader saw before it, never one recomputed after it
 *     from a depth chart or report that moved in the meantime.
 *  5. The season's phase (seasonPhase): once every scheduled game is played the absences card
 *     says the season is over (or that the next round is not posted yet) instead of listing
 *     week 18's or the Super Bowl's absences as if they were coming.
 *
 * The app's version line (APP_BUILD) gains the patches' own version, HUB_PATCHES: bump it with
 * any change here or to what betting/tools/build.js lays over the app (the record, the pick grid),
 * as the props parts bump theirs.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const NEUTRAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'betting', 'neutral_sites.json'), 'utf8'));
delete NEUTRAL.why;

/* a game's kickoff, as a time: nflverse gives the day and the Eastern clock time, and the offset
   is the one New York keeps on that day (no hard-coded switch dates). Used here, in the app (set
   in by HELPERS below), by update.js and by the smoke test. */
function etOffsetMin(ms){ const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
  return (Date.UTC(+p.year,+p.month-1,+p.day,+p.hour%24,+p.minute)-ms)/60000; }
function kickoffMs(g){ if(!g||!/^\d{4}-\d\d-\d\d$/.test(String(g.gameday||''))) return null;
  const [y,m,d]=g.gameday.split('-').map(Number), [hh,mm]=String(g.gametime||'13:00').split(':').map(Number);
  const local=Date.UTC(y,m-1,d,hh||0,mm||0); let t=local-etOffsetMin(local)*60000; t=local-etOffsetMin(t)*60000; return t; }
/* which of the season's files a run cannot do without, from the season's schedule (games.csv's rows
   or the state's) and a time. The roster and the depth chart from a week before the first kickoff.
   The injury report from the first kickoff on: the league files none before the week of the opener
   and nflverse has nothing to give until it does (injuries_<season>.csv is a 404 until then), so a
   run before the opener without one is not stale, and the absences card says there is none yet.
   The stats files once a final is a day and a half old. update.js refuses to publish without a
   file that is due; the smoke test holds the published state to the same rule. */
function filesDue(games,now){ const ks=games.map(kickoffMs).filter(t=>t!=null), first=ks.length?Math.min(...ks):null;
  const fin=g=>g.home_score!=null&&g.home_score!=='';
  const finals=games.filter(fin).map(kickoffMs).filter(t=>t!=null);
  return {first,lineups:first!=null&&first-now<8*86400000,injuries:first!=null&&now>=first,stats:finals.some(t=>now-t>36*3600000)}; }

function edit(html, from, to, what, times = 1) {
  const n = html.split(from).length - 1;
  if (n !== times) throw new Error(`betting app patch "${what}": expected ${times} match${times === 1 ? '' : 'es'}, found ${n}`);
  return html.split(from).join(to);
}

/* the helpers the patches call, set in front of the app's quarterback section */
const HELPERS = String.raw`/* ---------- patched in from betting/tools/patches.js (the app file itself is not edited) ---------- */
const NEUTRAL_SITES=__NEUTRAL__;
/* a game nflverse codes 'Home' that is played abroad is a neutral-site game */
function neutralRow(r){
  if(!r||String(r.location||'').trim()!=='Home') return r;
  const st=String(r.stadium||'').trim().toLowerCase();
  if((NEUTRAL_SITES.games||{})[r.game_id]==='Neutral'||(NEUTRAL_SITES.stadiums||[]).some(s=>s.toLowerCase()===st)) return Object.assign({},r,{location:'Neutral'});
  return r;
}
/* one player's rows of the injury report for one week (one a week, as nflverse publishes it) */
function injRows(id,w){ return (S.injuries&&S.injuries.rows||[]).filter(r=>r.gsis_id===id&&+r.week===+w); }
const injRS=r=>String(r&&r.report_status||'').trim();
const injPS=r=>String(r&&r.practice_status||'').toLowerCase();
/* the week of the team's last graded game before week w (a bye in between is skipped) */
function teamLastWeek(team,w){ let best=null;
  for(const p of Object.values(S.processed||{})) if((p.home===team||p.away===team)&&+p.week<+w&&(best===null||+p.week>best)) best=+p.week;
  return best; }
/* has the team filed this week's injury report yet (any row of its own for the week) */
function teamFiled(team,w){ return (S.injuries&&S.injuries.rows||[]).some(r=>normTeam(r.team)===team&&+r.week===+w); }
/* held out: a quarterback who did not start his team's last game and was on that week's injury
   report, until this week's report clears him: a Full or Limited practice, or a report his team
   has filed without him on it (he is healthy). No report yet this week (Monday, Tuesday) is not
   a clearance, and neither is a practice he missed. */
function qbHeld(id,team,w){ w=w??currentWeekDefault();
  const st=S.qb&&S.qb.stint&&S.qb.stint[team]; if(!st||!st.last||st.last===id) return false;
  const lw=teamLastWeek(team,w); if(lw==null||!injRows(id,lw).length) return false;
  const rows=injRows(id,w); if(!rows.length) return !teamFiled(team,w);
  return !rows.some(r=>/full|limited/.test(injPS(r)));
}
/* the starter held out by qbHeld above whoever is expected, for the absences card */
function qbHeldFor(team,w){ const exp=expectedQB(team,w);
  for(const x of teamQBs(team)){ if(x.id===exp) return null; if(!qbUnavailable(x.id,w)&&qbHeld(x.id,team,w)) return x.id; }
  return null; }
/* the starter the team's current run of starts replaced: kept on the stint from now on, and read
   back from the graded games' records for a stint written before it was */
function qbFrom(team){ const st=S.qb&&S.qb.stint&&S.qb.stint[team]; if(!st) return null; if(st.from) return st.from;
  const gs=Object.values(S.processed||{}).filter(p=>(p.home===team||p.away===team)&&p.qb&&p.qb[team]).sort((a,b)=>+b.week-+a.week);
  let from=null; for(const p of gs){ const q=p.qb[team]; if(q.actual!==st.last) break; from=q.last; }
  return from&&from!==st.last?from:null; }
/* has this quarterback started a game for this team this season */
function qbStarted(team,id){ return Object.values(S.qb&&S.qb.starters||{}).some(s=>s&&s[team]&&s[team].id===id); }
/* where the season stands: 'on' while a scheduled game is unplayed, 'over' once the Super Bowl
   is in, 'waiting' when every posted game is played and the next round is not posted yet */
function seasonPhase(){ const all=S.schedule||[]; if(!all.length) return 'on';
  if(all.some(g=>g.result==null)) return 'on';
  return all.some(g=>g.game_type==='SB')?'over':'waiting'; }
/* a game's kickoff, as a time, and the files a run needs by then (patches.js keeps the one copy of these, for the job and the smoke too) */
__KICKOFF__
/* the call a reader saw before kickoff, once the game has kicked off and until it is graded */
function frozenCall(g,now){ const ak=S.atKickoff&&S.atKickoff[g.game_id]; if(!ak) return null;
  const k=kickoffMs(g); return k!=null&&k<=(now??Date.now())?ak:null; }
/* run by the job after each run's files are in: every game kicking off in the next eight days
   gets this run's call; a game that has kicked off keeps the last call made before it; a graded
   game's call moves into its record and leaves this list */
function freezeAtKickoff(now){ now=now??Date.now(); S.atKickoff=S.atKickoff||{};
  const r6=x=>Math.round(x*1e6)/1e6;
  for(const g of S.schedule){ const id=g.game_id;
    if(S.processed[id]){ delete S.atKickoff[id]; continue; }
    const k=kickoffMs(g);
    if(k!=null&&k<=now) continue;
    if(g.result!=null||k==null||k>now+8*86400000||!S.teams[g.home_team]||!S.teams[g.away_team]){ delete S.atKickoff[id]; continue; }
    const pr=predict(g,S.teams), h=S.teamsH?predict(g,S.teamsH,MODEL_H.pure):null;
    S.atKickoff[id]={pick:pr.pick,conf:r6(pr.conf),margin:r6(pr.margin),pHome:r6(pr.pHome),blended:!!pr.blended,
      h:h?{pick:h.pick,conf:r6(h.conf),margin:r6(h.margin),pHome:r6(h.pHome)}:null};
  }
  for(const id of Object.keys(S.atKickoff)) if(!S.schedule.some(g=>g.game_id===id)) delete S.atKickoff[id];
  return Object.keys(S.atKickoff).length;
}
/* what the absences card was built from, and when: the job's last download of each file. A report
   that has not reached this week says so (in bold from a day before the week's first kickoff, when
   it should be in), and so does a depth chart more than a day and a half old: stale inputs are
   shown as stale, never as this week's. */
function injAsOf(now){ now=now??Date.now(); const w=currentWeekDefault(), bits=[];
  const fmt=t=>new Date(t).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const ks=S.schedule.filter(g=>+g.week===+w).map(kickoffMs).filter(t=>t!=null), first=ks.length?Math.min(...ks):null;
  if(S.injuries&&S.injuries.rows&&S.injuries.rows.length){ const iw=Math.max(...S.injuries.rows.map(r=>+r.week||0));
    const late=iw<w&&first!=null&&first-now<24*3600000;
    bits.push('the injury report through week '+iw+(S.injuries.loaded?' (read '+fmt(S.injuries.loaded)+')':'')
      +(iw<w?(late?' <b class="inj-stale">(week '+w+'\'s is not on nflverse yet: nobody is ruled out for it here)</b>':' (week '+w+'\'s is not out yet)'):'')); }
  else if(S.schedule.length) bits.push(filesDue(S.schedule,now).injuries?'<b class="inj-stale">no injury report</b>':'no injury report yet (the first is filed in the week of the opener)');
  if(S.depth&&S.depth.dt){ const d=new Date(S.depth.dt), old=now-d.getTime()>36*3600000;
    bits.push('the depth chart of '+fmt(d)+(old?' <b class="inj-stale">(more than a day and a half old)</b>':'')); }
  return bits.length?'<p class="muted inj-asof" style="margin:8px 0 0">From nflverse: '+bits.join(' and ')+'.</p>':''; }
`;

const HUB_PATCHES = 'hub patches 4 \\u00b7 2026-10-10';

function logic(html) {
  { const m = html.match(/^const APP_BUILD='([^'\n]*)';$/mg) || [];
    if (m.length !== 1) throw new Error('betting app patch "the version line": expected 1 match, found ' + m.length);
    html = html.replace(m[0], () => m[0].replace(/';$/, () => ' + ' + HUB_PATCHES + "';")); }
  html = edit(html, '/* ---------- quarterback ratings (variant K3, nfl-model-lab) ---------- */',
    HELPERS.replace('__NEUTRAL__', () => JSON.stringify(NEUTRAL)).replace('__KICKOFF__', () => [etOffsetMin, kickoffMs, filesDue].map(String).join('\n'))
      + '/* ---------- quarterback ratings (variant K3, nfl-model-lab) ---------- */', 'the helpers');

  /* 1. who starts at quarterback */
  html = edit(html, `function qbUnavailable(id,w){ w=w??currentWeekDefault();
  if(S.roster&&S.roster.rows&&S.roster.rows.some(r=>r.id===id)) return true;
  return (S.injuries&&S.injuries.rows||[]).some(r=>r.gsis_id===id&&+r.week===w&&['Out','Doubtful'].includes(String(r.report_status||'').trim())); }`,
  `function qbUnavailable(id,w){ w=w??currentWeekDefault();
  if(S.roster&&S.roster.rows&&S.roster.rows.some(r=>r.id===id)) return true;
  /* ruled out, or Questionable with no practice on the final report (the designation comes with it) */
  return injRows(id,w).some(r=>['Out','Doubtful'].includes(injRS(r))||(injRS(r)==='Questionable'&&/did not/.test(injPS(r)))); }`, 'qbUnavailable');
  html = edit(html, `function expectedQB(team,w){ const qbs=teamQBs(team); if(!qbs.length) return null; const ok=qbs.find(x=>!qbUnavailable(x.id,w)); return ok?ok.id:'__none__'; }`,
  `function expectedQB(team,w){ const qbs=teamQBs(team); if(!qbs.length) return null;
  const st=S.qb&&S.qb.stint&&S.qb.stint[team];
  for(const x of qbs){
    if(qbUnavailable(x.id,w)) continue;
    /* held out until cleared: whoever started the last game, if he can play, else the next one down */
    if(qbHeld(x.id,team,w)){ if(st&&st.last&&qbs.some(y=>y.id===st.last)&&!qbUnavailable(st.last,w)) return st.last; continue; }
    return x.id; }
  return '__none__'; }`, 'expectedQB');

  /* 2. the starter a change replaced, and what the card says */
  html = edit(html, 'const zero={pts:0,drop:0,exp:null,last:null,k:0};', 'const zero={pts:0,drop:0,exp:null,last:null,k:0,from:null,held:null};', 'qbAdj zero');
  html = edit(html, 'return {pts:QB_MODEL.beta*drop,drop,exp,last,k};',
    "return {pts:QB_MODEL.beta*drop,drop,exp,last,k,from:exp===last?(qbFrom(team)||last):last,held:qbHeldFor(team,w)};", 'qbAdj result');
  html = edit(html, 'fresh[tm]={last:actual,gap:(!prev||prev===actual)?0:qbRating(prev)-qbRating(actual),k:1};',
    'fresh[tm]={last:actual,gap:(!prev||prev===actual)?0:qbRating(prev)-qbRating(actual),k:1,from:prev||null};', 'repairQBStints from');
  html = edit(html, 'S.qb.stint[tm]={last:actual,gap:prev===actual?0:qbRating(prev)-qbRating(actual),k:1};',
    'S.qb.stint[tm]={last:actual,gap:prev===actual?0:qbRating(prev)-qbRating(actual),k:1,from:prev||null};', 'applyQBGame from');
  html = edit(html, 'return `${team}: QB ${qbName(q.last)} → ${qbName(q.exp)}',
    'return `${team}: QB ${qbName(q.from||q.last)} → ${qbName(q.exp)}', 'qbNote names the replaced starter');
  html = edit(html, '${qbName(q.last)} ${qbRating(q.last).toFixed(3)} \\u2192 ${qbName(q.exp)}',
    '${qbName(q.from||q.last)} ${qbRating(q.from||q.last).toFixed(3)} \\u2192 ${qbName(q.exp)}', 'the absences card names the replaced starter', 2);
  html = edit(html, "${q.exp===q.last?'change, fading':'returning'}",
    "${q.held?qbName(q.held)+' not cleared':(q.exp===q.last?'change, fading':(qbStarted(tm,q.exp)?'returning':'new starter'))}", 'the absences card label');
  html = edit(html, 'const qbLive=Object.keys(S.qb&&S.qb.stint||{}).some(tm=>qbAdj(tm).pts);',
    'const qbLive=Object.keys(S.qb&&S.qb.stint||{}).some(tm=>{ const q=qbAdj(tm); return q.pts||q.held; });', 'the absences card, held starters');
  html = edit(html, '.filter(tm=>!qbShown.has(tm)&&qbAdj(tm).pts).forEach(',
    '.filter(tm=>{ if(qbShown.has(tm)) return false; const q=qbAdj(tm); return q.pts||q.held; }).forEach(', 'the absences card rows, held starters');
  html = edit(html, `return h+'<div class="empty">Nobody in those groups has a designation against them this week.</div>';`,
    `return h+'<div class="empty">Nobody in those groups has a designation against them this week.</div>'+injAsOf();`, 'the absences card source line, empty');
  html = edit(html, `+body+'</tbody></table>';
  return h;`, `+body+'</tbody></table>'+injAsOf();
  return h;`, 'the absences card source line');
  html = edit(html, `function renderImpact(){
  const w=currentWeekDefault();`, `function renderImpact(){
  const w=currentWeekDefault();
  if(seasonPhase()==='over') return '';
  if(seasonPhase()==='waiting') return '<p class="muted" style="margin:0">Every posted game has been played. The next round\\'s absences appear here once nflverse posts its games.</p>';`, 'the absences card, season over');

  /* 3. neutral sites */
  html = edit(html, `  for(const r of rows){ if(+r.season!==S.season) continue;
    let g=byId[r.game_id];`, `  for(let r of rows){ if(+r.season!==S.season) continue; r=neutralRow(r);
    let g=byId[r.game_id];`, 'ingestGames neutral sites');

  /* 4. freeze at kickoff */
  html = edit(html, `    const pr=predict(g,S.teams);
    const prH=S.teamsH?predict(g,S.teamsH,MODEL_H.pure):null;`, `    /* the call made before kickoff, when the job recorded one (freezeAtKickoff) */
    const ak=S.atKickoff&&S.atKickoff[g.game_id];
    const pr=ak?{...ak}:predict(g,S.teams);
    const prH=ak&&ak.h?{...ak.h}:(S.teamsH?predict(g,S.teamsH,MODEL_H.pure):null);`, 'processResults grades the call made before kickoff');
  html = edit(html, '    S.processed[g.game_id].qb=applyQBGame(g);',
    '    S.processed[g.game_id].qb=applyQBGame(g);\n    if(ak){ S.processed[g.game_id].atKickoff=true; delete S.atKickoff[g.game_id]; }', 'processResults marks the frozen call');
  html = edit(html, `    const pr=done?{pick:done.pick}:predict(g,S.teams);
    const prH=done?(done.h||null):(S.teamsH?predict(g,S.teamsH,MODEL_H.pure):null);`, `    const fz=done?null:frozenCall(g);
    const pr=done?{pick:done.pick}:(fz||predict(g,S.teams));
    const prH=done?(done.h||null):(fz?fz.h:(S.teamsH?predict(g,S.teamsH,MODEL_H.pure):null));`, 'pickGrid shows the call made before kickoff');
  return html;
}

/* the season the app is built for and the storage key it keeps it under: the app is the one
   place the season is set (freshState), and the job, the Joker and Broly all follow it */
function season(html) {
  const s = html.match(/function freshState\(\)\{\s*return \{ season:(\d{4}),/g) || [];
  const k = html.match(/^const KEY='([^']+)';$/mg) || [];
  if (s.length !== 1 || k.length !== 1) throw new Error('the app\'s season or storage key is not where patches.js expects it');
  return { season: +s[0].match(/(\d{4})/)[1], key: k[0].match(/'([^']+)'/)[1] };
}

module.exports = logic;
module.exports.season = season;
module.exports.NEUTRAL = NEUTRAL;
module.exports.kickoffMs = kickoffMs;
module.exports.filesDue = filesDue;
module.exports.HUB_PATCHES = HUB_PATCHES;
