"""The published data wins on every load, on every device.

The app kept the whole season in this browser and treated the payload as a seed. On a
return visit it restored the saved copy whenever the payload's *model* build matched --
and that hash only moves when rosters or depth charts change, which is rarely. So a job
run that re-baked stats, re-graded a game or corrected a number published it to a site
that then quietly laid the browser's older copy back over the top. A game already counted
is skipped for good by ingestStats, so no amount of refreshing brought the correction in.
That is what "I published a change and still see the old thing" was.

The freshness key is now the bake time, which changes on every run of the job, not the
model hash, which does not. When it moves, the season is rebuilt from the payload that
was just downloaded and only what the visitor made -- parlays, saved slips, stake, their
own odds, their settings -- is carried over. Rebuilding the whole season from the payload
measures 330ms in jsdom with two weeks of stats in it, which is a price worth paying once
a load for a page that is never wrong.

A rebuild is silent now unless the model or the rosters actually changed. The job
publishes several times a week and none of those is news; a banner on each one would
train the reader to ignore the banner that matters. The note is also hidden again when
there is nothing to say, which it never was: it could only ever be shown.
"""
import io
p2='part2.js'
s=io.open(p2,encoding='utf-8').read()

old="let DATA_BUILD='baseline';   /* set by boot() once the payload is in; see loadPayload */"
new=("let DATA_BUILD='baseline';   /* set by boot() once the payload is in; see loadPayload */\n"
     "/* what the saved season is checked against. DATA_BUILD is the model's own hash and moves\n"
     "   only when rosters or depth charts do; this is the moment the payload was baked, so it\n"
     "   moves on every run of the job and a published change always reaches every device. */\n"
     "let DATA_STAMP='baseline';")
assert s.count(old)==1
s=s.replace(old,new)

old="  const st={season:SEASON,build:MODEL_BUILD,dataBuild:DATA_BUILD,week:1,players:{},teams:{},defs:{},defg:{},"
new="  const st={season:SEASON,build:MODEL_BUILD,dataBuild:DATA_BUILD,dataStamp:DATA_STAMP,week:1,players:{},teams:{},defs:{},defg:{},"
assert s.count(old)==1
s=s.replace(old,new)

old="const APP_BUILD='app v59 \\u00b7 2026-09-21';"
new="const APP_BUILD='app v60 \\u00b7 2026-09-21';"
assert s.count(old)==1
io.open(p2,'w',encoding='utf-8').write(s.replace(old,new))

p3='part3.js'
s=io.open(p3,encoding='utf-8').read()

# the rebuild note is only ever shown, never hidden again, so a boot with nothing to say
# left the previous boot's banner standing
old="  if(rebuilt){ $('rebuildNote').hidden=false; $('rebuildNote').textContent=rebuilt; setTimeout(()=>log(rebuilt,'warn'),0); }"
new="  $('rebuildNote').hidden=!rebuilt;\n  if(rebuilt){ $('rebuildNote').textContent=rebuilt; setTimeout(()=>log(rebuilt,'warn'),0); }"
assert s.count(old)==1
s=s.replace(old,new)

old="  DATA_BUILD=PAY.build||'baseline';"
new=("  DATA_BUILD=PAY.build||'baseline';\n"
     "  DATA_STAMP=PAY.baked_at||DATA_BUILD;")
assert s.count(old)==1
s=s.replace(old,new)

old="  if(saved&&saved.build===MODEL_BUILD&&saved.dataBuild===DATA_BUILD){ S={...S,...saved}; }\n  else if(saved){\n    rebuilt=(saved.dataBuild&&saved.dataBuild!==DATA_BUILD)||!saved.dataBuild"
new=("  if(saved&&saved.build===MODEL_BUILD&&saved.dataBuild===DATA_BUILD&&saved.dataStamp===DATA_STAMP){ S={...S,...saved}; }\n"
     "  else if(saved){\n"
     "    /* a fresh bake on its own rebuilds the season without a word: the job publishes several\n"
     "       times a week and a banner on each would bury the one that matters */\n"
     "    rebuilt=(saved.build===MODEL_BUILD&&saved.dataBuild===DATA_BUILD)?null\n"
     "      :(saved.dataBuild&&saved.dataBuild!==DATA_BUILD)||!saved.dataBuild")
assert s.count(old)==1
io.open(p3,'w',encoding='utf-8').write(s.replace(old,new))
print('published data wins; app v60')
