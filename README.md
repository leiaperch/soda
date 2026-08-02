# SODA

Y2K bubblegum orbital runner. You are a courier on antigrav rollers descending
The Ring, a pastel orbital city. Prototype in three.js, aimed at mobile and
eventually the Play Store.

Everything shown in-game is in English. This file is the dev-side doc.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5184. Swipe or use the arrow keys.

## Shipping to Google Play

The game is wrapped with **Capacitor**, not a TWA: it bundles every asset into
the APK, so it works offline and does not depend on the Pages site staying up.
A TWA would also have needed Digital Asset Links at a domain root, which
`github.io` does not let you own.

```bash
npm run android:debug     # build + sync + assembleDebug, for sideloading
npm run android:bundle    # build + sync + bundleRelease, the AAB Play wants
npm run android:open      # open the project in Android Studio
```

Gradle needs a JDK 17+; Android Studio ships one at
`C:\Program Files\Android\Android Studio\jbr`, so set `JAVA_HOME` to it. The
debug APK comes out at 38 MB, targeting API 36, portrait-locked, minSdk 24.

**Signing.** `android/app/build.gradle` reads `android/keystore.properties`,
which is gitignored, and falls back to an unsigned release if the file is
absent so a fresh clone still builds. Copy `keystore.properties.example`, and
back the `.jks` up somewhere you will still have in five years: losing the
upload key means never being able to update the listing again.

**Store assets** are in `store/`, with draft listing copy in
`store/LISTING.md`. The privacy policy is a real page at
`public/privacy.html`, served at `/soda/privacy.html`, which Play requires
even for an app that collects nothing.

**The back button** is handled in `core/backbutton.js`. Left alone, Android's
back closes the app mid-run, which is a guaranteed one-star review and
something Play reviewers check. Here it means "go up one level": a run pauses,
a paused run drops to the zone list, the list drops to the title, and only the
title exits. The mechanism is one dummy history entry kept pushed while deeper
than the title, so the gesture fires `popstate` instead of leaving the page.

**Payload.** The twelve tracks were re-encoded from ~180 kbps to VBR q7, which
took the audio from 60 MB to 33 MB with no audible loss on a phone speaker.
The original glTF courier and her texture atlas were deleted outright: they
were a 5.7 MB fallback for a path that never ran, and the procedural courier
in `player.js` is a better fallback because it weighs nothing.

## Testing on a phone

The dev server binds to the LAN, so it prints a second URL like
`http://10.143.236.132:5184/`. Open that on a phone on the same Wi-Fi.

Then **add it to the home screen**. The manifest sets `display: fullscreen`
and locks portrait, so launched from the home screen it runs without the
address bar. That matters more than it sounds: the address bar eats a chunk
of the viewport and shrinks or grows as you scroll, so a browser tab is not
the real playfield and thumb reach reads wrong.

Two things that fail silently on a LAN IP:

- **Wake Lock needs a secure context.** Over plain `http://` to an IP the
  screen still sleeps mid-run. Over `https` or `localhost` it holds.
- **Guest and campus Wi-Fi usually isolate clients**, so the phone often
  cannot reach the laptop at all no matter what the firewall says.

When either bites, tunnel it:

```bash
npm run tunnel
```

That publishes the dev server over HTTPS on a temporary public URL. It is a
public URL, so treat it as publishing rather than as a local test.

For something durable, `.github/workflows/pages.yml` builds and deploys to
GitHub Pages. It is `workflow_dispatch` only, on purpose: publishing the build
means publishing the soundtrack, which should be a decision rather than a side
effect of a push. It needs the repository to be public and Pages set to
"GitHub Actions".

Icons and the manifest are generated, not drawn: `node tools/make-icons.mjs`
writes the PWA icons straight from maths, with a hand-rolled PNG encoder over
`node:zlib` rather than an image dependency.

## Design

