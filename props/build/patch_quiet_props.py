r"""app v130: the Props tab and a game's page without their descriptions.

The owner's call of 22 October 2026:

  "in all sections get rid of all text wall descriptions. i dont want any descriptions anywhere. i want the site to
  speak for itself without a bunch of reading."

This is the Props tab's and a game's page's part of it (the other tabs have patches and edits of their own). What went:

1. The Props list. Its Final and LIVE cells lose the line under them ("score with the next update", "Refresh scores
   reads it"): the word is the state, and Refresh scores sits over the list. The stale-lines note is the state alone,
   "Lines last pulled 4 days ago." (or "Lines not pulled yet."), without why expected points matter or how often they
   are refreshed. A week not open yet keeps its heading and "Opens once week 6 is complete." over its fixtures, without
   the paragraph on why it is closed. The season-over card is its bold line alone, without the model's scope. The
   not-posted card says "No injury report posted yet." and "No player stats posted yet.", without the consequences.
2. The page's own banners. The rebuilt note is "Model updated: season rebuilt, your builder kept." (or "Rosters
   updated: ..." where the data build moved), without the replay; the payload error is "The season data could not be
   loaded (<why>). Reload to try again.", without the paragraph on where the page reads its data (which named the
   wrong path since the page moved to the site's root).
3. A game's page. The book-lines meta line goes (the Game bets card's Lines line and the Refresh odds status say where
   the prices came from and when). Stale depth charts are "Depth charts as of 2026-10-12 (may be out of date).". A
   played or live game's card under its score keeps the state alone: "Live from the scoreboard, not settled." or "Stats
   not in yet.", and nothing once the stats are in (the tiles say it); the line saying the final score comes with the
   next refresh goes. A team with nobody to project reads "No players to project."; a charted player with nothing to
   project "No lines: no games to project from" or "No lines yet". A quarterback's touchdown heading keeps what settles
   it in three words, "not a TD pass". The recap legend keeps its key, without the paragraph under it. A played
   player's no-stat-line note is the settlement in a few words: "Played, no stat line: graded on zero.", "Did not play:
   legs void.", "No stat line; snap counts not in yet.".
4. The Game bets card loses its lead (what a team bet is, how its chance is worked, the total study, what a Suggested
   Parlays set does with a total, the correlations; and a played game's "How each side did ..."); its Lines line stays.
   "No spread posted yet." and "No total price yet: 50%, -110 est." are the two notes, without their consequences.

What stayed: every heading, label, number, button and tooltip; "No games scheduled for this week.", "No DraftKings
line yet.", the far-off flags, the "Not shown" line, "no line yet, our model", "No projections for this game yet".
APP_BUILD moves to app v130.
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'Refresh scores reads it' in T['p3'], 'patch_quiet_props.py has already been applied (or app v129 is missing)'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v129 \\u00b7 2026-10-22';", "const APP_BUILD='app v130 \\u00b7 2026-10-22';", 'APP_BUILD')

# 1. the Props list
sub1('p3', """    if(gameFinal(g)) return '<b class="sl-sc sl-pend">Final</b><span class="sl-sub">score with the next update</span>';
    if(gameStarted(g)) return '<b class="sl-sc sl-pend">LIVE</b><span class="sl-sub">Refresh scores reads it</span>';""",
     """    if(gameFinal(g)) return '<b class="sl-sc sl-pend">Final</b>';
    if(gameStarted(g)) return '<b class="sl-sc sl-pend">LIVE</b>';""", 'slateResult: Final and LIVE alone')
sub1('p3', """  /* expected points are the biggest input to every projection, so say so when the lines are stale */""",
     """  /* expected points are the biggest input to every projection, so say so when the lines are stale (app v130: the
     state alone) */""", 'renderSlate: the stale-lines note\'s comment')
sub1('p3', """      ln.textContent=!stale?'':(age==null
        ?'Spreads and totals have not been pulled in this browser yet. Expected points are the biggest single input to every projection, and they are refreshed twice a week.'
        :`Spreads and totals were last pulled ${age.toFixed(0)} day${age>=1.5?'s':''} ago. They are refreshed twice a week; expected points are the biggest single input to every projection.`); } }""",
     """      ln.textContent=!stale?'':(age==null?'Lines not pulled yet.'
        :`Lines last pulled ${age.toFixed(0)} day${age>=1.5?'s':''} ago.`); } }""", 'renderSlate: the stale-lines note')
sub1('p3', """      <p class="muted" style="margin:0 0 8px">Projections use each player's most recent form, so a number built now, ${w-lw} week${w-lw===1?'':'s'} early, would be based on games that haven't happened. It would be worse than useless: it would look authoritative and be stale.</p>
      <p class="muted" style="margin:0">This opens once week ${lw} is complete. Fixtures below for reference.</p>""",
     """      <p class="muted" style="margin:0">Opens once week ${lw} is complete.</p>""", 'renderSlate: a week not open yet')
sub1('p3', """<b>The ${SEASON} regular season is over.</b> <span class="muted">This model covers the regular season only: playoff games are not projected or priced, and no prices are pulled until next season. Every week stays here to look back on.</span></div>`:'';""",
     """<b>The ${SEASON} regular season is over.</b></div>`:'';""", 'renderSlate: the season-over card')
sub1('p3', """  if(np.has('injuries')) say.push(`nflverse has not posted the ${SEASON} injury report yet, so no player is marked out, doubtful or questionable.`);
  if(np.has('stats')&&S.sched.some(g=>gameFinal(g))) say.push(`nflverse has not posted this season's player stats yet, so the finished games are not graded and every projection stands on last season.`);""",
     """  if(np.has('injuries')) say.push('No injury report posted yet.');
  if(np.has('stats')&&S.sched.some(g=>gameFinal(g))) say.push('No player stats posted yet.');""", 'notPostedNote')

# 2. the page's banners
sub1('p3', """  m.innerHTML='<b>The season data could not be loaded.</b><br>'+String(e&&e.message||e)
    +'<br><br>This page holds no data of its own \\u2014 it reads <code>data/payload.json</code> beside it every time it opens, so that it can never show you a stale number. Reload to try again.';""",
     """  m.innerHTML='<b>The season data could not be loaded</b> ('+esc(e&&e.message||e)+'). Reload to try again.';""", 'payloadFailed')
sub1('p3', """      ? 'Rosters and depth charts in this build are newer than what was saved in this browser, so the season was rebuilt from the current one. Saved parlays, the stake and prices were kept; weeks built into this file were replayed.'
      : 'The model changed, so the season was rebuilt from the current baseline. Saved parlays, the stake and prices were kept; weeks built into this file were replayed.';""",
     """      ? 'Rosters updated: season rebuilt, your builder kept.'
      : 'Model updated: season rebuilt, your builder kept.';""", 'boot: the rebuilt note')

# 3. a game's page
sub1('p3', """  const meta=PAY.mkt_meta&&PAY.mkt_meta[String(g.w)];
  let html=`<div class="bar">""", """  let html=`<div class="bar">""", 'renderGame: no book-lines meta')
sub1('p3', """  if(meta&&!locked) html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px">Book lines for this week are ${meta.src}, as of ${meta.asof}. Lines move; check the number before you bet.</p>`;
""", '', 'renderGame: the book-lines meta line')
sub1('p3', """html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px;color:#8A5E05">Depth charts as of ${esc(PAY.depth_dt)}: the latest ones could not be downloaded, so who starts may be out of date.</p>`; }""",
     """html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px;color:#8A5E05">Depth charts as of ${esc(PAY.depth_dt)} (may be out of date).</p>`; }""", 'renderGame: stale depth charts')
