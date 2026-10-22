"""app v130: the Parlay Builder tab without its descriptions.

The owner's call of 22 October 2026:

  "in all sections get rid of all text wall descriptions. i dont want any descriptions anywhere. i want the site to
   speak for itself without a bunch of reading."

The Parlay Builder tab keeps what a visitor acts on (the builder, its numbers and buttons, the choices, the Top 30
lines and their headings, pills and marks) and drops what explains it.

Gone from the builder (renderParlay): the line under its heading ("Every leg has to land. The chance below is worked
out ..."), the sentence beside the book price box ("Blank prices the legs that share a game together ..."), the
paragraph under the tiles saying what the fair chance is (or why there is none), the same-game paragraph (what
multiplying the legs would say), and in "Legs that move together" its "What it means" column and the paragraph under
the table. Gone from the panel (pbPanel): the lead over the choices, the foot under the list, the line under "Value
picks" and the one under "Other lines", the note that game totals are never Value picks, the Bet amount box's hint
(and the input's aria-describedby that named it), "tap to choose" on the games, the games bar's "Kickoffs in your time
zone; ..." and the small words on the bet types ("straight up", "to cover", "over/under": PB_KINDS loses its third
field).

Shortened to the state alone (rule 2 of the brief: a few words, with the names, numbers and times they carry):
  the empty builder          "No legs yet."
  ladder legs taken out      "2 ladder legs removed."
  FG attempts taken out      "1 leg removed: DraftKings has no FG attempts."
  a leg of a game kicked off "1 leg removed: its game kicked off."
  a player ruled out         "Bo Nix is not expected to play (Out)."
  legs of two weeks          "Legs in different weeks (6, 7): not one ticket."
  a pair DraftKings refuses  the line as it was, without the parenthesis naming the kind of pair
  a mixed same-game parlay   "Mixed same-game parlay: DraftKings may not open it as one slip."
  the hero tile, no fair     "no fair chance"
  a price from ESPN's line   "est.: estimated from DraftKings’ line, read Tue 8:07 AM ET." (espnReadLine, the builder's
                             line and the Top 30's note alike; "(30h ago)" after it where the read is over a day old)
  the Elo files loading      "Loading Elo ratings…"
  lines far off the market   "3 lines left out: far off the market."
  lines with no id (dormant) "2 lines left out: no DraftKings id.", "1 line left out: DraftKings has it at another
                             number.", "No player lines with a DraftKings id." (PB_NO_ID)
  no player lines            "No player lines (read Tue 8:07 AM ET)." or "Player lines not read yet." (pbNoPl, which
                             the list's note, its empty line and the all-games levels' reasons read), and on the empty
                             list with team bets ticked "No line qualifies yet: no player lines (read Tue 8:07 AM ET)."
  no game to come            "Season over." and "No week 7 games left."

Kept as they were: the headings ("Top 30 lines", "Value picks", "Other lines") and their count pills, "No line on your
picks is a Value pick right now.", the empty list's other short reasons ("No bet types ticked: tick at least one
above.", "No games ticked: ...", "No line on your picks qualifies yet: tick more games or bet types."), every number,
tile label, row cell label, mark, price and chance, the builder's row lines (DraftKings' slip, far off the market), the
"Remove every leg from the builder?" confirm, and every data- attribute a check or the card reads (data-pb-noladder,
data-pb-notdk, data-pb-clash, data-pb-multigame, data-espn-read, data-pb-novalue). APP_BUILD is not moved here (the
Props tab's patch of the same change moves it).
"""
import io

