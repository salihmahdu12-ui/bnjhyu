# Private Lua VM Obfuscator (Pro) + Discord Bot

A **private, ID-locked** tool to protect the source of **your own** Lua libraries
and game addons before you sell/distribute them. Real compiler pipeline, tested
against actual Lua 5.4.

## What's new vs the basic version
- **Extended language**: multiple return values, varargs `...`, generic
  `for k,v in pairs/ipairs(t)`, `break`, method calls `obj:m()`, multi-assignment,
  and builtins for **`string`**, **`table`**, **`math`** (plus `pairs/ipairs/type/
  tostring/tonumber`).
- **Opcode polymorphism**: every build randomly remaps opcode bytes, so two
  builds of the same script have different instruction encodings.
- **Layered encryption**: rolling-XOR over the bytecode (fresh key per function)
  + independent rolling-XOR per string constant.
- **Integrity checksum (anti-tamper)**: the payload carries a checksum of itself;
  the VM recomputes it at startup and **refuses to run if a single byte was
  changed**. (Verified: flipping one byte -> "integrity check failed".)

## Files
- `frontend.js` — lexer + parser
- `compiler.js` — AST -> custom-opcode protos (closures, upvalues, multi-value calling convention)
- `refvm.js`   — JS reference VM (for fast testing; `node refvm.js`)
- `emit.js`    — emits the hardened, self-contained Lua VM (`node emit.js in.lua` -> out.lua)
- `bot.js`     — Discord bot, locked to your admin ID
- `runner.c`   — tiny C harness to run generated Lua against liblua (dev/testing only)

## Test it
```
npm test          # runs reference VM + generates programs and runs them under real Lua 5.4
```

## Build one file
```
node emit.js myscript.lua    # writes out.lua
```

## Run the bot
```
npm install
DISCORD_TOKEN=xxx ADMIN_ID=your_discord_user_id node bot.js
```
- Enable Developer Mode in Discord, right-click your name -> Copy User ID.
- In the Discord Developer Portal, enable **MESSAGE CONTENT INTENT**.
- **How to trigger obfuscation:** just upload a `.lua` file to the bot (DM or a
  channel it can see). No command needed. `!ping` / `!help` are optional helpers.
- Everyone except your `ADMIN_ID` is silently ignored.

## Deploy on Railway
1. Push this folder to GitHub.
2. Railway -> New Project -> Deploy from GitHub repo.
3. Variables: `DISCORD_TOKEN`, `ADMIN_ID`.
4. Start command: `node bot.js`.

## Honest limitations (so you can plan, not get surprised)
- This compiles a **large subset** of Lua, not all of it. Not yet supported:
  metatables/`setmetatable`, `goto`, coroutines, full pattern matching in
  `string.find/gmatch/gsub`, integer/float distinction edge cases, and the rest
  of the stdlib. The architecture extends to these (new opcodes / new builtins).
- **Control-flow flattening and dead-code insertion** are not yet separate AST
  passes here; the obfuscation strength comes from the custom VM + per-build
  opcode remapping + encryption. Adding a flattening pass and bogus basic blocks
  is the next increment and slots into `compiler.js`.
- **Security reality**: a single-layer stack VM with an integrity check raises the
  bar a lot against casual source theft and file edits, but a determined
  reverse-engineer who instruments the dispatch loop can still recover logic.
  The checksum stops *file tampering*, not *dynamic analysis*. Commercial tools
  layer many more passes; this gives you a real, working core to build on.
- The integrity check protects the **file**; by design it does **not** inspect or
  detect anything about the end user's machine or environment.