sub1('p3', r"""    <span class="muted">${haveStats?'Each player below shows what the model projected against what he actually did.'
      :(liveOn?'Each player below shows what he has done so far, live from the scoreboard, against what was projected. These are not the settled numbers: the season\u2019s stats arrive with the next update, and those are what settle a leg.'
        :'Player stats come out some hours after the final whistle and appear with the next update. Press Refresh stats to read them live from the scoreboard in the meantime.')}${hasScore(g)||lg?'':' The final score appears after the next refresh.'}</span></div>`;""",
     """    ${haveStats?'':`<span class="muted">${liveOn?'Live from the scoreboard, not settled.':'Stats not in yet.'}</span>`}</div>`;""", 'renderGame: a locked game\'s card')
sub1('p3', """html+='<div class="empty">Nobody here has enough NFL history to project. Rosters and depth charts are refreshed twice a week.</div>'; continue; }""",
     """html+='<div class="empty">No players to project.</div>'; continue; }""", 'renderGame: an empty team')
sub1('p3', r"""${noHistory(x.pl)?'No games the model counts, last season or this one, so nothing to project: no lines until he plays this season':'Too little in his games so far to project a starter\u2019s workload: no lines'}""",
     """${noHistory(x.pl)?'No lines: no games to project from':'No lines yet'}""", 'renderGame: a player with nothing to project')