FILES = {'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'Every leg has to land.' in T['p3'], 'patch_quiet_builder.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


# ---- the bet types' small words
sub1('p3', "const PB_KINDS=[['ml','Moneyline','straight up'],['ats','Spread','to cover'],['total','Game total','over/under'],['over','Player overs',''],['under','Player unders','']];",
     "const PB_KINDS=[['ml','Moneyline'],['ats','Spread'],['total','Game total'],['over','Player overs'],['under','Player unders']];",
     'PB_KINDS: no small words')
sub1('p3', "  const chips=PB_KINDS.map(([k,l,s])=>`<label class=\"pb-chip${u.k[k]?' on':''}\"><input type=\"checkbox\" data-pb-kind=\"${k}\" ${u.k[k]?'checked':''}><span>${l}${s?` <small>${s}</small>`:''}</span></label>`).join('');",
     "  const chips=PB_KINDS.map(([k,l])=>`<label class=\"pb-chip${u.k[k]?' on':''}\"><input type=\"checkbox\" data-pb-kind=\"${k}\" ${u.k[k]?'checked':''}><span>${l}</span></label>`).join('');",
     'pbPanel: the chips without their small words')

# ---- no player lines, and none with an id (the list's note, its empty line, the all-games levels' reasons)
sub1('p3', "const PB_NO_ID='no player legs DraftKings’ betslip can take: a player’s line read from ESPN carries no DraftKings id.';",
     "const PB_NO_ID='no player lines with a DraftKings id.';", 'PB_NO_ID: short')
sub1('p3', """function pbNoPl(ids){ const at=espnLastRead(ids||pbGames().map(g=>g.id));
  return at?`no player lines yet: DraftKings had posted none for these games when its lines were last read from ESPN (${espnWhen(at)}). Press Refresh odds to read them now.`
    :'no player lines yet: DraftKings’ lines for these games have not been read from ESPN yet. Press Refresh odds to read them now.'; }""",
     """function pbNoPl(ids){ const at=espnLastRead(ids||pbGames().map(g=>g.id));
  return at?`no player lines (read ${espnWhen(at)}).`:'player lines not read yet.'; }""", 'pbNoPl: short')

# ---- a price from DraftKings' line read on ESPN: the est. line, the builder's and the Top 30's
sub1('p3', """  return `DraftKings’ lines as read ${espnWhen(t)}; prices estimated`+(h>DK_EST.staleHours?` (read ${Math.round(h)}h ago: press Refresh odds for today’s)`:'')+'.';""",
     """  return `est.: estimated from DraftKings’ line, read ${espnWhen(t)}`+(h>DK_EST.staleHours?` (${Math.round(h)}h ago)`:'')+'.';""",
     'espnReadLine: short')

# ---- the Top 30's empty line
sub1('p3', """    return (u.k.ml||u.k.ats||u.k.total)?`No line on your picks qualifies yet, and ${np}`:np[0].toUpperCase()+np.slice(1); }""",
     """    return (u.k.ml||u.k.ats||u.k.total)?`No line qualifies yet: ${np}`:np[0].toUpperCase()+np.slice(1); }""",
     'pbTopWhy: no player lines, short')

# ---- the panel
sub1('p3', """    <p class="pb-none">${seasonOver()?`The ${SEASON} regular season is over: no game is left to build a parlay from.`:`Every week ${w} game has kicked off, so there is nothing left to build from. Week ${w+1} opens once they are final.`}</p></div>`;""",
     """    <p class="pb-none">${seasonOver()?'Season over.':`No week ${w} games left.`}</p></div>`;""", 'pbPanel: no game to come, short')
sub1('p3', """  const r=getPbTop(), nOn=games.filter(g=>!u.off.includes(g.id)).length, open=u.gx!=null?u.gx:pbWide(), form=formSig()!=='';""",
     """  const r=getPbTop(), nOn=games.filter(g=>!u.off.includes(g.id)).length, open=u.gx!=null?u.gx:pbWide();""", 'pbPanel: form no longer read')
sub1('p3', """  if(formSig()==='noform') notes.push('The Elo ratings are still loading: player lines join once they are in.');
  if(dkLegs.length) notes.push(`A player line marked est. is priced from DraftKings’ line read on ESPN: ${esc(espnReadLine(dkLegs.map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0]||null))} The line is DraftKings’, the price our estimate of DraftKings’ (${ESPN_ERR} on weeks it was not fitted on), and it counts here as a book price does.`);
  if(u.k.total) notes.push('Game totals are never Value picks: each is priced at the book’s own chance, so the totals come last among the other lines, and on a long list the '+PB_TOP_N+' lines can end before them.');""",
     """  if(formSig()==='noform') notes.push('Loading Elo ratings…');
  if(dkLegs.length) notes.push(esc(espnReadLine(dkLegs.map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0]||null)));""",
     'pbPanel: the Elo, est. and totals notes')
sub1('p3', """  if(noIdNote) notes.push(`No player line on your picks can go on DraftKings’ betslip yet, so the list below has no player lines: ${PB_NO_ID.replace(/^no player legs DraftKings’ betslip can take: /,'')}`);
  else if(r.noPlayerPrices&&r.rows.length) notes.push(`No player lines are in yet for your picks, so the list below has none: ${pbNoPl(games.filter(g=>!u.off.includes(g.id)).map(g=>g.id)).replace(/^no player lines yet: /,'')}`);
  if(r.far) notes.push(`${r.far} line${r.far===1?' is':'s are'} left out: the model rates ${r.far===1?'it':'each'} ${Math.round(FAR_OFF*100)} points or more above the book’s fair chance (DraftKings’ prices with the margin taken out${r.farDk?', or, for a line marked est., our estimate of them from DraftKings’ line read on ESPN':''}), and its edges that large have not held up this season. ${r.far===1?'It is':'They are'} still on the game pages, flagged far off the market.`);""",
     """  const cap1=s=>s[0].toUpperCase()+s.slice(1);
  if(noIdNote) notes.push(cap1(PB_NO_ID));
  else if(r.noPlayerPrices&&r.rows.length) notes.push(cap1(pbNoPl(games.filter(g=>!u.off.includes(g.id)).map(g=>g.id))));
  if(r.far) notes.push(`${r.far} line${r.far===1?'':'s'} left out: far off the market.`);""",
     'pbPanel: the id, player-line and far-off notes')
sub1('p3', """  if(noneN) notes.push(`${noneN} line${noneN===1?' is':'s are'} left out: the list takes only lines DraftKings’ betslip can take, by DraftKings’ own id at the line, and DraftKings has none for ${noneN===1?'it':'them'}${nonePl?'. A player’s line read from ESPN carries no id':''}. ${noneN===1?'It is':'They are'} still on the game pages, where you can add ${noneN===1?'it':'them'} to the builder.`);
  if(mvN) notes.push(`${mvN} line${mvN===1?' is':'s are'} left out: DraftKings had ${mvN===1?'it':'them'} only at another number when its lines were last read, and the list takes only lines DraftKings’ betslip can take at their own number${mvTeam?'. Refresh odds reads DraftKings’ current spreads and totals, which the list can take':''}. Added to the builder from the game pages, ${mvN===1?'it goes':'each goes'} on DraftKings’ slip at DraftKings’ number.`);""",
     """  if(noneN) notes.push(`${noneN} line${noneN===1?'':'s'} left out: no DraftKings id.`);
  if(mvN) notes.push(`${mvN} line${mvN===1?'':'s'} left out: DraftKings has ${mvN===1?'it':'them'} at another number.`);""",
     'pbPanel: the dormant id notes')
sub1('p3', """  const mvN=r.moved-(noIdNote?r.movedPl:0), noneN=r.noId-r.moved-(noIdNote?r.noIdPl-r.movedPl:0), nonePl=noIdNote?0:r.noIdPl-r.movedPl, mvTeam=r.moved-r.movedPl;""",
     """  const mvN=r.moved-(noIdNote?r.movedPl:0), noneN=r.noId-r.moved-(noIdNote?r.noIdPl-r.movedPl:0);""",
     'pbPanel: the counts the id notes no longer read')
sub1('p3', """      +(nV?`<p class="muted pb-topsub">The model rates each at least 3 points above the chance its price implies${form?', and on a player’s line market + form agrees':''}. Each is marked Value.</p><ol class="pb-top" data-pb-sec="value\"""",
     """      +(nV?`<ol class="pb-top" data-pb-sec="value\"""", 'pbPanel: no line under Value picks')
sub1('p3', """      +(O.length?secHd('other','Other lines',O.length)+`<p class="muted pb-topsub">These miss a Value pick’s bar (3 points above the chance the price implies${form?', and market + form agreeing on a player’s line':''}), though the model still rates each at or above the book’s price${u.k.total?'; the game totals, at the book’s own chance, come last':''}. A suggested parlay takes them only where its Value picks run out.</p><ol class="pb-top" data-pb-sec="other\"""",
     """      +(O.length?secHd('other','Other lines',O.length)+`<ol class="pb-top" data-pb-sec="other\"""", 'pbPanel: no line under Other lines')
sub1('p3', """  return `<div class="card pb" id="pbCard">${head}
    <p class="muted pb-lead">Choose what to build from: the list below takes only the bet types and games ticked here, every line that qualifies as a suggested leg does: first the Value picks, marked Value, then the other lines${u.k.total?', the game totals last':''}, each part ranked by what $1 on it is expected to make at the model’s chance, best first, ${PB_TOP_N} lines at most. Add any of them to the builder below.</p>
    <div class="pb-ctl">""", """  return `<div class="card pb" id="pbCard">${head}
    <div class="pb-ctl">""", 'pbPanel: no lead')
sub1('p3', """ value="${stakeText(pbStake())}" autocomplete="off" aria-describedby="pbStakeHint"></span><span class="pb-amt-hint" id="pbStakeHint">The builder below uses this amount, and every parlay on Suggested Parlays pays on it.</span></div>""",
     """ value="${stakeText(pbStake())}" autocomplete="off"></span></div>""", 'pbPanel: no hint beside the Bet amount')
sub1('p3', """<b>${nOn===games.length?`All ${games.length}`:`${nOn} of ${games.length}`}</b><span class="pb-sum-hint">tap to choose</span></summary>""",
     """<b>${nOn===games.length?`All ${games.length}`:`${nOn} of ${games.length}`}</b></summary>""", 'pbPanel: no "tap to choose"')
sub1('p3', """<button type="button" class="btn quiet small" data-pb-games="none">None</button><span class="muted">Kickoffs in your time zone; a game leaves the list when it kicks off.</span></div>""",
     """<button type="button" class="btn quiet small" data-pb-games="none">None</button></div>""", 'pbPanel: no sentence in the games bar')
old_foot = T['p3'][T['p3'].index("""    ${list}
    <p class="muted pb-foot">Every line has DraftKings’ own price or, marked est."""):]
old_foot = old_foot[:old_foot.index("</p></div>`;\n}") + len("</p></div>`;\n}")]
assert 'and a line the model rates ${Math.round(FAR_OFF*100)} points or more above it is left out.</p></div>`;' in old_foot, 'pbPanel: the foot is not where it was'
sub1('p3', old_foot, """    ${list}</div>`;
}""", 'pbPanel: no foot')

# ---- the builder
NOTE = 'style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05"'
sub1('p3', f"""data-pb-noladder="${{noLadder}}">${{noLadder}} leg${{noLadder===1?' was':'s were'}} removed: the site no longer offers ladder bets (such as 250+ passing yards or 2+ touchdowns), only main lines, anytime touchdowns and team bets.</p>`""",
     """data-pb-noladder="${noLadder}">${noLadder} ladder leg${noLadder===1?'':'s'} removed.</p>`""", 'renderParlay: ladder legs removed, short')
sub1('p3', """data-pb-notdk="${notDk}">${notDk} leg${notDk===1?' was':'s were'} removed: DraftKings does not offer FG attempts.</p>`""",
     """data-pb-notdk="${notDk}">${notDk} leg${notDk===1?'':'s'} removed: DraftKings has no FG attempts.</p>`""", 'renderParlay: FG attempts removed, short')
sub1('p3', f"""(dropped?`<p class="muted" {NOTE}>${{dropped}} leg${{dropped===1?' was':'s were'}} removed because that game has already kicked off. Saved and locked parlays keep theirs.</p>`:'')""",
     f"""(dropped?`<p class="muted" {NOTE}>${{dropped}} leg${{dropped===1?'':'s'}} removed: ${{dropped===1?'its game':'their games'}} kicked off.</p>`:'')""",
     'renderParlay: a game kicked off, short')
sub1('p3', """      <p class="muted" style="margin:0 0 10px">Open a game, click a player, and tick any line you like, or add a parlay from Suggested Parlays or a line from the Top ${PB_TOP_N} below. Each leg lands here and gets priced.</p></div>`""",
     """      <p class="muted" style="margin:0 0 10px">No legs yet.</p></div>`""", 'renderParlay: the empty builder')
sub1('p3', """${espnCtl(null,'builder')}
    <p class="muted" style="margin:0 0 12px">Every leg has to land. The chance below is worked out with the legs' real relationship to each other, not by multiplying them together.</p>
    <table>""", """${espnCtl(null,'builder')}
    <table>""", 'renderParlay: no line under the heading')
sub1('p3', """ ${out.length===1?'is':'are'} not expected to play (${out.map(l=>inactiveWhy(S.inactive[l.pid])).join('; ')}). A book voids a leg on a player who does not play and pays the rest at their own prices; take ${out.length===1?'it':'them'} off to see what the rest pay.</p>`; }""",
     """ ${out.length===1?'is':'are'} not expected to play (${out.map(l=>inactiveWhy(S.inactive[l.pid])).join('; ')}).</p>`; }""",
     'renderParlay: a player ruled out, short')
sub1('p3', """.map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0]||null))} A leg marked est. is priced from DraftKings’ line read on ESPN: the line is DraftKings’, the price and its fair chance our estimate.</p>`;""",
     """.map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0]||null))}</p>`;""", "renderParlay: the est. line, espnReadLine's alone")
sub1('p3', """These legs are in different weeks (${wks.join(', ')}). A parlay has to settle together, so a sportsbook won't take this as one ticket.</p>`;""",
     """Legs in different weeks (${wks.join(', ')}): not one ticket.</p>`;""", 'renderParlay: different weeks, short')
sub1('p3', """${cp.map(([i,j,k])=>`${nm(legs[i])}, with ${nm(legs[j])} (${DK_CLASH[k]})`).join('; ')}.</p>`;""",
     """${cp.map(([i,j])=>`${nm(legs[i])}, with ${nm(legs[j])}`).join('; ')}.</p>`;""", 'renderParlay: the clash line without its kind')
sub1('p3', """data-pb-multigame="${nG}">These legs mix a same-game parlay with other games. DraftKings’ betslip may not open that mix as one, so the parlay card gives each of the ${nG} games a link of its own beside one that tries them on one slip.</p>`; } }""",
     """data-pb-multigame="${nG}">Mixed same-game parlay: DraftKings may not open it as one slip.</p>`; } }""", 'renderParlay: the multigame line, short')
sub1('p3', """      <span class="muted">${sg?`Blank prices the legs that share a game together, the way a book does.`:(allBook?'Blank multiplies your real leg prices.':'Blank multiplies the estimated leg prices, which include a typical bookmaker cut.')}</span>
    </div>""", """    </div>""", 'renderParlay: no sentence beside the book price box')
sub1('p3', """<small>no fair chance: it needs every leg's book price</small>""", """<small>no fair chance</small>""", 'renderParlay: no fair chance, short')
# (the part writes the curly apostrophes in it as ’ escapes, so they are put back as such below)
old_fair = """
    <p class="muted fair-note">${fair&&fair.p!=null?`The fair chance is the book's: DraftKings' prices with the margin taken out${fair.est?(fair.dk?' (estimated: a leg is priced from DraftKings’ line read on ESPN by our estimate, and its fair chance with it)':' (estimated, since a leg is priced on one side only: the week’s typical margin is taken out of its price)'):''}, the legs moving together as the model's do. The model's own chance has run higher than the book's this season.`
      :`The fair chance needs a book price on every leg; ${fair&&fair.miss===1?'one leg has':(fair?fair.miss:0)+' legs have'} none, so this is the model's chance alone.`}</p>
    ${sg&&override==null?`<p class="muted" style="margin:10px 0 0;font-size:12px">Legs here share a game, so they are priced together rather than multiplied: multiplying them would say <b>$${(stake*multDec).toFixed(2)}</b>, which is what a book pays only when the legs are in different games. The estimate carries a same-game cut fitted to real DraftKings tickets; type your book's own parlay price above to override it.</p>`:''}`;"""
old_fair = old_fair.replace('’', '\\u2019')
sub1('p3', old_fair, """`;""", 'renderParlay: no fair-chance note, no same-game paragraph')
sub1('p3', """      <table><thead><tr><th>Pair</th><th class="num">Strength</th><th>What it means</th></tr></thead><tbody>`+""",
     """      <table><thead><tr><th>Pair</th><th class="num">Strength</th></tr></thead><tbody>`+""", "the pairs table: no What it means column")
sub1('p3', """          <td class="num">${x.rho>0?'+':''}${x.rho.toFixed(2)}</td>
          <td class="${x.rho>0?'delta up':'delta down'}">${x.rho>0?'tend to happen in the same game':'tend to happen at each other\\u2019s expense'}</td></tr>`;""",
     """          <td class="num">${x.rho>0?'+':''}${x.rho.toFixed(2)}</td></tr>`;""", "the pairs table: no What it means cells")
sub1('p3', """      }).join('')+`</tbody></table>
      <p class="muted" style="margin:10px 0 0">Measured across 2019 to 2024. A quarterback throwing for a lot and his receiver catching a lot is the same afternoon described twice, which is why stacking them is worth more than a book's multiplied price suggests.</p></div>`;""",
     """      }).join('')+`</tbody></table></div>`;""", 'the pairs table: no foot')

GONE = ['Every leg has to land', 'Blank prices the legs', 'Blank multiplies', 'class="muted fair-note"', 'The fair chance needs a book price',
        'Legs here share a game, so they are priced together', 'What it means', 'tend to happen in the same game',
        'Measured across 2019 to 2024', 'pb-lead', 'pb-foot', 'pb-amt-hint', 'pbStakeHint', 'pb-sum-hint', 'tap to choose',
        'Kickoffs in your time zone', "'straight up'", "'to cover'", "'over/under'", 'Choose what to build from',
        'The model rates each at least 3 points above', 'These miss a Value pick’s bar', 'Game totals are never Value picks',
        'A player line marked est. is priced', 'The Elo ratings are still loading', 'its edges that large have not held up',
        'the list takes only lines DraftKings’ betslip can take', 'only at another number when its lines were last read',
        'the site no longer offers ladder bets', 'because that game has already kicked off', 'A book voids a leg on a player',
        'A parlay has to settle together', 'a link of its own beside one that tries', 'no fair chance: it needs',
        'Press Refresh odds to read them now', 'press Refresh odds for today’s', 'nothing left to build from',
        'no game is left to build a parlay from', 'Open a game, click a player', 'pb-topsub">']
for gone in GONE:
    assert gone not in T['p3'], gone
assert "data-pb-novalue>No line on your picks is a Value pick right now.</p>" in T['p3'], 'the no-Value-pick line went with the sub-lines'

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: the Parlay Builder tab without its descriptions (the builder, the panel, the Top 30 lines)')
