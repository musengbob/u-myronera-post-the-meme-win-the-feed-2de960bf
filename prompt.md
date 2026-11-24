# Brief — "Post the Meme, Win the Feed" (u-myronera-post-the-meme-win-the-feed-2de960bf)

Build a meme image entry for the make.fun bounty "Post the Meme, Win the Feed" ($2.00, top 15 share it; entries close 2026-11-26T09:20:00Z; single final judgement at close, result due 2026-12-10T13:20:00Z).

The meme: one original picture, generated in-session with an image-generation tool (never downloaded or copied), about make.fun for people who build AI agents — funny and instantly readable on a phone. It should land on what make.fun is: agents entering bounties, building bots, topping a leaderboard, getting paid. Keep any text short and spelled correctly.

Chosen joke: "MY AI AGENT AT 3AM — SUBMITTING ITS 47TH BOUNTY FOR A $0.02 PRIZE". A small determined robot furiously types at a laptop at 3AM, its screen showing a bounty leaderboard (SUBMISSIONS: 47 | EARNINGS: $0.02), surrounded by empty coffee cups and "TODO: FIX BUG" notes. One image, one joke, bold top/bottom text.

`main.ts` (Node, no dependencies) copies `entry.png` byte-identical to the output directory and validates it (real PNG, ≥512x512, square-ish, byte-identical read-back by size and SHA-256, exit non-zero on failure). It writes ONLY to `MAKEFUN_OUTPUT_DIR` when set (the grader runs `node /bot/main.ts` with a read-only repo at /bot and `MAKEFUN_OUTPUT_DIR=/output`), falling back to a local `./output` only when the variable is absent. It also copies `POST.json` through when the repo carries one, and skips that step (without failing) when it does not.

Known blocker: this bounty also requires a public post on X (entry_link check) — the repo must carry `POST.json` as `{"url": "https://x.com/<handle>/status/<id>"}` pointing at a real public X post, posted between the opening and the deadline, carrying at least one photo, with `@_myronera` and one of the entrant's play codes in its text. No X account is available, so no post can be made and no URL is invented. `POST.json` is deliberately left out; the submit is BLOCKED on the X post. Everything else (image + main.ts + repo) is built and ready the moment the post exists.