**Core loop.** CHARGE drains continuously and always faster than you would
like. RELAY gates refill it to full, CELLS scattered on the road extend it.
Crashing is never instant death: it costs charge and cuts your speed, which
costs you charge again by delaying the next RELAY. You die when the bar
empties, never on impact. That is what makes the game readable by someone who
has never played a runner while still having a real ceiling.

**Skill expression.** There is no power progression, ever. What separates a
good run from a bad one is that clean play pays charge back: clearing an
obstacle in your own lane grants CLEAN, passing one in an adjacent lane grants
NEAR MISS. A cautious player survives on CELLS. A good player never runs out
because they play tidily. Measured on the current build with a scripted pilot:
a player who touches nothing dies around 300 m, a player who dodges correctly
passes 10 000 m and reaches top speed.

**Zones.** All eleven are built, and each is an ambience *and* a rule change
rather than a reskin.

**Elevation.** Chunk geometry is baked once and recycled at many different z,
so a height profile cannot be baked into it. Instead the road is displaced in
the vertex shader from world z (`uHill`), and `hillAt()` reproduces the same
curve on the CPU for the camera and the courier. Collision is untouched: the
player and an obstacle at the same z get the same offset, so flat-space maths
stays correct. Watch what else wears a bent material — the courier's outline
hull was bent while her body was placed in JS, and it floated off into the sky
over the first hill.

**Obstacles are per zone too** (`world/obstacles.js`). The three obstacles keep
the same *contract* everywhere — jump the barrier, slide under the gate, dodge
the block — because relearning the grammar every zone would be hostile. What
changes is what they are made of: rocks and fishing nets on The Shore, crates
and crane loads on The Docks, fallen trunks and hanging vines in The
Greenhouse, heaved floor slabs and vent pipes in The Core. A concrete pillar
standing in the open sea was the loudest remaining sign of a repaint.

Everything a zone changes lives in `world/zones.js`: sky gradient, fog, key and
fill light, backdrop tints, road and kerb colours, facade palette, and a prop
mix (arch style and spacing, lamp and street-furniture density, how much of the
skyline fills in, whether the sides are water). The chunk builder reads that
config and never hardcodes a colour, which is why The Market can be a dense
neon night and The Shore an open golden-hour beach out of the same generator.

**Zones end.** Each one has a length (The Ring 1400 m, The Shore 1900 m, The
Market 2400 m) and a finish gate waiting at it, deliberately built to read as a
different object from a RELAY: chequered banner, gold, and a wall of light you
stop on rather than a curtain you pass through. No checkpoint spawns within
90 m of the line, so the last stretch is run on whatever charge you arrive
with.

Zones unlock by **clearing** the previous one, not by accumulating distance. A
distance threshold can be ground out by replaying zone one; finishing cannot,
so it actually means you learned something. Clearing also turns the board into
a fastest-time race, which is where the replay value lives.

**Records.** Time Attack per zone with a ghost of your own best run, Endless
distance, a Daily Run on a shared seed (see `dailySeed()` in `core/rng.js`),
and a Clean Run badge for finishing a zone untouched.

## Art direction

Cel-shaded pastel for the world, chrome reserved for what the player must read
instantly: the courier, her rollers, RELAY gates and CELLS. That split is
deliberate. Full chrome everywhere costs frames and, worse, flattens the
hierarchy — if everything shines, nothing does.

Two gotchas worth remembering, both cost a debug pass here:

- The environment map must **not** be the same texture as the sky. A mirror
  needs a hard horizon and a dark lower hemisphere or the chrome reads as pink
  plastic. `skyTexture()` and `envTexture()` are separate on purpose.
- An equirectangular source has to be 2:1. A 32×256 canvas silently produced a
  black PMREM, which looked exactly like "the env map isn't applied".

## Interface

Y2K UI is skeuomorphic, not flat, and `src/style.css` is built on six motifs
that all come from the era's actual vocabulary:

1. **Candy gloss type** with a hard stop at 50%: light blue above, pink below,
   and a white highlight band at the break. Textbook Y2K chrome puts a dark
   horizon there instead, which is more literally metallic but drags a violet
   bar across every letter, so the highlight version won. The hard stop is the
   part that matters; without it this is just a pastel gradient.
