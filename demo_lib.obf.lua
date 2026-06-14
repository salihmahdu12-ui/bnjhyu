-- ============================================================
-- AUTO-GENERATED HARDENED VM PAYLOAD (private build)
-- Protections: custom bytecode VM, rolling-XOR code, per-string
-- encryption, per-build opcode remapping, integrity checksum.
-- Editing this file changes the checksum and it will refuse to run.
-- ============================================================
local P={cs=194,cm=12,c={242,138,218,177,242,133,10,67,34,106,59,17,82,37,106,33,131,160,226,241,178,197,203,131,227,170,248,81,18,101,43,97,64,96,34,49,114,5,136,195,160,234,185,145,210,165,232,161,1,32,98,115,49,122,78,1,98,21,122,175,233,157,209,178,168,204,219,162,247,141,15,65,34,85,56,111,5,91,0,119,131,228,155,166,229,190,177,215,203,185,255,81,18,101,42,31,57,72,33,96,24,124,139,252,160,175,254,192,161,219,189,240,121,9,51,76,51,62,57,83,53,104,1,142,187,244,171,182,149,202,234,157,251,177,11,109,40,97,56,61,89,17,105,13,142,193,158,243,182,197,199,188,225,239,190,1,97,27,125,49,40,79,90,51,119,58,130,193,170,213,180,189,214,165,229,141,18,100,30,37,118,53,14,92,38,103,9,131,197,151,192,183,194,189,223,177,248,148,11,22,81,43,109,77,56,95,106,5,135,253,139,221,160,151,177,197,153,250,144,4,19,116,43,54,25,78},k={{s=1,k1=16,k2=16,d={126,69,71}},{s=1,k1=14,k2=20,d={111,70,82}},{s=1,k1=60,k2=12,d={80,45,58,7,24,16}},{n=3},{n=4},{s=1,k1=26,k2=22,d={106,66,47,50,6}},{n=1},{s=1,k1=40,k2=26,d={80}},{s=1,k1=230,k2=24,d={159}},{n=10},{n=20},{n=30},{n=40},{n=0},{n=2},{n=6},{n=8},{s=1,k1=212,k2=14,d={167,150,130,151,98,125}},{s=1,k1=114,k2=8,d={20,21,240,231,243,238}},{s=1,k1=64,k2=18,d={12,59,6,4,233,232,213,158,245,145,212,116,125,75,88,55}},{s=1,k1=190,k2=10,d={200,250}}},u={},np=0,va=1,ms=12,p={{cs=108,cm=30,c={92,241,168,145,228,44,91,63,11,123,182,237,213,169,16},k={{s=1,k1=202,k2=18,d={178}},{s=1,k1=88,k2=20,d={33}}},u={},np=2,va=0,ms=2,p={}},{cs=150,cm=20,c={187,170,197,210,207,173,14,89,55,99,9,115,253,155,135,158,129,234,133,16,15,109,79,25,116,163,194,216,196,219,181,3,77,42},k={{s=1,k1=4,k2=28,d={106,69,75}},{s=1,k1=34,k2=22,d={90}},{s=1,k1=112,k2=6,d={9}}},u={{p=1,i=0}},np=2,va=0,ms=2,p={}},{cs=110,cm=30,c={29,140,209,201,207,83,34,59,92,85,205,184,173,246,59,10,25,108,241,171,239,179,2,91,61,117,64,196,220,213,243,75,47,23,106},k={{s=1,k1=156,k2=10,d={241,199,196,210}},{s=1,k1=122,k2=28,d={9,231,192,186}},{s=1,k1=136,k2=30,d={240}},{s=1,k1=70,k2=32,d={63}}},u={},np=1,va=0,ms=1,p={}},{cs=52,cm=24,c={99,78,32,127,231,172,147,220,158,13,39,120,82,40,129,216,176,155,224,171,17,123,66,54,118,142,224,180,144,235,83,27,44,56,104,90,171,151,147,219,176,10,115,61,3,111,211,148,222,206,229,184,29,123,77,24,119,179,181,235,215,183,5,71,52},k={{s=1,k1=210,k2=16,d={187,146,147,107,96,81}}},u={},np=3,va=0,ms=10,p={}},{cs=160,cm=26,c={247,186,131,239,84,121,61,13,112},k={},u={},np=2,va=0,ms=2,p={}},{cs=30,cm=8,c={101,38,106,54,69,70,10,87,45,103,89,28,127,133,202,146,218,165,234,180,233,196,153,213,137,226,132,244,252,66,8,82,27,113,43,46,74,74,103,105,27,49,107,50,122,209,142,237,156,250,234,177,233,193,138,214,137,231,185,240,162,66,6,65,22,98,47,9,42,17,78,1,95,49,111,33,126,237,213,149,197,166},k={{n=0},{s=1,k1=204,k2=8,d={165,164,189,141,158,135}},{n=1}},u={},np=0,va=1,ms=9,p={}}}}
local CHK=7887705

