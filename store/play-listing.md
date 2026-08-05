# SODA — Google Play store listing

Copy-paste source for the Play Console. English, because the game is.

Everything here is written from what the game actually does. Nothing claims a
feature that is not in the build. Two things to confirm before publishing are
marked **CHECK**.

---

## App name (30 characters max)

```
SODA: Y2K Skate Runner
```
22 characters, 8 to spare.

Why not just "SODA": one word is unsearchable and collides with a thousand
drinks apps. The two words after the colon are what people actually type. Keep
`SODA` first so the icon and the name agree.

Alternates, same reasoning:
- `SODA — Bubblegum Skate Run` (25)
- `SODA: Neon Skate Runner` (23)

---

## Short description (80 characters max)

This is the line under the title in search results. It is the single highest
-leverage text in the whole listing.

```
Skate a candy-neon city. 12 worlds, 12 mechanics, one thumb, zero filler.
```
72 characters.

Alternates:
```
Y2K skate runner. Twelve worlds, each with its own trick to master.
```
```
One thumb, twelve neon worlds. Grind, spin, surf — never the same run twice.
```

Rules I followed, in case you rewrite it: lead with the verb, name the genre
inside the first five words, and put a number in it. "12 worlds" survives being
skim-read; "a beautiful journey" does not.

---

## Full description (4000 characters max)

Play weights the first 167 characters for search. Everything below is written
so the opening lines carry the keywords without reading like keyword soup.

```
Lace up. SODA is a skate runner through twelve neon worlds, each one built
around its own mechanic — not a repaint of the last.

Grind the rails of a night market. Surf a swell that comes up behind you and
overtakes. Ride an upper deck slung over the road. Thread hoops in freefall.
Chain tricks until the bar pays out, and try not to crash while you are
carrying one.

ONE THUMB, TWELVE WORLDS
Swipe to switch lane, up to jump, down to slide. That is the whole control
scheme, and it never changes. What changes is what the world asks of it.

• THE RING — pastel orbital avenue, where you learn the three verbs
• THE SHORE — an artificial ocean. The swell catches you from behind
• THE SUGAR FLATS — pink sand and real hills. Gravity gives and takes
• THE MARKET — narrow, loud, and full of rails to grind
• THE GREENHOUSE — hedges block every lane. Only a bloom pad clears them
• THE DOCKS — a catwalk in low gravity that simply stops
• THE ARCADE — you are the ball. Chain the bumpers or the bar dies
• THE HEIGHTS — a bare bridge above the weather, with panels missing
• THE VAULT — flight. Lanes gain a second axis
• THE BOTTLING PLANT — conveyors that push and drag
• THE STORM — wreckage in the air, and a second road above the first
• THE CORE — every world at once, in full neon, and faster

TRICKS THAT PAY
Ollie, grab, spin, grind, surf. Tricks are links in a chain, and the chain
banks as charge when it closes. Carry a big one through traffic and it is
worth a lot. Crash and it is gone. Tap in mid-air to spin and rack up style on
the empty stretches — style is its own score, kept per world.

BEAT YOUR OWN TIME
Every world keeps your distance, your fastest clear, your cells and your best
style run. Clearing a world unlocks the next one — distance alone will not do
it, because grinding out an easy world should not buy you the hard one.

ORIGINAL SOUNDTRACK
Twelve tracks, one per world. Pop punk, hyperpop, surf punk and a finale that
earns the name.

BUILT FOR A PHONE
Portrait. One thumb. Short runs. Fully playable offline once installed.
```

**CHECK before publishing**

1. *"Fully playable offline"* — the build bundles every asset in the APK and
   makes no network calls, so this should hold. Install the release build,
   turn on airplane mode and play one full run before you claim it. If
   anything stalls, cut the line.
2. *No ads, no in-app purchases* — I have deliberately **not** written that,
   even though the project has no ad SDK and no billing library (the Google
   services plugin is conditional and there is no `google-services.json`).
   It is a strong selling line, so add it if you confirm it — but Play will
   hold you to it, and the Data safety form has to agree.

---

## Screenshots

Play shows the first 2 to 3 in search. Those two are worth more than the other
six combined, so they carry the pitch, not the prettiest view.

Take them at **1080×1920**, from the phone build, with the HUD visible — a
screenshot with no HUD reads as a render, not as a game.

| # | Shot | Why |
|---|------|-----|
| 1 | THE CORE mid-run, full neon, a turn in progress with the horizon tilted | Loudest frame in the game. It has to be first |
| 2 | THE MARKET, grinding a rail, trick banner and multiplier on screen | Shows the trick system exists — the thing that separates this from every endless runner |
| 3 | THE SHORE, mid-air over the swell with the foam crest under her | The one image that is obviously not a city runner |
| 4 | THE STORM, on the upper deck, the lower road visible below | Sells "two roads" in one frame |
| 5 | THE VAULT, flying, hoops ahead | Sells the second axis |
| 6 | THE GREENHOUSE launching off a bloom pad over a hedge | Colour contrast against the neon shots |
| 7 | Zone select screen | Proves twelve worlds rather than claiming it |
| 8 | Zone clear screen with a record beaten | Progression, and a reason to come back |

**Caption overlay** on shots 1–3 only, large bold type in the game's own font,
top third: `12 WORLDS. 12 MECHANICS.` / `CHAIN TRICKS. BANK STYLE.` /
`THE WAVE CATCHES YOU.` Leave 4–8 clean.

Easiest way to get them: run a zone in the browser at a 1080×1920 window, play
to the moment you want, and screenshot. The in-game debug capture makes clean
frames but tends to catch her mid-jump over an obstacle — play them by hand.

---

## Feature graphic (1024×500)

Shown at the top of the listing and in some Play surfaces. No screenshot
scales into this shape well; make it on purpose.

Left third: the courier in her pink jacket, three-quarter view, mid-spin.
Middle: the wordmark `SODA` in the game's Titan One, the same pink-to-mint
gradient the HUD uses. Right third: the neon city receding into magenta.

Two constraints that people get wrong: no text below the bottom 15% or in the
right 10% (cropped on some layouts), and it must read at 250 px wide, which is
how it is usually seen. Test it shrunk before you upload it.

---

## Icon (512×512)

You already have `public/icon-512.png`. One check: view it at 48 px. A skate
or a soda-can silhouette survives that size; a full character does not.

---

## Category and tags

- **Category:** Games → Arcade. (Not Action — Arcade is where runners live and
  where the audience browses.)
- **Tags:** Endless Runner, Arcade, Casual, Stylised, Offline
- **Content rating:** answer the questionnaire honestly — no violence, no
  gambling, no user content, no data collection. It should come back
  PEGI 3 / ESRB Everyone, which widens your audience.

## Privacy policy

`public/privacy.html` ships with the build, so once Pages has deployed it is
live at `https://leiaperch.github.io/soda/privacy.html`. Paste that URL into
the Play Console. Read it once first and make sure it says what the app
actually does — a privacy policy that overstates collection will contradict
your Data safety form.

---

## What actually drives installs, in order

1. **The short description and the first screenshot.** Almost everyone decides
   there. If you only polish two things, polish those.
2. **The icon at 48 px.** It is the first thing rendered and the smallest.
3. **Ratings.** Ask the ten people who will play it to rate it in the first
   week. The first ten ratings move the average more than the next hundred.
4. **The full description's first two lines.** The rest is read by almost
   nobody, but it is read by the search index.

What does not drive installs: a long feature list, exclamation marks, and the
word "addictive".