2. **Inflated bubble type with a double outline**, done as stacked layers with
   the widest `-webkit-text-stroke` at the back. One stroke plus a shadow is
   not enough, the sticker look needs a real second outline.
3. **The Aqua gloss**: a hard white highlight across the top ~40% of every
   object, on its own element so it never scales with the content.
4. **Translucent tinted plastic** for panels, with `backdrop-filter` and an
   inner shadow so they read as moulded rather than as a flat overlay.
5. **Iridescent gradients**, animated across the charge bar.
6. **4- and 8-point sparkles**, inline SVG symbols, scattered and twinkling.

The charge bar carries segment ticks on purpose: a coloured length alone is
not readable as a quantity at speed. Low charge drives a red vignette and a
blink, a crash drives a full-screen flash, and each scoring event pops a bubble
toast.

Type is Titan One for anything display (logo, score, buttons, toasts) and
Fredoka for UI text, both self-hosted through `@fontsource` so nothing is
fetched from a CDN at runtime. That matters for the Play Store build.

The palette is deliberately **light blue and pink together**, not pink alone.
Pink on its own goes muddy at this saturation; the blue is what makes it read
as bubblegum rather than as a wash.

## Assets

**A move must not outrange its spacing.** Both The Docks and The Greenhouse
shipped broken the same way: the boosted arc was longer than the gap between
the things it was meant to clear, so you flew past the next launch point and
landed in front of an obstacle with no tool left. If a zone gives you a big
arc, cap its top speed and put one feature per chunk.

**Music** lives in `public/audio`, twelve tracks made in Suno. Every zone owns a
theme via `track` on the zone config, and The Ring shares its theme with the
menu because the menu sits on The Ring. The shuffled bag is now only a safety
net for a zone that forgets to declare one. Watch for a track being both a
theme and a bag entry, which is how the same song ended up playing in two
different zones. `game/audio.js`
runs two `<audio>` elements and crossfades between them rather than using the
Web Audio API: these are full-length streamed songs, and decoding them into
AudioBuffers would cost tens of megabytes of RAM on a phone for nothing.
Autoplay is blocked until a real gesture, so the menu track is queued at boot
and released by whichever interaction happens first. Run tracks are drawn from
a shuffled bag so the same one never repeats back to back. Mute is persisted.

**The music never changes tempo.** An earlier version tied `playbackRate` to
the run speed with the pitch left free to climb. It is a great ten seconds and
unbearable after a minute: the pitch rise never resolves, so the ear stops
hearing acceleration and starts hearing a song going wrong. Speed is sold by
the camera FOV, the world going past and the SFX. Leave the track alone.

**The courier** is `public/models/courier.gltf`. Three fixes are applied at
load time in `game/courier.js` and none are optional:

- the primitive ships with no `NORMAL` attribute, and three does not
  synthesise one, so the mesh renders unlit until `computeVertexNormals()`;
- the material arrives as `metallic 1 / roughness 1`, which drowns the base
  colour texture, so it is rebuilt as a toon material on the world's own ramp;
- the figure is one unit tall centred on the origin, so it is rescaled to 2.1
  and dropped onto the floor.

The export also carries four punctual lights that would stack on the scene's
key light; they are stripped. She faces +Z out of the box, which is straight at
the chase camera, hence the half turn in `MODEL_FACING`.

The procedural courier is still in `game/player.js` and still runs for the
first frames while the model streams in, so the game is never unplayable.

**Animation is live.** `public/models/courier-b.fbx` is the Mixamo auto-rigged
mesh (33 bones, skinned) and the three clips in `public/anim` drive it through
`game/animator.js`: skate as the loop, jump and knocked as one-shots, cross-
faded off the player's own physics rather than a duplicated state machine. Root
motion on the hips is stripped at load, otherwise she walks out of her lane
while the world is already moving under her. When no skeleton is found the
animator returns false and the procedural lean/tuck/bob takes over, so a bad
export degrades instead of breaking.