local function bxor(a,b) local r,bit=0,1 while a>0 or b>0 do local x,y=a%2,b%2 if x~=y then r=r+bit end a=(a-x)/2 b=(b-y)/2 bit=bit*2 end return r end

local function serialize(v)
  local t=type(v)
  if t=="number" then if v==math.floor(v) then return string.format("%d",v) else return tostring(v) end
  elseif t=="string" then return v
  elseif t=="boolean" then return v and "true" or "false"
  elseif t=="table" then
    local keys={}
    for k in pairs(v) do keys[#keys+1]=k end
    table.sort(keys,function(a,b)
      local ta=(type(a)=="number") and 0 or 1
      local tb=(type(b)=="number") and 0 or 1
      if ta==tb then if ta==0 then return a<b else return tostring(a)<tostring(b) end end
      return ta<tb
    end)
    local parts={}
    for _,k in ipairs(keys) do parts[#parts+1]=tostring(k).."="..serialize(v[k]) end
    return "{"..table.concat(parts,",").."}"
  end
  return ""
end
local function checksum(s)
  local h=0x811c
  for i=1,#s do
    local b=string.byte(s,i)
    h=bxor(h,b)
    h=(h*16777619)%16777216
    h=(h+((i-1)*131))%16777216
  end
  return h%16777216
end
if checksum(serialize(P))~=CHK then error("integrity check failed: file was modified") end

-- physical opcode constants for this build:
local O_PUSHK=123 local O_PUSHNIL=24 local O_PUSHT=113 local O_PUSHF=86
local O_GETL=87 local O_SETL=68 local O_GETUP=45 local O_SETUP=98 local O_GETG=115
local O_NEWTBL=48 local O_GETIDX=41 local O_SETIDX=46 local O_SETARR=79
local O_ADD=92 local O_SUB=101 local O_MUL=58 local O_DIV=107 local O_MOD=72 local O_CONCAT=97 local O_LEN=6 local O_NEG=71
local O_EQ=116 local O_NE=29 local O_LT=18 local O_GT=99 local O_LE=96 local O_GE=25 local O_NOT=94
local O_JMP=63 local O_JZ=12
local O_CLOSURE=85 local O_CALL=106 local O_RET=91 local O_POP=120 local O_VARARG=81 local O_GETVARG=54 local O_PACKVARG=55
local O_PRINT=36 local O_HALT=13

local function dcode(p,pos) local k=(p.cs+pos*p.cm)%256 return bxor(p.c[pos+1],k)%256 end

local function truthy(v) return not(v==nil or v==false) end
local function lstr(v)
  if v==nil then return "nil" elseif v==true then return "true" elseif v==false then return "false"
  elseif type(v)=="table" then if v.__tbl then return "table" elseif v.__fn then return "function" else return "table" end
  else return tostring(v) end
end
local function newT() return {__tbl=true,hash={},arr={}} end
local function tget(t,k) if type(t)~="table" then return nil end if type(k)=="number" and k==math.floor(k) and k>=1 and k<=#t.arr then return t.arr[k] end return t.hash[k] end
local function tset(t,k,v) if type(t)~="table" then return end if type(k)=="number" and k==math.floor(k) and k>=1 and k<=#t.arr+1 then t.arr[k]=v return end if v==nil then t.hash[k]=nil else t.hash[k]=v end end

-- builtin globals
local G={}
local function nat(f) return {__fn=true,native=f} end
G.print=nat(function(a) local parts={} for i=1,#a do parts[i]=lstr(a[i]) end print(table.concat(parts,"	")) return {} end)
G.pairs=nat(function(a) local t=a[1] local keys={} for i=1,#t.arr do keys[#keys+1]=i end for k in pairs(t.hash) do keys[#keys+1]=k end local idx=0
  local it=nat(function() idx=idx+1 if idx>#keys then return {nil} end local k=keys[idx] return {k,tget(t,k)} end) return {it,t,nil} end)
G.ipairs=nat(function(a) local t=a[1]
  local it=nat(function(b) local i=(b[2] or 0)+1 local v=tget(t,i) if v==nil then return {nil} end return {i,v} end) return {it,t,0} end)
G.type=nat(function(a) local v=a[1] local t=type(v) if t=="table" then if v.__tbl then return {"table"} elseif v.__fn then return {"function"} end return {"table"} end return {t} end)
G.tostring=nat(function(a) return {lstr(a[1])} end)
G.tonumber=nat(function(a) return {tonumber(a[1])} end)
local Sl={} G.string={__tbl=true,hash=Sl,arr={}}
Sl.upper=nat(function(a) return {string.upper(a[1])} end)
Sl.lower=nat(function(a) return {string.lower(a[1])} end)
Sl.len=nat(function(a) return {#a[1]} end)
Sl.sub=nat(function(a) return {string.sub(a[1],a[2],a[3])} end)
Sl.rep=nat(function(a) return {string.rep(a[1],a[2])} end)
Sl.reverse=nat(function(a) return {string.reverse(a[1])} end)
Sl.byte=nat(function(a) return {string.byte(a[1],a[2] or 1)} end)
Sl.char=nat(function(a) return {string.char(table.unpack(a))} end)
Sl.format=nat(function(a) return {string.format(table.unpack(a))} end)
local Tl={} G.table={__tbl=true,hash=Tl,arr={}}
Tl.insert=nat(function(a) local t=a[1] if #a>=3 then table.insert(t.arr,a[2],a[3]) else table.insert(t.arr,a[2]) end return {} end)
Tl.remove=nat(function(a) local t=a[1] local pos=a[2] or #t.arr local v if pos>=1 and pos<=#t.arr then v=table.remove(t.arr,pos) end return {v} end)
Tl.concat=nat(function(a) local t=a[1] local sep=a[2] or "" local parts={} for i=1,#t.arr do parts[i]=lstr(t.arr[i]) end return {table.concat(parts,sep)} end)
local Ml={} G.math={__tbl=true,hash=Ml,arr={}}
Ml.floor=nat(function(a) return {math.floor(a[1])} end)
Ml.ceil=nat(function(a) return {math.ceil(a[1])} end)
Ml.abs=nat(function(a) return {math.abs(a[1])} end)
Ml.max=nat(function(a) return {math.max(table.unpack(a))} end)
Ml.min=nat(function(a) return {math.min(table.unpack(a))} end)
Ml.sqrt=nat(function(a) return {math.sqrt(a[1])} end)
Ml.pi=math.pi
Ml.random=nat(function(a) if #a==0 then return {math.random()} elseif #a==1 then return {math.random(a[1])} else return {math.random(a[1],a[2])} end end)

local callValue
local function callClosure(cl,args)
  local p=cl.proto
  local slots={} for i=1,p.ms do slots[i]={v=nil} end
  for i=1,p.np do slots[i].v=args[i] end
  local varargs={} if p.va==1 then for i=p.np+1,#args do varargs[#varargs+1]=args[i] end end
  local ups=cl.ups
  local st={} local sp=0
  local pc=0
  local function push(v) sp=sp+1 st[sp]=v end
  local function pop() local v=st[sp] st[sp]=nil sp=sp-1 return v end
  while true do
    local op=dcode(p,pc) pc=pc+1
    if op==O_HALT then return {}
    elseif op==O_PUSHK then local i=dcode(p,pc) pc=pc+1 local cell=p.k[i+1] if cell.n~=nil then push(cell.n) elseif cell.s==1 then local t={} for n=0,#cell.d-1 do local kk=(cell.k1+n*cell.k2)%256 t[#t+1]=string.char(bxor(cell.d[n+1],kk)%256) end push(table.concat(t)) else push(nil) end
    elseif op==O_PUSHNIL then push(nil)
    elseif op==O_PUSHT then push(true)
    elseif op==O_PUSHF then push(false)
    elseif op==O_GETL then local s=dcode(p,pc) pc=pc+1 push(slots[s+1].v)
    elseif op==O_SETL then local s=dcode(p,pc) pc=pc+1 slots[s+1].v=pop()
    elseif op==O_GETUP then local u=dcode(p,pc) pc=pc+1 push(ups[u+1].v)
    elseif op==O_SETUP then local u=dcode(p,pc) pc=pc+1 ups[u+1].v=pop()
    elseif op==O_GETG then local i=dcode(p,pc) pc=pc+1 local cell=p.k[i+1] local name if cell.s==1 then local t={} for n=0,#cell.d-1 do local kk=(cell.k1+n*cell.k2)%256 t[#t+1]=string.char(bxor(cell.d[n+1],kk)%256) end name=table.concat(t) else name=cell.n end push(G[name])
    elseif op==O_NEWTBL then push(newT())
    elseif op==O_GETIDX then local k=pop() local t=pop() push(tget(t,k))
    elseif op==O_SETIDX then local v=pop() local k=pop() local t=st[sp] tset(t,k,v)
    elseif op==O_SETARR then local idx=dcode(p,pc) pc=pc+1 local v=pop() local t=st[sp] t.arr[idx]=v
    elseif op==O_ADD then local b=pop() local a=pop() push(a+b)
    elseif op==O_SUB then local b=pop() local a=pop() push(a-b)
    elseif op==O_MUL then local b=pop() local a=pop() push(a*b)
    elseif op==O_DIV then local b=pop() local a=pop() push(a/b)
    elseif op==O_MOD then local b=pop() local a=pop() push(a-math.floor(a/b)*b)
    elseif op==O_CONCAT then local b=pop() local a=pop() push(lstr(a)..lstr(b))
    elseif op==O_LEN then local a=pop() if type(a)=="table" then push(#a.arr) else push(#tostring(a)) end
    elseif op==O_NEG then push(-pop())
    elseif op==O_EQ then local b=pop() local a=pop() push(a==b)
    elseif op==O_NE then local b=pop() local a=pop() push(a~=b)
    elseif op==O_LT then local b=pop() local a=pop() push(a<b)
    elseif op==O_GT then local b=pop() local a=pop() push(a>b)
    elseif op==O_LE then local b=pop() local a=pop() push(a<=b)
    elseif op==O_GE then local b=pop() local a=pop() push(a>=b)
    elseif op==O_NOT then push(not truthy(pop()))
    elseif op==O_JMP then pc=dcode(p,pc)
    elseif op==O_JZ then local t=dcode(p,pc) pc=pc+1 if not truthy(st[sp]) then pc=t end
    elseif op==O_CLOSURE then local pi=dcode(p,pc) pc=pc+1 local cp=p.p[pi+1] local nu={} for j=1,#cp.u do local ud=cp.u[j] if ud.p==1 then nu[j]=slots[ud.i+1] else nu[j]=ups[ud.i+1] end end push({__fn=true,proto=cp,ups=nu})
    elseif op==O_CALL then local nargs=dcode(p,pc) pc=pc+1 local want=dcode(p,pc) pc=pc+1 local args={} for j=nargs,1,-1 do args[j]=pop() end local fn=pop() local res=callValue(fn,args) if want==0 then elseif want==255 then for _,r in ipairs(res) do push(r) end else for j=1,want do push(res[j]) end end
    elseif op==O_RET then local nret=dcode(p,pc) pc=pc+1 if nret==0 then return {} end local out={} for j=nret,1,-1 do out[j]=pop() end return out
    elseif op==O_POP then pop()
    elseif op==O_VARARG then if #varargs>0 then push(varargs[1]) else push(nil) end
    elseif op==O_GETVARG then local want=dcode(p,pc) pc=pc+1 if want==255 then for _,v in ipairs(varargs) do push(v) end elseif want==0 then else for j=1,want do push(varargs[j]) end end
    elseif op==O_PACKVARG then local t=newT() for i=1,#varargs do t.arr[i]=varargs[i] end push(t)
    elseif op==O_PRINT then print(lstr(pop()))
    else error("bad opcode "..op.." @ "..(pc-1)) end
  end
end
callValue=function(fn,args)
  if type(fn)=="table" and fn.__fn then
    if fn.native then return fn.native(args) end
    return callClosure(fn,args)
  end
  error("attempt to call a "..lstr(fn).." value")
end

local main={__fn=true,proto=P,ups={}}
callClosure(main,{})
