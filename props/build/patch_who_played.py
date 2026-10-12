"""app v101: a player with no stat line is graded on what he did, not voided.

settleLeg read a player with no stat row, once his game's stats were in, as a player who did not play,
and voided his leg. nflverse writes a player's week only when he has a stat, so a receiver who dressed,
ran routes and was never targeted has no row either, and DraftKings grades a player who takes part in
one play on what he did: Tory Horton (SEA, week 5 of 2026) ran 11 offensive snaps with no target, his
receptions over 1.5 lost at the book, and the page showed it void, as it had shown Ladd McConkey's
earlier. Every such leg made the record of overs look better than it was. The review of Sunday
11 October's parlays found it; the suggestions record (suggest_ledger.js) already graded such legs on
the snap counts, the page itself did not.

Who played now comes from the payload. The props job (weekly.py's who_played) reads nflverse's snap
counts (PFR's) for every finished game and bakes PAY.snaps, week -> game -> club -> the players the page
projects who took a snap of any kind and have no stat line, a club for every game whose snap counts and
stats are both in; and a stat row of zeros (from_snaps) for each of them who took a snap in his role, so
the Track Record and the projections see the game as well. settleLeg, for a player with no stat line
once his game's stats are in:
  - he took a snap (in his club's list, or a row of zeros): graded on zero, as the book grades him, by
    the page's own rowStats of nothing: an over or a rung loses, an under wins, a touchdown loses;
  - his club's snaps are in and he took none (or, a leg with no club, both clubs' are in): void;
  - no snap counts for his club yet: void only when that week's injury report had him Out (the payload
    keeps every earlier week's Outs), otherwise it waits (null), as the suggestions record waited.
ESPN was looked at and not used: its game summary, which the live tracking reads (liveRefresh and
refreshGameStats in part3.js, through espnStats), lists only players with a stat, and carries no
didNotPlay; its separate game-roster feed does (Horton: didNotPlay false), but the settlement has to be
the same on every device and in the job, with no network, and the snap counts are what the job
downloads already. The game page says which of the three it is where it used to say "did not play".

The audit's V9 plants snap counts and holds every branch: a player who played with no stat line loses
his over 1.5 and his rung and wins his under on zero; one his club's snaps leave out is void, by his
club or, with no club on the leg, by both; no snap counts for his club, Out on the report void,
Doubtful or nothing waits; a game with no stats waits. V15 holds the payload's snaps and zero rows to
each other and the page (every zero row a list's player, all zeros, never beside a real row, settled on
zero), and, with PROPS_AUDIT_RAW, to raw/snap_counts and raw/pw: a listed player has no stat row and a
snap row; a player the roster's PFR id places, at a position the page projects, with an offensive snap
and no stat row is listed and has his row of zeros.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'), ('audit', 'audit.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'function tookPart(' not in T['p2'], 'patch_who_played.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', r"const APP_BUILD='app v100 \u00b7 2026-10-12';", r"const APP_BUILD='app v101 \u00b7 2026-10-12';")

# ---- the settlement ----
sub1('p2', """function actualFor(week,pid){ return (S.actuals&&S.actuals[String(week)]&&S.actuals[String(week)][pid])||null; }
/* did a leg land? null while the stats for that week haven't been loaded */
function settleLeg(l){
  if(isGameLeg(l)) return settleGameLeg(l);
  const a=actualFor(l.week,l.pid);
  /* no stat line once his game's stats are in: he did not play, and a book voids the leg */
  if(!a) return (l.gid&&S.processedGames&&S.processedGames[l.gid])?'void':null;
  const v=a[l.stat]; if(v==null) return null;""",
     """function actualFor(week,pid){ return (S.actuals&&S.actuals[String(week)]&&S.actuals[String(week)][pid])||null; }
/* who took part in a finished game, by nflverse's snap counts as the props job baked them (PAY.snaps:
   week -> game -> club -> the players the page projects who took a snap and have no stat line;
   weekly.py's who_played). true: he took a snap. false: his club's snaps are in and he took none (or,
   with no club on the leg, both clubs' are in). null: no word on his club yet */
function tookPart(l){
  const W=PAY&&PAY.snaps&&PAY.snaps[String(l.week)], G=W&&W[l.gid]; if(!G) return null;
  for(const t in G) if((G[t]||[]).includes(l.pid)) return true;
  const team=l.team||(S.players&&S.players[l.pid]&&S.players[l.pid].team);
  if(team&&G[team]) return false;
  const g=S.sched.find(x=>x.id===l.gid);
  return g&&G[g.h]&&G[g.a]?false:null;
}
/* Out on that week's injury report: the payload keeps the current week's report and every earlier
   week's Outs */
function reportedOut(week,pid){
  return ((PAY&&PAY.injuries)||[]).some(r=>r&&r.gsis_id===pid&&+r.week===+week&&+r.season===SEASON&&String(r.report_status||'').trim()==='Out');
}
/* did a leg land? null while the stats for that week haven't been loaded */
function settleLeg(l){
  if(isGameLeg(l)) return settleGameLeg(l);
  let a=actualFor(l.week,l.pid);
  /* no stat line once his game's stats are in. nflverse writes a player's week only when he has a
     stat, so that alone is not "did not play": a receiver never targeted has none, and a book grades
     a player who takes part in one play on what he did. He took a snap: graded on zero (an over and a
     rung lose, an under wins). His club's snaps are in without him: void. No snap counts for his club
     yet: void if that week's injury report had him Out, otherwise it waits */
  if(!a){
    if(!(l.gid&&S.processedGames&&S.processedGames[l.gid])) return null;
    const took=tookPart(l);
    if(took===false) return 'void';
    if(took===null) return reportedOut(l.week,l.pid)?'void':null;
    a=rowStats({});
  }
  const v=a[l.stat]; if(v==null) return null;""")

sub1('p2', """   which gives the identical pre-game chance. A player with no stat line is skipped, as a
   leg would be.""", """   which gives the identical pre-game chance. A player with no stat line is skipped; one who
   played in his role with none has the job's row of zeros in PAY.stats (from_snaps), and is scored
   on it, as a leg on him is graded.""")

# ---- the game page: what a missing stat line means ----
sub1('p3', """function actualSummary(x,lines,week,src){
  /* src is a live box-score block when nflverse has not posted yet; the shape is the same,
     which is the whole reason espnStats was written to match */
  const a=src||actualFor(week,x.pl.id);
  if(!a) return src===null?'<span class="muted">nothing on the sheet yet</span>':'<span class="muted">did not play</span>';""",
     """/* a player with no stat line in a game whose stats are in, by the snap counts (tookPart) */
function noLineText(g,pl,long){
  const t=tookPart({gid:g.id,week:g.w,pid:pl.id,team:pl.team});
  if(!long) return t===true?'played, no stat line':(t===false?'did not play':'no stat line; snap counts not in yet');
  return t===true?'No stat line for this player, but the snap counts have him on the field: a book grades his legs on zero.'
    :(t===false?'No stat line and no snap for this player: he did not play, and a book voids his legs.'
    :'No stat line for this player, and the snap counts that say whether he played are not in yet.');
}
function actualSummary(x,lines,week,src,g){
  /* src is a live box-score block when nflverse has not posted yet; the shape is the same,
     which is the whole reason espnStats was written to match */
  const a=src||actualFor(week,x.pl.id);
  if(!a) return src===null?'<span class="muted">nothing on the sheet yet</span>':`<span class="muted">${g?noLineText(g,x.pl):'did not play'}</span>`;""")
sub1('p3', """          (locked&&haveStats)?actualSummary(x,lines,g.w)""",
     """          (locked&&haveStats)?actualSummary(x,lines,g.w,undefined,g)""")
sub1('p3', """        if(haveStats&&!a) html+='<p class="muted" style="margin:8px 0 0">No stat line for this player, so he most likely didn\\u2019t play.</p>';""",
     """        if(haveStats&&!a) html+=`<p class="muted" style="margin:8px 0 0">${noLineText(g,x.pl,true)}</p>`;""")

# ---- the audit: V9 on planted snap counts, V15 the payload's own ----
sub1('audit', """      /* V9. a leg on a player who did not play is void once his game's stats are in, and a won
         parlay with a void leg pays on the rest at their own prices */
      { const g=SV.sched.find(x=>SV.processedGames[x.id]&&x.hs!=null&&x.hs!==x.as);
        if(g){ const leg={week:+g.w,gid:g.id,pid:'00-NOT-A-PLAYER',team:g.h,stat:'receptions',k:3,side:'over',main:false,price:-110};
          const win={week:+g.w,gid:g.id,team:g.hs>g.as?g.h:g.a,stat:'ml',k:0,price:-150};
          chk(F('settleLeg')(leg)==='void','a leg on a player with no stat line in a graded game is not void');
          chk(F('settleLeg')({...leg,gid:'not-graded-yet'})===null,'a leg whose game has no stats yet should wait');
          const p={stake:10,payout:10*F('mlToDec')(-110)*F('mlToDec')(-150),legs:[leg,win]}, s=F('settleParlay')(p);
          chk(s.status==='won'&&Math.abs(F('settledReturn')(p,s)-10*F('mlToDec')(-150))<1e-9,'a won parlay with a void leg does not pay the rest at their prices');
          const pv={stake:10,payout:19,legs:[leg]}; chk(F('settleParlay')(pv).status==='void'&&F('settledReturn')(pv)===10,'an all-void parlay does not return the stake'); }
        console.log(`V9. void legs: ${g?'settle void, and the rest of the parlay pays at its own prices':'no graded game to test on'}`); }""",
     """      /* V9. a player with no stat line once his game's stats are in, by who played (PAY.snaps, planted
         here): one who took a snap is graded on zero, as DraftKings graded Tory Horton's receptions
         over 1.5 in week 5 (an over and a rung lose, an under wins); one his club's snaps leave out is
         void; with no snap counts for his club, void if the week's report had him Out, else he waits.
         And a won parlay with a void leg pays on the rest at their own prices */
      { const g=SV.sched.find(x=>SV.processedGames[x.id]&&x.hs!=null&&x.hs!==x.as);
        if(g){ const wk=String(+g.w), keepS=PAY.snaps, keepI=PAY.injuries, st=F('settleLeg');
          try{
            PAY.snaps={...(keepS||{}),[wk]:{...((keepS||{})[wk]||{}),[g.id]:{[g.h]:['00-PLAYED-NO-LINE'],[g.a]:[]}}};
            const ran={week:+g.w,gid:g.id,pid:'00-PLAYED-NO-LINE',team:g.h,stat:'receptions',k:1.5,side:'over',main:true,price:-150};
            chk(!F('actualFor')(+g.w,ran.pid)&&F('tookPart')(ran)===true,'the planted player has a stat line, or the snap counts do not say he played');
            chk(st(ran)==='loss','a player who played with no stat line does not lose his receptions over 1.5 on zero');
            chk(st({...ran,side:'under',price:120})==='win','a player who played with no stat line does not win his under on zero');
            chk(st({...ran,main:false,k:1})==='loss'&&st({...ran,stat:'any_td',main:false,k:1})==='loss'&&st({...ran,stat:'receiving_yards',k:0,side:'over'})==='push','a player who played with no stat line is not graded on zero (a rung, his touchdown, a line of 0)');
            const leg={week:+g.w,gid:g.id,pid:'00-NOT-A-PLAYER',team:g.h,stat:'receptions',k:3,side:'over',main:false,price:-110};
            chk(st(leg)==='void','a player with no snap, his club\\'s snaps in, is not void');
            chk(st({...leg,team:undefined})==='void','a leg with no club on a player neither club\\'s snaps have is not void');
            chk(st({...leg,gid:'not-graded-yet'})===null,'a leg whose game has no stats yet should wait');
            /* his club's snap counts not in yet */
            PAY.snaps[wk][g.id]={[g.h]:[]};
            const unk={...leg,pid:'00-NO-WORD-YET',team:g.a};
            chk(st(unk)===null&&st({...unk,team:undefined})===null,'a player with no stat line and no snap counts for his club does not wait');
            PAY.injuries=[...(keepI||[]),{season:String(SEASON),week:wk,gsis_id:'00-NO-WORD-YET',team:g.a,report_status:'Doubtful',practice_status:'',injury:''}];
            chk(st(unk)===null,'a player Doubtful, no stat line and no snap counts for his club, does not wait');
            PAY.injuries=[...(keepI||[]),{season:String(SEASON),week:wk,gsis_id:'00-NO-WORD-YET',team:g.a,report_status:'Out',practice_status:'',injury:'Knee'}];
            chk(st(unk)==='void','a player Out on the week\\'s report, no stat line and no snap counts for his club, is not void');
            chk(st({...unk,week:+g.w+1})===null,'another week\\'s report decided this one');
            PAY.injuries=keepI; delete PAY.snaps[wk][g.id];
            chk(st(unk)===null,'a player with no stat line in a game with no snap counts at all does not wait');
            PAY.snaps[wk][g.id]={[g.h]:['00-PLAYED-NO-LINE'],[g.a]:[]};
            const win={week:+g.w,gid:g.id,team:g.hs>g.as?g.h:g.a,stat:'ml',k:0,price:-150};
            const p={stake:10,payout:10*F('mlToDec')(-110)*F('mlToDec')(-150),legs:[leg,win]}, s=F('settleParlay')(p);
            chk(s.status==='won'&&Math.abs(F('settledReturn')(p,s)-10*F('mlToDec')(-150))<1e-9,'a won parlay with a void leg does not pay the rest at their prices');
            const pv={stake:10,payout:19,legs:[leg]}; chk(F('settleParlay')(pv).status==='void'&&F('settledReturn')(pv)===10,'an all-void parlay does not return the stake');
            chk(F('settleParlay')({stake:10,payout:30,legs:[ran,win]}).status==='lost','a parlay with a leg on a player who played with no stat line is not lost on his over');
          } finally { PAY.snaps=keepS; if(keepS===undefined) delete PAY.snaps; PAY.injuries=keepI; } }
        console.log(`V9. no stat line: ${g?'graded on zero when he took a snap, void when his club\\'s snaps leave him out, else void only if Out, waiting otherwise; a void leg drops out of a parlay':'no graded game to test on'}`); }""")

sub1('audit', """      if(skipped.length) console.log(`V. raw files not compared (PROPS_AUDIT_RAW is not set; weekly.py sets it): ${skipped.join(', ')}`);""",
     """      /* V15. who played, as the job baked it: PAY.snaps (the players with no stat line who took a snap)
         and the rows of zeros (from_snaps) for those who took one in their role, held to each other and
         to the page, and with PROPS_AUDIT_RAW to the snap counts and stats it read */
      { const SN=PAY.snaps||{}, bad=[]; let nz=0, nl=0, settled=0;
        const gidOf=(wk,team)=>{ const g=SV.sched.find(x=>+x.w===+wk&&(x.h===team||x.a===team)); return g?g.id:null; };
        const listed=(wk,gid,team,pid)=>!!(SN[wk]&&SN[wk][gid]&&(SN[wk][gid][team]||[]).includes(pid));
        for(const wk in SN) for(const gid in SN[wk]){ const g=gOf(gid);
          if(!g||String(+g.w)!==String(+wk)) bad.push(`snaps for ${gid} under week ${wk}`);
          for(const team in SN[wk][gid]){ if(g&&team!==g.h&&team!==g.a) bad.push(`snaps for ${team} in ${gid}`); nl+=(SN[wk][gid][team]||[]).length;
            if(!(PAY.stats[wk]||[]).some(r=>r.team===team&&!r.from_snaps)) bad.push(`snaps for ${gid} ${team}, whose stats are not in`); } }
        for(const wk in (PAY.stats||{})){ const real=new Set(PAY.stats[wk].filter(r=>!r.from_snaps).map(r=>r.player_id));
          for(const r of PAY.stats[wk]){ if(!r.from_snaps) continue; nz++;
            const gid=gidOf(wk,r.team), cols=Object.keys(r).filter(k=>typeof r[k]==='number'&&!['season','week','from_snaps'].includes(k));
            if(!listed(wk,gid,r.team,r.player_id)) bad.push(`a row of zeros for ${r.player_id} (${gid} ${r.team}) who is not in that club's snaps`);
            if(cols.some(k=>r[k]!==0)) bad.push(`the row of zeros for ${r.player_id} in week ${wk} has a stat`);
            if(real.has(r.player_id)) bad.push(`${r.player_id} has a stat row and a row of zeros in week ${wk}`);
            if(!F('posGrp')(r.position)) bad.push(`a row of zeros for ${r.player_id} at ${r.position}, a position the page does not project`);
            const a=F('actualFor')(+wk,r.player_id);
            if(!a||a.receptions!==0||a.passing_yards!==0||a.kick_pts!==0) bad.push(`the page has no zero line for ${r.player_id} in week ${wk}`);
            else if(gid&&settled<40){ settled++; const l={week:+wk,gid,pid:r.player_id,team:r.team,stat:'receptions',k:0.5,side:'over',main:true,price:-110};
              if(F('settleLeg')(l)!=='loss'||F('settleLeg')({...l,side:'under'})!=='win') bad.push(`${r.player_id} in week ${wk}, on the field with no stat line, is not graded on zero`); } } }
        /* a listed player with no row of zeros (a snap on defence or special teams only) is graded on zero too */
        { let one=0; for(const wk in SN) for(const gid in SN[wk]) for(const team in SN[wk][gid]) for(const pid of SN[wk][gid][team]){
            if(one>=20||F('actualFor')(+wk,pid)) continue; one++;
            if(F('settleLeg')({week:+wk,gid,pid,team,stat:'receptions',k:0.5,side:'over',main:true,price:-110})!=='loss') bad.push(`${pid} (${gid}), in the snaps with no stat line, is not graded on zero`); } }
        let rawSaid='';
        if(NEED){ const sp=path.join(__dirname,'..','raw',`snap_counts_${SEASON}.csv`);
          if(!fs.existsSync(sp)) rawSaid='; raw/snap_counts not downloaded this run (it is never required), so not compared';
          else if(rStats&&rRoster){ const snapRows=Papa.parse(fs.readFileSync(sp,'utf8'),{header:true,skipEmptyLines:true}).data;
            const hasLine=new Set(rStats.filter(r=>+r.season===SEASON&&r.season_type==='REG').map(r=>r.game_id+'|'+r.player_id));
            const pfr={}; for(const r of rRoster) if(r.gsis_id&&r.pfr_id&&!pfr[r.pfr_id]) pfr[r.pfr_id]=r.gsis_id;
            const posOf=id=>String((rawRo[id]&&rawRo[id].position)||'').toUpperCase();
            const snapped=new Set(), names={}; let checked=0;
            for(const s of snapRows){ const n=v=>{ const x=parseFloat(v); return isFinite(x)?x:0; }, all=n(s.offense_snaps)+n(s.defense_snaps)+n(s.st_snaps), id=pfr[s.pfr_player_id];
              if(all>0){ snapped.add(s.game_id+'|'+s.team+'|'+(id||'')); (names[s.game_id+'|'+s.team]??=[]).push(s.player); }
              if(!id||!(n(s.offense_snaps)>0)||!SKILL.has(posOf(id))||posOf(id)==='K'||hasLine.has(s.game_id+'|'+id)) continue;
              const g=gOf(s.game_id); if(!g||!SN[String(+g.w)]||!SN[String(+g.w)][s.game_id]||!(s.team in SN[String(+g.w)][s.game_id])) continue;
              checked++;
              if(!listed(String(+g.w),s.game_id,s.team,id)) bad.push(`${s.player} (${s.game_id} ${s.team}) ran ${s.offense_snaps} offensive snaps with no stat line and is not in the snaps`);
              if(!(PAY.stats[String(+g.w)]||[]).some(r=>r.from_snaps&&r.player_id===id)) bad.push(`${s.player} (${s.game_id}) has no row of zeros`); }
            for(const wk in SN) for(const gid in SN[wk]) for(const team in SN[wk][gid]) for(const pid of SN[wk][gid][team]){
              if(hasLine.has(gid+'|'+pid)) bad.push(`${pid} is in the snaps of ${gid} with a stat line in raw/pw`);
              const me=who(pid);
              if(!snapped.has(gid+'|'+team+'|'+pid)&&!(names[gid+'|'+team]||[]).some(n=>nameRule(n,me.name,me.alias))) bad.push(`${pid} is in the snaps of ${gid} ${team} with no snap in raw/snap_counts`); }
            rawSaid=`; against raw/snap_counts, ${checked} players placed by PFR id with an offensive snap and no stat line all listed with their row of zeros`; } }
        chk(!bad.length,`who played: ${bad.length} wrong (${bad.slice(0,4).join('; ')})`);
        console.log(`V15. who played: ${Object.keys(SN).length?`${nl} players with no stat line took a snap, ${nz} rows of zeros, each graded on zero${rawSaid}`:'no snap counts in the payload yet (a payload baked before them): a player with no stat line waits unless Out'}`); }

      if(skipped.length) console.log(`V. raw files not compared (PROPS_AUDIT_RAW is not set; weekly.py sets it): ${skipped.join(', ')}`);""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('app v101: settleLeg grades a player with no stat line by who played (PAY.snaps); audit V9 and V15')