**The rigged mesh is deliberately untextured, and that is a known problem.**
Mixamo did not only rig the model, it reprocessed the geometry: the glTF has
7412 triangles, the returned FBX has 6984, and the UV layout no longer matches
the original 1024² atlas. Applying it gives marbled garbage — verified lit,
unlit, and with `flipY` both ways. The rigged courier therefore wears a chrome
finish, which at least reads as a deliberate choice here. The fix is upstream:
re-upload her to Mixamo with the texture applied so it comes back on a UV set
that matches. `PREFER_RIGGED` in `game/courier.js` flips back to the textured
static mesh (and loses the animation) in one line.

`tools/extract-texture.mjs` pulls the base64 map out of the glTF into a plain
PNG, which is what the static path loads.

Payload today is about 21 MB of audio and a 3 MB glTF whose texture is a
base64 PNG. Fine for an APK, heavy for the web. Converting the model to `.glb`
and compressing the tracks are the obvious wins before shipping.

## Structure

```
src/
  core/      builder (merged geometry + matrix stack), seeded rng, input
  render/    stage (renderer, lights, IBL, bloom), materials + world-bend shader
  world/     chunk patterns, prop generators, streaming track, pooled pickups
  game/      player, game loop and tuning, local records
  ui/        HUD (markup lives in index.html, JS only sets text and classes)
```

**The bend.** The Ring curves away and rolls as it recedes. It is a vertex
shader lie applied in world space (`BEND_PROJECT` in `render/materials.js`),
which is why it works identically for merged chunks, pooled props and
InstancedMesh. Collision runs on the flat coordinates and ignores it entirely.

**Draw calls.** A whole chunk of city (road, skyline, street furniture,
obstacles) is four merged meshes, one per material. All CELLS on screen are two
instanced draws. Chunk geometry is built once at boot and recycled by moving
it, so a run never allocates geometry mid-flight.

## Tuning

Everything balance-related is in the `TUNE` block at the top of
`game/game.js`, plus `RELAY_EVERY` in `world/track.js`. Obstacle phrases are
authored by hand in `PATTERNS` in `world/chunks.js` and picked by tier as the
run gets faster — placement is never random, which is what keeps stretches from
being unfair or trivial.

## Sound effects

`game/sfx.js` synthesises every cue at runtime with the Web Audio API. No
files on purpose: each one is under half a second, so shipping them as audio
would add megabytes and a load order for sounds that are cheaper to generate
than to decode. It also lets pitch follow state — the CELL chime climbs a
semitone per pickup while a streak holds, then resets — without pre-baking
variants. The context is created lazily on the first cue, same gesture gate as
the music, and everything respects the mute toggle.

## Tricks

CLEAN and NEAR MISS used to hand out 2.0 and 1.2 charge. That is noise: below
the resolution a player can feel, so doing anything stylishly paid nothing and
the game was only ever about not dying. She is on skates. She should be able
to skate.

`game/tricks.js` turns those same events into **links in a chain**. On their
own they are worth nothing. Each one adds points, raises the multiplier and
refreshes a 2.7 s window; when the window closes the whole chain is **banked**
as charge in one lump. Crash and it is lost unbanked.

That makes the risk legible. A long chain is worth a lot and you are carrying
it through obstacles: cash out early and safe, or keep it alive and pay for it.
Measured: ollie → grab → surf reaches 710 points at ×3, which banks 10.1
charge, against the 2.0 the old CLEAN gave.

Repeating the same trick still scores but does not raise the multiplier, so
mashing one input is not a strategy. Grinding pays continuously rather than
once on landing.

**One new input.** Down while airborne is a **GRAB**: worth more than an ollie,
and it commits you to a fast fall. Style you pay for with air control. It is
the only trick that is a decision rather than a consequence.

