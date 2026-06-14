# Private Lua VM Obfuscator + Discord Bot

A **private, ID-locked** tool to protect the source of **your own** Lua libraries
and game addons before you distribute them. Built as a real compiler pipeline.

## Pipeline
1. **frontend.js** — lexer + Pratt parser for a mini-Lua (numbers, strings,
   booleans, nil, locals, arithmetic/comparison/logical ops, `if/elseif/else`,
   `while`, numeric `for`, tables `{}`, indexing `t.k` / `t[k]`, functions,
   anonymous functions, **closures with upvalues**, calls, `return`, concat `..`,
   length `#`).
2. **compiler.js** — compiles the AST to a tree of function **protos**, each with
   its own custom **OpCodes**, constant pool, upvalue descriptors, and sub-protos.
3. **emit.js** — serializes the proto tree into a self-contained Lua file with:
   - **rolling-XOR encrypted bytecode** (key = `(seed + pos*mult) mod 256`, fresh per proto)
   - **encrypted string constants** (each string gets its own rolling key)
   - a Lua **VM run-loop** (the big `if/elseif` chain *is* the OpCode dispatcher)
4. **bot.js** — Discord bot, **locked to your admin Discord ID**. Anyone else is
   ignored. You DM it (or post in a channel it can see) a `.lua` file; it replies
   with the `.obf.lua` build.

## Run the tests
These compile sample programs, run them in a JS reference VM **and** under real
Lua 5.4, and check outputs:
```
npm test
```

## Build one file by hand
```
node emit.js myscript.lua    # writes out.lua
```

## Run the bot
```
npm install
DISCORD_TOKEN=your_token ADMIN_ID=your_discord_id node bot.js
```
- Get your Discord user ID: enable Developer Mode in Discord, right-click your
  name → Copy User ID.
- In the Discord Developer Portal, enable the **MESSAGE CONTENT INTENT** for the bot.

## Deploy on Railway
1. Push this folder to a GitHub repo.
2. On Railway: New Project → Deploy from GitHub repo.
3. Add Variables: `DISCORD_TOKEN` and `ADMIN_ID`.
4. Set the start command to `node bot.js` (Railway reads `package.json` too).
5. Deploy. Check logs for "Logged in as ... Admin-locked to ID ...".

## Honest limitations (so you can plan)
- This implements a **large subset** of Lua, not 100% of it. Not yet supported:
  metatables, varargs `...` at runtime, multiple return values, `for ... in pairs`,
  goto, coroutines, and the standard library (`string`, `table`, `math`, etc.).
  The architecture extends to these — each needs new opcodes + VM cases.
- A single-layer stack VM raises the bar against casual source theft but is not
  unbreakable; someone who instruments the dispatch loop can recover logic.
  Commercial tools layer on extra passes; this gives you the core to build on.
