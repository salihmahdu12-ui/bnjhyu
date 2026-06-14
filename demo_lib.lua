-- sample "commercial library" with varied features
local Vector = {}

function Vector.new(x, y)
  return { x = x, y = y }
end

function Vector.add(a, b)
  return Vector.new(a.x + b.x, a.y + b.y)
end

function Vector.length(v)
  return math.sqrt(v.x * v.x + v.y * v.y)
end

local function reduce(t, fn, init)
  local acc = init
  for _, v in ipairs(t) do
    acc = fn(acc, v)
  end
  return acc
end

local v1 = Vector.new(3, 4)
print(Vector.length(v1))

local v2 = Vector.add(v1, Vector.new(1, 1))
print(v2.x)
print(v2.y)

local total = reduce({10, 20, 30, 40}, function(a, b) return a + b end, 0)
print(total)

local function stats(...)
  local n = 0
  local sum = 0
  for _, x in ipairs({...}) do
    n = n + 1
    sum = sum + x
  end
  return n, sum, sum / n
end

local count, s, avg = stats(2, 4, 6, 8)
print(count)
print(s)
print(avg)

print(string.format("Library %s ready", "v2"))