STYLE is banked per run, kept per zone as a record, and shown on both end
screens, which gives the game a second axis of mastery next to distance and
time.

## Power-ups

Three, deliberately, in `game/powerups.js`. A runner's pickups only work if
the player can tell which one they grabbed from its colour alone, at speed,
without reading anything, so three strongly separated colours and three
effects you feel inside half a second. Each leans on a system the game already
has rather than inventing a parallel one.

- **MAGNET** (pink, 8 s) drags loose CELLS to her from ten metres.
- **FIZZ** (mint, 6.5 s) intercepts the crash entirely: obstacles burst, she
  keeps her line and runs hot. It gets its own SMASH toast rather than
  silently swallowing the hit, because a shield you cannot see working is a
  shield the player does not believe in.
- **DOUBLE** (gold, 11 s) scales what a CELL is worth.

**They arrive one at a time.** `props.powers` is the list a zone may spawn and
`introduces` marks its debut, announced as `NEW · FIZZ` before the player
reaches the can rather than after they have run into it.

| Zone | Spawns |
| --- | --- |
| The Ring | nothing |
| The Shore | MAGNET |
| The Sugar Flats | + DOUBLE |
| The Market | + FIZZ |
| everything after | all three |

The Ring spawns none at all: it is teaching jump, slide and lane change, and a
player learning three verbs does not also need a fourth thing rolling down the
road at them. Each debut sits where that power-up is most obviously good,
because one first met in a situation it does not help in reads as junk —
MAGNET on the open sea where CELLS are spread wide, DOUBLE on the hills where
they are awkward to reach, FIZZ in The Market where you crash most.

They spawn every four chunks, offset from the RELAY so the two never land
together and steal each other's moment. Grabbing one you already hold
refreshes it rather than stacking: a stack whose size you cannot see is a
stack you cannot reason about. The HUD shows a chip per active power-up with
its time draining, blinking under 25% so the loss is never a surprise.

They are **soda cans**, because the game is called SODA. The first pass was an
abstract caged bubble and at any distance it read as a coloured lump with no
shape at all. A recognisable object beats an abstract one every time: the
silhouette says "pickup", the label colour says which one. They are tilted and
spun on their own axis so the label sweeps past instead of tumbling, because a
tumbling can is unreadable.

Never put a built APK in `public/`. It lands in `dist/`, and then inside the
next APK: the app shipped a 38 MB copy of itself once, doubling the download.
`*.apk` and `*.aab` are gitignored now.

## Zone verbs

**Track structure is per zone, not just palette.** This is the thing that
matters: repainting a street made every zone feel like a remix of the first
one. `props.road` selects what is actually underfoot, and each style emits a
different *shape* of track rather than the same slab in another colour.

- `street` — kerbs, decks, guard rails, lamps. The Ring, The Market, The Core.
- `sea` — open water to the horizon. No kerb, no deck, no rail, no lamps, no
  painted lines. Lanes are marked by buoys, because paint on the sea was the
  main thing still reading as "a road with water on it".
- `catwalk` — a narrow platform in vacuum with nothing below or beside it, and
  it stops dead wherever a gap is authored: the deck is built as the spans
  *between* the holes, not as a slab with holes drawn on it.
- `skybridge` — a bare deck, narrower than a street, with no railings at all.
- `street` + `walls` — the same street in a trench, which is most of why The
  Core feels like a descent instead of an avenue.

Every zone changes a rule, not just a colour.

- **The Ring** — the base grammar: jump, slide, switch lane.
- **The Shore** — there is no road at all, the lane is open sea. Swells rear
  up across it: clear one in the air for SURF (speed boost and charge back),
  plough into it grounded for SPLASH (speed cut, charge lost). A timing
  reward, not an obstacle, so getting it wrong costs tempo not your run.
- **The Market** — grind rails run along a lane. Land on one and you lock to
  it, riding above barrier height and earning charge per second. Run into one
  on the ground and it is a wall. That is the bargain: it is only a shortcut
  if you commit to the jump.