sub1('p3', """          <span><i style="background:var(--miss)"></i>well under</span></div>
          <p class="muted" style="margin:6px 0 0;font-size:11px">Green means it cleared the model's own number, which is not the same as clearing your sportsbook's line. The book line and which way it went are on each tile.</p>`;""",
     """          <span><i style="background:var(--miss)"></i>well under</span></div>`;""", 'renderGame: the recap legend\'s paragraph')
sub1('p3', """'Rushing or receiving TD <em data-qbtd>his own run or catch; a TD pass does not count</em>'""",
     """'Rushing or receiving TD <em data-qbtd>not a TD pass</em>'""", "renderGame: a quarterback's touchdown heading")
sub1('p3', """  return t===true?'No stat line for this player, but the snap counts have him on the field: a book grades his legs on zero.'
    :(t===false?'No stat line and no snap for this player: he did not play, and a book voids his legs.'
    :'No stat line for this player, and the snap counts that say whether he played are not in yet.');""",
     """  return t===true?'Played, no stat line: graded on zero.'
    :(t===false?'Did not play: legs void.':'No stat line; snap counts not in yet.');""", 'noLineText: the long form')

# 4. the Game bets card
sub1('p3', """    <p class="muted" style="margin:0 0 10px">${locked?'How each side did against the money line, the spread and the total.':'A team to win, or to cover the spread, or the game total over or under. Tick one and it joins the parlay like any player line.'} Chances come from our team ratings, pulled halfway to the posted line, with the final margin treated as spread about 13.5 points around that. The total's chance is the book's own, its over and under prices with the margin taken out (an even 50% with no price on file): tested on 2024 to 2026, no points model of ours beat the posted total, so the model's points are shown beside it and not used. A Suggested Parlays set takes a game total only where the game's other legs cannot fill a parlay, and never marks it Value; tick it here to add one yourself. A win or cover leg is priced as unrelated to player legs, which has not been measured here; a total moves with its game's passing and scoring lines, measured on 2019 to 2024.</p>
""", '', 'gameBetsCard: its lead')
sub1('p3', """'<p class="muted" style="margin:0">No spread posted yet, so only the money line is offered.</p>'""",
     """'<p class="muted" style="margin:0">No spread posted yet.</p>'""", 'gameBetsCard: no spread')
sub1('p3', """'<p class="muted" style="margin:6px 0 0;font-size:12px">No over and under price on file for this total yet: the chance is an even 50%, and where a price is missing the -110 is an estimate.</p>'""",
     """'<p class="muted" style="margin:6px 0 0;font-size:12px">No total price yet: 50%, \\u2212110 est.</p>'""", 'gameBetsCard: no total price')

for gone in ('score with the next update', 'Refresh scores reads it', 'Spreads and totals were last pulled',
             'have not been pulled in this browser', 'worse than useless', 'Fixtures below for reference',
             'covers the regular season only: playoff', 'so no player is marked out', 'so the finished games are not graded',
             'holds no data of its own', 'weeks built into this file were replayed', 'Book lines for this week are',
             'the latest ones could not be downloaded', 'Each player below shows', 'Player stats come out some hours',
             'The final score appears after the next refresh', 'Nobody here has enough NFL history',
             'No games the model counts, last season', 'Too little in his games so far', 'his own run or catch',
             'Green means it cleared', 'a book grades his legs on zero', 'a book voids his legs',
             'How each side did against the money line', 'Tick one and it joins the parlay', 'Chances come from our team ratings',
             'A Suggested Parlays set takes a game total only where', 'so only the money line is offered',
             'No over and under price on file'):
    assert gone not in T['p3'], gone

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v130, the Props tab and a game\'s page without their descriptions')
