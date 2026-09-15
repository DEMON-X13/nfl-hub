"""app v32: the prop model takes the betting model's look.
  * Same fonts (Space Grotesk display, Inter Tight body), colour tokens, page
    background, header gradient with the gold rule and dot, pill tab bar, buttons,
    inputs, tables, cards, empty states and confidence pills.
  * Display-font sizes rescaled: Space Grotesk is much wider than Barlow Condensed.
  * Cards, game rows and player rows use soft shadows and larger radii instead of
    hard borders. Finished games keep the FINAL pill but no longer turn blue,
    matching the betting model's played rows.
  * Header reads "X NFL Prop Model".
"""
from pathlib import Path

HERE = Path(__file__).parent


def edit(path, pairs):
    p = HERE / path
    s = p.read_text(encoding="utf-8")
    for old, new in pairs:
        assert s.count(old) == 1, (path, s.count(old), old[:90])
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8", newline="\n")
    print("patched", path)


p1 = HERE / "part1.html"
s = p1.read_text(encoding="utf-8")

# ---- 1. fonts and the base block (tokens through .two) ----
old_font = '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'
new_font = ('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">')
assert s.count(old_font) == 1
s = s.replace(old_font, new_font)

a = s.index(":root{")
b_mark = ".two{display:grid;grid-template-columns:1fr 1fr;gap:14px}\n"
b = s.index(b_mark) + len(b_mark)
BASE = r""":root{
  --bg:#EDF0F4; --bg-2:#F6F8FA; --panel:#FFFFFF; --panel-2:#F7F9FB;
  --ink:#0F1B2D; --ink-2:#4F607A; --muted:#657386; --line:#E4E9F0; --line-2:#D5DCE6;
  --pick:#1B7A4E; --pick-soft:#DDF3E6; --gold:#D39A1F; --gold-soft:#FBEFD3;
  --miss:#C0392B; --miss-soft:#FAE1DE;
  --away:#3F5F8F; --home:#1F6F4A;
  --r-lg:16px; --r-md:12px; --r-sm:9px;
  --sh-xs:0 1px 2px rgba(15,27,45,.06);
  --sh-sm:0 1px 2px rgba(15,27,45,.05),0 4px 12px -4px rgba(15,27,45,.10);
  --sh-md:0 2px 4px rgba(15,27,45,.05),0 12px 28px -10px rgba(15,27,45,.18);
  --ring:0 0 0 3px rgba(211,154,31,.35);
  --display:"Space Grotesk",ui-sans-serif,system-ui,"Segoe UI",sans-serif;
  --body:"Inter Tight","Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  --ease:cubic-bezier(.2,.7,.2,1);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
html,body{margin:0;color:var(--ink);font-family:var(--body);font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}
body{background:radial-gradient(1200px 600px at 20% -10%,#FFFFFF 0%,rgba(255,255,255,0) 60%),linear-gradient(180deg,var(--bg-2) 0%,var(--bg) 100%);background-attachment:fixed;min-height:100vh}
::selection{background:var(--gold-soft);color:var(--ink)}
button,input,select{font:inherit;color:inherit}

/* ---------- header + tabs (same as the betting model) ---------- */
header{background:linear-gradient(135deg,#0B1526 0%,#132238 55%,#1B2E4A 100%);color:#fff;padding:22px 28px 0;position:relative}
header::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,rgba(211,154,31,.0),rgba(211,154,31,.55),rgba(211,154,31,.0))}
.brand{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.brand h1{font-family:var(--display);font-weight:700;font-size:33px;letter-spacing:-.5px;margin:0;line-height:1}
.brand h1::after{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--gold);margin-left:8px;vertical-align:baseline;box-shadow:0 0 12px rgba(211,154,31,.7)}
.brand .sub{color:#B9C5D4;font-size:13px}
nav{display:flex;gap:4px;margin-top:16px;overflow-x:auto;padding:5px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:14px 14px 0 0;border-bottom:0;width:max-content;max-width:100%}
nav button{background:transparent;border:0;color:#C3CEDC;padding:8px 14px;font-family:var(--display);font-size:15px;font-weight:600;letter-spacing:-.1px;border-bottom:3px solid transparent;cursor:pointer;white-space:nowrap;border-radius:10px;transition:color .18s var(--ease),background .18s var(--ease),transform .18s var(--ease)}
nav button:hover{color:#fff;background:rgba(255,255,255,.08)}
nav button[aria-selected=true]{color:var(--ink);background:#fff;border-bottom-color:transparent;box-shadow:0 2px 8px -2px rgba(0,0,0,.35)}
nav button:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:none;box-shadow:var(--ring)}
main{max-width:1180px;margin:0 auto;padding:24px 28px 72px}
section[hidden]{display:none}

/* ---------- controls ---------- */
.bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.bar .grow{flex:1}
.bar .rec{display:inline-flex;align-items:baseline;gap:6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:5px 11px;border-radius:999px;background:#E9EEF4;color:var(--ink-2);white-space:nowrap}
.bar .rec b{font-family:var(--display);font-size:14px;font-weight:700;letter-spacing:0;color:var(--ink);font-variant-numeric:tabular-nums}
select,input[type=number],input[type=text]{background:var(--panel);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:8px 11px;box-shadow:inset 0 1px 2px rgba(15,27,45,.04);transition:border-color .15s var(--ease),box-shadow .15s var(--ease)}
select:hover,input[type=number]:hover,input[type=text]:hover{border-color:#B9C4D2}
select:focus,input[type=number]:focus,input[type=text]:focus{border-color:var(--ink);box-shadow:var(--ring)}
input[type=number]{width:90px}
input[type=checkbox]{width:16px;height:16px;accent-color:var(--ink);cursor:pointer}
.btn{text-decoration:none;display:inline-block;background:linear-gradient(180deg,#1A2B45,#0F1B2D);color:#fff;border:0;border-radius:10px;padding:9px 15px;cursor:pointer;font-weight:500;box-shadow:0 1px 2px rgba(15,27,45,.2),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .15s var(--ease),box-shadow .15s var(--ease),filter .15s var(--ease)}
.btn.quiet{background:var(--panel);color:var(--ink);border:1px solid var(--line-2);box-shadow:var(--sh-xs)}
.btn.quiet:hover{background:var(--panel-2);border-color:#B9C4D2}
.btn.danger{background:linear-gradient(180deg,#D2483A,#B23A32)}
.btn.go{background:linear-gradient(180deg,#22935F,#1B7A4E)}
.btn:hover{filter:brightness(1.05);transform:translateY(-1px);box-shadow:0 4px 10px -4px rgba(15,27,45,.35),inset 0 1px 0 rgba(255,255,255,.08)}
.btn:active{transform:translateY(0);filter:brightness(.98)}
.btn:disabled{opacity:.6;cursor:default;transform:none;filter:none}

/* ---------- stat tiles ---------- */
.stat-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px}
.stat{background:var(--panel);border:1px solid transparent;border-radius:var(--r-md);padding:14px 16px 12px;box-shadow:var(--sh-sm);position:relative;overflow:hidden}
.stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--gold),rgba(211,154,31,.25))}
.stat b{font-family:var(--display);font-size:28px;font-weight:700;display:block;line-height:1;letter-spacing:-.6px;font-variant-numeric:tabular-nums}
.stat span{color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;display:block;margin-top:5px}

/* ---------- tables ---------- */
table{width:100%;border-collapse:separate;border-spacing:0;background:var(--panel);border:0;border-radius:var(--r-md);overflow:hidden;box-shadow:var(--sh-sm)}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:middle}
th{font-weight:600;color:var(--muted);font-size:11px;letter-spacing:.06em;text-transform:uppercase;background:var(--panel-2)}
tbody tr{transition:background .12s var(--ease)}
tbody tr:hover{background:#FAFBFD}
tr:last-child td{border-bottom:0}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
th.sortable{cursor:pointer;user-select:none;transition:color .15s var(--ease)}
th.sortable:hover{color:var(--ink)}

/* ---------- cards ---------- */
.card{background:var(--panel);border:1px solid transparent;border-radius:var(--r-lg);padding:20px 22px;margin-bottom:16px;box-shadow:var(--sh-sm)}
.card h2{font-family:var(--display);font-size:21px;font-weight:600;margin:0 0 10px;letter-spacing:-.3px}
.card h3{font-family:var(--display);font-size:16px;font-weight:600;margin:16px 0 6px;letter-spacing:-.2px}
.card ul{margin:8px 0 0;padding:0 6px 0 22px;list-style-position:outside} .card li{margin:6px 0;padding-right:4px;line-height:1.5}
.muted{color:var(--ink-2)}
.empty{padding:44px 20px;text-align:center;color:var(--muted);background:var(--panel);border:1.5px dashed var(--line-2);border-radius:var(--r-lg)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
"""
s = s[:a] + BASE + s[b:]
p1.write_text(s, encoding="utf-8", newline="\n")
print("base block replaced")