- **The Sugar Flats** — the only zone where the road actually goes up and down.
  Gravity does the rest: you bleed speed climbing and get it back falling,
  swinging between 10.8 and 27 from the gradient alone. The camera aims at the
  road sixteen metres ahead *at that road's height*, so cresting a rise shows
  you the far side instead of the sky, and it samples the hill under **itself**
  rather than under the player, or on a slope it buries in the road.
- **The Arcade** — you are the ball. Every block becomes a bumper: hitting one
  throws you into a neighbouring lane and pays charge instead of taking it.
  A lone bump pays almost nothing, because bumpers sit in your path and
  incidental hits would carry a player who never engages; only the chain is
  worth anything. Measured: no chaining dies at 1990 m, chaining clears 2200.
- **The Bottling Plant** — belt lanes, mint with you and red syrup against
  you, colour and chevron direction the only cues. The middle lane is always
  the bad belt, because with green sometimes landing under the default line
  doing nothing was a winning strategy. Measured: staying central dies at
  218 m, seeking mint clears 2900.

**Checkpoint spacing is the real difficulty dial.** A RELAY refills to full,
so any drain-based mechanic is only as sharp as the distance between them. The
Arcade doubles the gap (`props.relayEvery`) or the chain is decorative: at the
normal 144 m a competent player clears it without ever chaining.

**Eleven mechanics need eleven explanations.** Stating a rule once, on a select
card, on a different screen, is the same as not stating it: the zones read as
arbitrary. Two things fix it, and both are cheap. A **zone card** drops in for
four seconds at the start of every run with the number, the name and the one
line of rule. And each verb is **named once, in a toast, the first time its
object comes into view** — JUMP THE WAVE, LAND ON THE RAIL, RIDE THE MINT
BELT. The card states the rule; the toast states it again with the thing on
screen, which is the only moment it is actually legible.

**Structure, not palette, is what makes a zone distinct.** The Bottling Plant
first shipped as a walled street with gantries, which is precisely what The
Core already is, in different colours. It is now a bottling line: three
separate belt decks with open grating between them, syrup pipes overhead,
bottle racks at the sides, no kerbs and no walls. If a zone can be described
with the same sentence as another zone, it is not a zone yet.

**Check that a zone's own mechanic is above its floor.** The Bottling Plant's
lane decks were built 0.34 tall while the conveyor surface sits at 0.18, so
every belt was buried inside the deck and the zone's single mechanic was
invisible. The decks are 0.1 now. Anything a zone is *about* has to be the
thing you cannot miss.

**Chrome plus a pink sky equals a pink post.** The syrup vats were tall thin
chrome cylinders, and a row of them read as a colonnade of plain pink poles
beside the track, not as machinery. They are squat now, wider than they are
tall, in toon with chrome bands and a lit window band. Proportion carries more
of a silhouette than material does: a vat is wide, a post is thin.

**Keep set dressing out of the play space.** The bottle racks sat just off the
kerb, which put a picket fence of upright shapes at the edge of vision: they
read as obstacles and then you sailed straight through them. Either something
is in the lane and solid, or it is well clear and obviously scenery.

**`Builder.at()` only rotates around Y, so a `cyl()` inside it stands up.**
This one shipped four separate times before it was hunted down properly:
"horizontal pipes" over the bottling line, deck "rollers", the drive rollers
at each end of every conveyor, the `pipe` gate in two zones, and the
Greenhouse's "fallen trunk". Each was a post planted in the lane whose
collision box was somewhere else entirely, so you walked through a solid-
looking object — which is exactly what it looks like when a game is broken.

**Use boxes for anything meant to lie down**, and when a visual bug turns up,
grep the whole codebase for the pattern rather than fixing the one instance in
front of you. The first three fixes here each addressed a real occurrence and
left the one the player was actually looking at.

