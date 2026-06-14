-- ============================================================
-- AUTO-GENERATED ENCRYPTED VM PAYLOAD  (private build)
-- Source protected via custom bytecode VM + rolling-XOR + string enc.
-- ============================================================
local P={cs=0,cm=5,c={80,5,31,15,68,24,11,34,60,45,34,55,109,64,83,73,68,87,11,95,4,125,108,34,120,29,154,151,141,138,151,139,162,190,168,191,183,162,189,211,204,214,214,194,223,245,231,255,243,164,251,159,28,28,10,7,28,13,39,55,42,43,101,47,68,85,77,95,92,67,13,119,108,125,119,110,28,149,130,155,151,140,138,150,134,201,191,225},k={{n=100},{n=10},{n=25},{n=30},{n=5},{s=1,k1=0,k2=7,d={118,98,124,102,117,76,68}},{s=1,k1=0,k2=7,d={50,41,63}},{s=1,k1=0,k2=5,d={109,100,114,90,103,124,108,80}},{n=50},{n=2}},u={},np=0,ms=5,p={{cs=64,cm=3,c={84,67,83,72,28,79,0,68,10},k={},u={},np=1,ms=2,p={{cs=0,cm=5,c={22,5,26,15,52,14,30,53,40,127,35,101},k={{n=1}},u={{p=1,i=1}},np=0,ms=0,p={}}}},{cs=0,cm=29,c={16,29,47,86,100,144,187,201,252,5,4,42,95,105,151,166,212,249,8,51,71,85,63,176,172,212,230,15,56,75,127,163,181,188,206,245,0,53,110,126,138,229,211,203,253,75,39,1},k={{n=0},{n=1}},u={},np=1,ms=5,p={}}}}

local band=function(a,b) local r,bit=0,1 while a>0 or b>0 do if (a%2)+(b%2)==2 then r=r+bit end a=math.floor(a/2) b=math.floor(b/2) bit=bit*2 end return r end
local function bxor(a,b) local r,bit=0,1 while a>0 or b>0 do local x,y=a%2,b%2 if x~=y then r=r+bit end a=(a-x)/2 b=(b-y)/2 bit=bit*2 end return r end

-- decode encrypted code stream byte at 0-indexed position pos
local function dcode(proto,pos) local k=(proto.cs+pos*proto.cm)%256 return bxor(proto.c[pos+1],k)%256 end

-- decode a string constant cell -> Lua string
local function dstr(cell) local t={} for n=0,#cell.d-1 do local k=(cell.k1+n*cell.k2)%256 t[#t+1]=string.char(bxor(cell.d[n+1],k)%256) end return table.concat(t) end

-- resolve a constant cell -> value
local function kval(cell) if cell.n~=nil then return cell.n elseif cell.s==1 then return dstr(cell) end return nil end

local function truthy(v) return not(v==nil or v==false) end
local function lstr(v) if v==nil then return "nil" elseif v==true then return "true" elseif v==false then return "false" elseif type(v)=="table" then if v.__tbl then return "table" elseif v.__cls then return "function" end return "table" else return tostring(v) end end

local function tget(t,k) if type(t)~="table" then return nil end if type(k)=="number" and k>=1 and k<=#t.arr then return t.arr[k] end local r=t.hash[k] return r end
local function tset(t,k,v) if type(t)~="table" then return end if type(k)=="number" and k>=1 and k<=#t.arr+1 then t.arr[k]=v return end t.hash[k]=v end

local callClosure
callClosure=function(cl,args)
  local p=cl.proto
  local slots={} for i=1,p.ms do slots[i]={v=nil} end
  for i=1,p.np do slots[i].v=args[i] end
  local ups=cl.ups
  local st={} local sp=0
  local pc=0
  local function push(v) sp=sp+1 st[sp]=v end
  local function pop() local v=st[sp] st[sp]=nil sp=sp-1 return v end
  while true do
    local op=dcode(p,pc) pc=pc+1
    if op==0x7F then return nil
    elseif op==0x10 then local i=dcode(p,pc) pc=pc+1 push(kval(p.k[i+1]))
    elseif op==0x11 then push(nil)
    elseif op==0x12 then push(true)
    elseif op==0x13 then push(false)
    elseif op==0x14 then local s=dcode(p,pc) pc=pc+1 push(slots[s+1].v)
    elseif op==0x15 then local s=dcode(p,pc) pc=pc+1 slots[s+1].v=pop()
    elseif op==0x16 then local u=dcode(p,pc) pc=pc+1 push(ups[u+1].v)
    elseif op==0x17 then local u=dcode(p,pc) pc=pc+1 ups[u+1].v=pop()
    elseif op==0x18 then push({__tbl=true,hash={},arr={}})
    elseif op==0x19 then local k=pop() local t=pop() push(tget(t,k))
    elseif op==0x1A then local v=pop() local k=pop() local t=st[sp] tset(t,k,v)
    elseif op==0x1B then local idx=dcode(p,pc) pc=pc+1 local v=pop() local t=st[sp] t.arr[idx]=v
    elseif op==0x20 then local b=pop() local a=pop() push(a+b)
    elseif op==0x21 then local b=pop() local a=pop() push(a-b)
    elseif op==0x22 then local b=pop() local a=pop() push(a*b)
    elseif op==0x23 then local b=pop() local a=pop() push(a/b)
    elseif op==0x24 then local b=pop() local a=pop() push(a%b)
    elseif op==0x25 then local b=pop() local a=pop() push(lstr(a)..lstr(b))
    elseif op==0x26 then local a=pop() if type(a)=="table" then push(#a.arr) else push(#tostring(a)) end
    elseif op==0x27 then push(-pop())
    elseif op==0x30 then local b=pop() local a=pop() push(a==b)
    elseif op==0x31 then local b=pop() local a=pop() push(a~=b)
    elseif op==0x32 then local b=pop() local a=pop() push(a<b)
    elseif op==0x33 then local b=pop() local a=pop() push(a>b)
    elseif op==0x34 then local b=pop() local a=pop() push(a<=b)
    elseif op==0x35 then local b=pop() local a=pop() push(a>=b)
    elseif op==0x36 then push(not truthy(pop()))
    elseif op==0x40 then pc=dcode(p,pc)
    elseif op==0x41 then local t=dcode(p,pc) pc=pc+1 if not truthy(st[sp]) then pc=t end
    elseif op==0x50 then local pi=dcode(p,pc) pc=pc+1 local cp=p.p[pi+1]
      local newups={} for j=1,#cp.u do local ud=cp.u[j] if ud.p==1 then newups[j]=slots[ud.i+1] else newups[j]=ups[ud.i+1] end end
      push({__cls=true,proto=cp,ups=newups})
    elseif op==0x51 then local n=dcode(p,pc) pc=pc+1 local args={} for j=n,1,-1 do args[j]=pop() end local fn=pop()
      if type(fn)=="table" and fn.__cls then push(callClosure(fn,args)) else error("call non-function") end
    elseif op==0x52 then return pop()
    elseif op==0x53 then pop()
    elseif op==0x60 then print(lstr(pop()))
    else error("bad opcode "..op.." @ "..(pc-1)) end
  end
end

local main={__cls=true,proto=P,ups={}}
callClosure(main,{})