# ---- 2. components: same shapes as the betting model, sizes rescaled for the wider font ----
edit("part1.html", [
    ("<title>Prop Model</title>", "<title>X NFL Prop Model</title>"),
    ("    <h1>Prop Model</h1>", "    <h1>X NFL Prop Model</h1>"),
    # team tags
    (".ttag{display:inline-block;font-family:var(--display);font-size:13px;font-weight:600;line-height:1;padding:5px 7px;border-radius:5px;border:1.5px solid;letter-spacing:.02em;box-shadow:0 1px 1px rgba(11,22,42,.14)}\n.ttag.mini{font-size:12px;padding:4px 6px;vertical-align:-1px}",
     ".ttag{display:inline-block;text-align:center;font-family:var(--display);font-size:12px;font-weight:700;line-height:1;padding:5px 8px;border-radius:7px;border:1.5px solid;letter-spacing:.03em;flex:none;box-shadow:0 1px 2px rgba(15,27,45,.18),inset 0 1px 0 rgba(255,255,255,.18);text-shadow:0 1px 0 rgba(0,0,0,.12)}\n"
     ".ttag.mini{font-size:12px;padding:4px 5px;min-width:40px;vertical-align:-1px}"),
    # game rows
    (".gamehead{padding:0 14px 6px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}",
     ".gamehead{padding:0 16px 8px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}"),
    (".game{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin-bottom:8px;cursor:pointer;text-align:left;width:100%;font:inherit;color:inherit}\n.game:hover{border-color:var(--ink)}",
     ".game{background:var(--panel);border:1px solid transparent;border-radius:var(--r-lg);padding:13px 16px;margin-bottom:10px;cursor:pointer;text-align:left;width:100%;font:inherit;color:inherit;box-shadow:var(--sh-sm);transition:box-shadow .2s var(--ease),transform .2s var(--ease)}\n"
     ".game:hover{box-shadow:var(--sh-md);transform:translateY(-1px)}"),
    (".matchup{font-family:var(--display);font-size:23px;font-weight:600;display:flex;align-items:center;gap:8px;line-height:1;white-space:nowrap}\n.matchup .at{color:var(--ink-2);font-size:13px;font-family:var(--body);font-weight:400}",
     ".matchup{font-family:var(--display);font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;line-height:1;white-space:nowrap}\n"
     ".matchup .ttag{font-size:13px}\n"
     ".matchup .at{color:var(--muted);font-size:11px;font-family:var(--body);font-weight:500;letter-spacing:.02em;flex:none}"),
    (".tot b{display:block;color:var(--ink);font-weight:700;font-family:var(--display);font-size:26px;letter-spacing:.5px;margin-bottom:3px}",
     ".tot b{display:block;color:var(--ink);font-weight:700;font-family:var(--display);font-size:20px;letter-spacing:-.3px;margin-bottom:3px;font-variant-numeric:tabular-nums}"),
    (".edgecount{text-align:center;font-family:var(--display);font-size:22px;font-weight:700}",
     ".edgecount{text-align:center;font-family:var(--display);font-size:18px;font-weight:700}"),
    (".teamhdr{font-family:var(--display);font-size:21px;font-weight:600;margin:18px 0 8px;display:flex;align-items:center;gap:10px}",
     ".teamhdr{font-family:var(--display);font-size:18px;font-weight:600;letter-spacing:-.3px;margin:20px 0 10px;display:flex;align-items:center;gap:10px}"),
    (".pill{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;background:#E3E8EE;color:var(--ink-2)}\n.pill.warn{background:#FCF1D6;color:#8A5E05}",
     ".pill{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;background:#E9EEF4;color:var(--ink-2)}\n.pill.warn{background:var(--gold-soft);color:#8A5E05}"),
    (".log{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin-top:14px;max-height:280px;overflow:auto;font-size:13px}\n.log div{padding:3px 0;border-bottom:1px solid #F0F2F5}",
     ".log{background:var(--panel);border:1px solid transparent;border-radius:var(--r-md);padding:12px 16px;margin-top:14px;max-height:280px;overflow:auto;font-size:13px;box-shadow:var(--sh-sm)}\n.log div{padding:4px 0;border-bottom:1px solid var(--line)}"),
    (".totrow td{border-top:2px solid var(--ink-2);padding-top:8px;font-weight:600}",
     ".totrow td{border-top:2px solid var(--line-2);padding-top:10px;background:var(--panel-2);font-weight:600}"),
    # overlay
    (".modal{position:fixed;inset:0;z-index:50;background:rgba(19,34,56,.48);",
     ".modal{position:fixed;inset:0;z-index:50;background:rgba(11,21,38,.55);"),
    (".modal-panel{background:var(--bg);border:1px solid var(--line);border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.35);width:100%;max-width:1100px;padding:16px 18px 24px;min-height:200px}",
     ".modal-panel{background:linear-gradient(180deg,var(--bg-2) 0%,var(--bg) 100%);border:0;border-radius:var(--r-lg);box-shadow:0 24px 70px rgba(0,0,0,.35);width:100%;max-width:1100px;padding:18px 20px 26px;min-height:200px}"),
    ("  .matchup{grid-column:1/3;grid-row:2;font-size:25px}", "  .matchup{grid-column:1/3;grid-row:2}"),
    ("  .game .tot b{font-size:21px}", "  .game .tot b{font-size:18px}"),
    ("  .game .totpts b{font-size:21px}", "  .game .totpts b{font-size:18px}"),
    ("  .brand h1{font-size:30px}", "  .brand h1{font-size:27px}\n  nav{width:100%}"),
    # player rows
    (".plrbtn{display:grid;grid-template-columns:1fr auto 34px;gap:14px;align-items:center;width:100%;text-align:left;\n  background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:11px 14px;margin-bottom:6px;cursor:pointer;font:inherit;color:inherit}\n.plrbtn:hover{border-color:var(--ink)}",
     ".plrbtn{display:grid;grid-template-columns:1fr auto 34px;gap:14px;align-items:center;width:100%;text-align:left;\n  background:var(--panel);border:1px solid transparent;border-radius:var(--r-md);padding:12px 16px;margin-bottom:8px;cursor:pointer;font:inherit;color:inherit;box-shadow:var(--sh-sm);transition:box-shadow .2s var(--ease)}\n"
     ".plrbtn:hover{box-shadow:var(--sh-md)}"),
    ("  border-radius:8px 8px 0 0;margin-bottom:0;padding-bottom:12px}",
     "  border-radius:var(--r-md) var(--r-md) 0 0;margin-bottom:0;padding-bottom:12px;box-shadow:none}"),
    (".plrbtn .who{font-family:var(--display);font-size:20px;font-weight:600;line-height:1.1}",
     ".plrbtn .who{font-family:var(--display);font-size:16px;font-weight:600;letter-spacing:-.2px;line-height:1.15}"),
    (".plrbtn .sum b{color:var(--ink);font-family:var(--display);font-size:16px;font-weight:700}",
     ".plrbtn .sum b{color:var(--ink);font-family:var(--display);font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}"),
    (".plrbody{border:1px solid var(--ink);border-top:0;border-radius:0 0 8px 8px;background:var(--panel);",
     ".plrbody{border:1px solid var(--ink);border-top:0;border-radius:0 0 var(--r-md) var(--r-md);background:var(--panel);"),
    (".statblk h4{font-family:var(--display);font-size:17px;font-weight:600;margin:0 0 6px;color:var(--ink);",
     ".statblk h4{font-family:var(--display);font-size:14px;font-weight:600;letter-spacing:-.1px;margin:0 0 6px;color:var(--ink);"),
    (".rungs{width:100%;border:0;background:transparent}", ".rungs{width:100%;border:0;background:transparent;box-shadow:none;border-radius:0}"),
    (".rungs td{border-bottom:1px solid #EDF0F3;padding:6px 8px}", ".rungs td{border-bottom:1px solid var(--line);padding:6px 8px}"),
    (".rungs .thr{font-family:var(--display);font-size:17px;font-weight:600;width:110px}",
     ".rungs .thr{font-family:var(--display);font-size:14px;font-weight:600;width:110px}"),
    (".bar-track{background:#E7EBF0;border-radius:4px;height:14px;overflow:hidden}\n.bar-fill{height:100%;border-radius:4px}",
     ".bar-track{background:#E6EBF1;border-radius:999px;height:12px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(15,27,45,.10)}\n.bar-fill{height:100%;border-radius:999px}"),
    (".pct{font-family:var(--display);font-size:18px;font-weight:700;text-align:right;width:64px;font-variant-numeric:tabular-nums}",
     ".pct{font-family:var(--display);font-size:15px;font-weight:700;text-align:right;width:64px;font-variant-numeric:tabular-nums}"),
    # confidence pills: the betting model's tier look (dot, capitals)
    (".conf{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.05em;padding:3px 10px;border-radius:999px;width:52px;text-align:center}\n.conf.high{background:var(--pick-soft);color:var(--pick)} .conf.med{background:#FCF1D6;color:#8A5E05}\n.conf.low{background:#E9EDF1;color:var(--ink-2)}",
     ".conf{display:inline-flex;align-items:center;justify-content:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px 4px 7px;border-radius:999px;min-width:60px;text-align:center;white-space:nowrap;background:#E9EEF4;color:var(--ink-2)}\n"
     ".conf::before{content:\"\";width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.75;flex:none}\n"
     ".conf.high{background:var(--pick-soft);color:var(--pick)} .conf.med{background:var(--gold-soft);color:#8A5E05}\n.conf.low{background:#E9EEF4;color:var(--ink-2)}"),
    ("  .plrbtn .who{grid-column:1;grid-row:1;font-size:18px;min-width:0;overflow-wrap:anywhere}",
     "  .plrbtn .who{grid-column:1;grid-row:1;font-size:16px;min-width:0;overflow-wrap:anywhere}"),
    ("  .rungs .thr{width:74px;font-size:16px}", "  .rungs .thr{width:74px;font-size:13px}"),
    ("  .rungs .pct{width:52px;font-size:16px}", "  .rungs .pct{width:48px;font-size:14px}"),
    ("  .conf{width:44px;font-size:10px;padding:3px 6px}", "  .conf{min-width:0;font-size:9px;padding:3px 7px}\n  .conf::before{display:none}"),
    ("  .bigp b{font-size:24px}", "  .bigp b{font-size:21px}"),
    # games list leaders
    (".lead .v{color:var(--ink);font-family:var(--display);font-weight:700;font-size:15px}",
     ".lead .v{color:var(--ink);font-family:var(--display);font-weight:700;font-size:13px;font-variant-numeric:tabular-nums}"),
    (".totpts b{display:block;font-family:var(--display);font-size:24px;font-weight:700;color:var(--ink);margin-bottom:3px}",
     ".totpts b{display:block;font-family:var(--display);font-size:20px;font-weight:700;letter-spacing:-.3px;color:var(--ink);margin-bottom:3px;font-variant-numeric:tabular-nums}"),
    (".winner .none{font-family:var(--display);font-size:22px;font-weight:700;color:var(--muted)}",
     ".winner .none{font-family:var(--display);font-size:18px;font-weight:700;color:var(--muted)}"),
    (".rungs tr.on td{background:#F2F9F5}", ".rungs tr.on td{background:#EFF8F3}"),
    # parlay boxes
    (".bigp .box{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px}\n.bigp b{display:block;font-family:var(--display);font-size:29px;font-weight:700;line-height:1}\n.bigp span{color:var(--ink-2);font-size:12px}\n.bigp .hero{background:var(--ink);border-color:var(--ink)}",
     ".bigp .box{background:var(--panel);border:1px solid var(--line);border-radius:var(--r-md);padding:12px 14px;box-shadow:var(--sh-xs)}\n"
     ".bigp b{display:block;font-family:var(--display);font-size:25px;font-weight:700;letter-spacing:-.5px;line-height:1;font-variant-numeric:tabular-nums}\n"
     ".bigp span{color:var(--ink-2);font-size:12px}\n"
     ".bigp .hero{background:linear-gradient(135deg,#0B1526 0%,#132238 55%,#1B2E4A 100%);border-color:#0F1B2D}"),
    (".pays .bigp b{font-size:23px}", ".pays .bigp b{font-size:20px}"),
    (".pays .box.tier.med{background:#FCF1D6;border-color:#E3C77A}", ".pays .box.tier.med{background:var(--gold-soft);border-color:#E3C77A}"),
    (".pays .box.tier.low{background:#E9EDF1;border-color:#C9D1DB}", ".pays .box.tier.low{background:#E9EEF4;border-color:var(--line-2)}"),
    (".payout{font-family:var(--display);font-size:34px;font-weight:700;color:var(--pick)}",
     ".payout{font-family:var(--display);font-size:26px;font-weight:700;letter-spacing:-.5px;color:var(--pick)}"),
    (".rungs tr.mainline td{background:#F7F9FB}", ".rungs tr.mainline td{background:var(--panel-2)}"),
    (".rungs tr.mainline .thr{font-size:15px}", ".rungs tr.mainline .thr{font-size:13px}"),
    # finished games: no blue fill, same card as the betting model's played rows
    (".game.locked{background:#F6F8FA}\n.game.final{background:#CFE0F4;border-color:#9DBBDC}\n.game.final:hover{border-color:var(--away)}\n.game.final .pill.ok{background:#B7D0EC;color:#1E3D66}\n.game.final .when b,.game.final .tot b,.game.final .totpts b{color:#0E2340}\n.game.final .lead .va.near{color:#7A5204}\n.game.final .lead .va.far{color:#9E2F28}\n.game.final .lead .va.exact{color:#4E2A96}\n.game.final .muted,.game.final .lead .cat,.game.final .tot small,.game.final .totpts small{color:#4A5B72}",
     ".game.locked{background:var(--panel)}\n.game.final .pill.ok{background:#E1EBF7;color:#1E3D66}"),
    (".statblk h4 em.actual{color:var(--ink);font-weight:700;background:#EEF1F4;padding:2px 8px;border-radius:5px}",
     ".statblk h4 em.actual{color:var(--ink);font-weight:700;background:#E9EEF4;padding:2px 8px;border-radius:999px}"),
    (".savedp{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin-bottom:10px}",
     ".savedp{background:var(--panel);border:1px solid var(--line);border-radius:var(--r-md);padding:14px 16px;margin-bottom:10px;box-shadow:var(--sh-xs)}"),
    (".tile{background:#FAFBFC;border:1px solid var(--line);border-radius:8px;padding:9px 11px;display:flex;flex-direction:column;gap:2px}",
     ".tile{background:var(--panel-2);border:1px solid var(--line);border-radius:var(--r-md);padding:10px 12px;display:flex;flex-direction:column;gap:2px}"),
    (".tile .tv{font-family:var(--display);font-size:27px;font-weight:700;line-height:1.05}",
     ".tile .tv{font-family:var(--display);font-size:22px;font-weight:700;letter-spacing:-.4px;line-height:1.05;font-variant-numeric:tabular-nums}"),
    (".tile .tv.pend{color:var(--muted);font-size:20px}", ".tile .tv.pend{color:var(--muted);font-size:17px}"),
    (".sp-title{font-family:var(--display);font-size:20px;font-weight:700}", ".sp-title{font-family:var(--display);font-size:17px;font-weight:700;letter-spacing:-.3px}"),
    (".sp-money div{background:#F7F9FB;border:1px solid var(--line);border-radius:7px;padding:7px 10px}",
     ".sp-money div{background:var(--panel-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:7px 10px}"),
    (".sp-money b{display:block;font-family:var(--display);font-size:21px;font-weight:700;line-height:1.1}",
     ".sp-money b{display:block;font-family:var(--display);font-size:17px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}"),
    (".tile .tv{font-size:23px}", ".tile .tv{font-size:19px}"),
    (".sp-leg{display:grid;grid-template-columns:22px 1fr auto auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid #EDF0F3;font-size:13px}",
     ".sp-leg{display:grid;grid-template-columns:22px 1fr auto auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line);font-size:13px}"),
])

edit("part2.js", [
    ("const APP_BUILD='app v31 \\u00b7 2026-09-15';", "const APP_BUILD='app v32 \\u00b7 2026-09-15';"),
])
print("done")