**Palette is part of the brief, not decoration.** The Dunes shipped as a brown
desert and the Foundry as a rust industrial estate. Both were perfectly decent
and completely off-brief, and they are what made the game stop looking Y2K.
Pink sand under a mint sky is the same landform in the right language, and a
foundry became the factory the drink is made in.
- **The Docks** — the catwalk simply runs out. Gravity drops to 58% and top
  speed is capped at 30, which puts airtime at ~1.0 s and a jump at 18 to 30 m
  against 48 m between gaps. The first pass used 0.42 gravity with no speed
  cap: 1.31 s of airtime and 57 m per jump, longer than a whole 48 m chunk, so
  you could not choose where you landed and a second gap in the same chunk was
  unavoidable. It was not hard, it was impossible. One gap per chunk now.
- **The Greenhouse** — hedges span every lane and stand 3.2 m, above a normal
  jump apex of 2.65 m. The only way through is the bloom pad nine metres
  before, which boosts you to a 4.4 m arc, and a string of CELLS rides that
  arc. So the pad is both the only route and the only fuel. A pad that is
  merely fun to touch is a decoration; this one you cannot skip.
- **The Heights** — whole lane panels of the bridge are missing. The deck is
  built as three lane strips rather than one slab, so a hole is a hole you can
  see through. They are long enough that jumping is not on the table: the
  answer is always "be in a lane that still exists". Standing still costs 19
  falls in two minutes.
- **The Vault** — **you fly.** No gravity and no floor to stand on: up and down
  pick one of three altitudes instead of jumping and sliding, so a sealed tube
  becomes a 3×3 grid of lanes and altitudes without teaching a single new
  control. Hazard panels close individual cells, hoops hang on others, and
  CELLS ride the altitude a hoop sits at. It is the only zone where the
  vertical axis is a position rather than an event.

  `props.flight` switches the player's whole vertical model (`Player.flying`),
  and flight zones carry their own patterns in `FLIGHT_PATTERNS`, since a
  ground obstacle means nothing in a grid. The Mixamo flying clip drives her,
  banking into turns and pitching with the climb.
- **The Core** — starts at 25 and tops out at 54 with a steeper ramp, plus a
  light crosswind and the rails from The Market. Everything at once.

Zone rule changes live in `physics` on the zone config (`gravityScale`,
`jumpScale`, `wind`, `startSpeed`, `maxSpeed`, `speedRamp`) and are applied in
`Game.setZone`, so a new zone never means touching the player or the loop.

Feature layouts are authored per zone in `world/chunks.js` for the same reason
the obstacle phrases are: a swell you cannot see coming, or a rail that starts
under a gate, is not difficulty, it is a bug the player blames themselves for.
Obstacles that would conflict with a feature are dropped at build time.

**Bloom gotcha worth remembering.** The first pass built rails from chrome.
A twenty-metre polished bar running to the horizon mirrors the whole
environment map, and the bloom turned that into a sheet of gold across the
entire zone. Rendering once with the bloom pass disabled proved the geometry
was fine and the post was the problem. Long thin props in the play space are
matte now.

## Not done yet

- Ghost replay and the Daily Run leaderboard.
- Moving obstacles. Everything is baked into the chunk mesh, so nothing can
  slide across lanes yet. That is the next mechanic the engine cannot express.
- Never tested on a real phone. Everything so far is a desktop browser at a
  mobile viewport, so touch latency and sustained frame rate on low-end
  Android are unverified.
- Balance is measured with a scripted pilot, never by a human. Zone lengths in
  particular are a guess.
- Capacitor wrapper for the Play Store, plus a pass on asset budgets for
  low-end Android.
- Confirm the Suno commercial licence covers distribution before publishing.
- The courier has no skeleton, so she glides without a leg cycle. That fits
  hover rollers, but a rigged version would allow a proper crash reaction.

## Dev capture

`vite.config.js` adds a dev-only `/__shot` endpoint. In the browser console:

```js
__soda.capture('name', { w: 1200, h: 700 })
```

writes `shots/name.png`. Reading a live WebGL canvas back through an automation
bridge stalls; this sidesteps it.
