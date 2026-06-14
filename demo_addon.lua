-- sample "commercial library" style code
local function makeCounter(start)
  local n = start
  return function()
    n = n + 1
    return n
  end
end

local function sum(t)
  local s = 0
  for i = 1, #t do
    s = s + t[i]
  end
  return s
end

local nextId = makeCounter(100)
print(nextId())
print(nextId())

local scores = {10, 25, 30, 5}
print(sum(scores))

local cfg = {}
cfg.version = "2.1"
cfg.maxUsers = 50
print(cfg.version)
print(cfg.maxUsers * 2)
