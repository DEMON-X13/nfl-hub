# A week's game notes: the format and the rules

One file a week, `data/notes/<season>-w<N>.json`, written each Wednesday from `tools/out/weekN-pack.md` and
the panel in `tools/sources.md`, then checked with `node tools/notes.js --strict` and `node tools/smoke.js`
(`HANDOFF.md`, "The weekly job"). X NFL Bets and Stats' Game snapshot reads it at runtime and shows each
game's note between the two teams; a game left out shows an automatic line ("The Seahawks (3-2) visit the
Broncos (4-1) ..." and who is out), so a file may cover some games and gain the rest later.

```json
{
  "season": 2026,
  "week": 6,
  "written": "2026-10-14",
  "games": {
    "2026_06_SEA_DEN": {
      "preview": "**Drew Lock** gets another start in Denver on a short week, against a Broncos pass rush that has carried their season.",
      "news": "Seattle ruled out **Sam Darnold** (wrist) on Wednesday; Denver signed a cornerback off the practice squad after losing **Pat Surtain II** to a hamstring injury.",
      "sources": ["ESPN", "Seattle Times", "Denver Post"]
    }
  }
}
```

(The example's facts are made up.)

- `season`, `week`: the file name's own.
- `written`: the day it was written, ISO (`2026-10-14`, or a datetime).
- `games`: keyed by the nflverse game id exactly as `../betting/state.json`'s schedule has it
  (`<season>_<WW>_<AWAY>_<HOME>`, the Rams `LA`), only games of that week.
- `preview` (required): one sentence, 40 to 200 characters (counted without the `**` markers), ending in
  `.`, `!` or `?`. What this game is about: form, a key player, a storyline.
- `news` (optional, `""` when nothing is notable): at most 300 characters without the markers, one or two
  short sentences. Scores are fine here.
- `sources` (optional): the outlets the note came from, short names.

The rules, which `tools/notes.js` holds (the wording ones warn, the shape ones fail; `--strict` refuses both):

- Every player named is in bold, a surname alone too, and only players, never a coach or an owner:
  "Falcons coach Kevin Stefanski said `**Penix**` will start", "`**Marvin Harrison Jr.**` reunites with
  `**C.J. Stroud**`". Otherwise plain text: no HTML, no other markdown, no stray `*`, no bold in `sources`.
- No betting language at all: no spread, favourite or favored, underdog, moneyline, odds, over/under or O/U,
  "the total" or point total, cover or covering, ATS, Vegas (Las Vegas the city is fine), sportsbook,
  DraftKings, FanDuel, bet, betting, wager, parlay, "the line" ("on the line" and "the line of scrimmage"
  are fine), juice, vig, prices like +150 or -110, spreads like -3.5 or -3½, and a whole-number spread where one
  is written ("Indianapolis -7", "IND -7", "(-7)", "Line: IND -7", "at -3"; a stat such as "a -5 turnover margin"
  or "(-2 yards)" is fine).
- No record or score typed in the preview (`3-2`, `27-24`): the records are shown beside it, and a typed one
  goes stale by the next game. A scheme like 3-4 reads as one too: write "three-four".
- None of the site's own ranks: not the Deep Dive's, the Team Rankings or ELO Ratings tabs', "Overall
  Offense" or "Overall Defense" (`siteRankQuote()` in `tools/lib.js`). They move with every run; the note
  does not. An outside number with its source is fine ("per TeamRankings").
- No em dashes, no double dashes.
- Every fact on an injury report or in two sources read this week (`tools/sources.md`).
