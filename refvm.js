// Reference VM in JS — executes the proto tree to validate the compiler.
const {OP,compileProgram}=require('./compiler');
const {lex,parse}=require('./frontend');

function isTruthy(v){return !(v===null||v===undefined||v===false);}

function makeClosure(proto,upvals){return {__closure:true,proto,upvals};}

function run(proto, output){
  // Each upvalue is a cell {v:...} so closures share mutable state.
  function callClosure(cl,args){
    const p=cl.proto;
    const slots=new Array(p.maxslot).fill(null);
    for(let i=0;i<p.nparams;i++)slots[i]={v: i<args.length?args[i]:null};
    // ensure every slot is a cell (for upvalue capture of locals)
    for(let i=0;i<slots.length;i++)if(slots[i]===null)slots[i]={v:null};
    const code=p.code, K=p.consts, ups=cl.upvals, protos=p.protos;
    const st=[];let pc=0,guard=0;
    const push=v=>st.push(v),pop=()=>st.pop();
    while(true){
      if(++guard>5e6)throw new Error('runaway');
      const op=code[pc++];
      switch(op){
        case OP.PUSHK: push(K[code[pc++]]);break;
        case OP.PUSHNIL: push(null);break;
        case OP.PUSHT: push(true);break;
        case OP.PUSHF: push(false);break;
        case OP.GETL: push(slots[code[pc++]].v);break;
        case OP.SETL: slots[code[pc++]].v=pop();break;
        case OP.GETUP: push(ups[code[pc++]].v);break;
        case OP.SETUP: ups[code[pc++]].v=pop();break;
        case OP.NEWTBL: push({__table:true,hash:new Map(),arr:[]});break;
        case OP.GETIDX:{const k=pop();const t=pop();push(tget(t,k));break;}
        case OP.SETIDX:{const v=pop();const k=pop();const t=st[st.length-1];tset(t,k,v);break;}
        case OP.SETARR:{const idx=code[pc++];const v=pop();const t=st[st.length-1];t.arr[idx-1]=v;break;}
        case OP.ADD:{const b=pop(),a=pop();push(a+b);break;}
        case OP.SUB:{const b=pop(),a=pop();push(a-b);break;}
        case OP.MUL:{const b=pop(),a=pop();push(a*b);break;}
        case OP.DIV:{const b=pop(),a=pop();push(a/b);break;}
        case OP.MOD:{const b=pop(),a=pop();push(a%b);break;}
        case OP.CONCAT:{const b=pop(),a=pop();push(luaStr(a)+luaStr(b));break;}
        case OP.LEN:{const a=pop();push(a&&a.__table?a.arr.length:String(a).length);break;}
        case OP.NEG:push(-pop());break;
        case OP.NOT:push(!isTruthy(pop()));break;
        case OP.EQ:{const b=pop(),a=pop();push(a===b);break;}
        case OP.NE:{const b=pop(),a=pop();push(a!==b);break;}
        case OP.LT:{const b=pop(),a=pop();push(a<b);break;}
        case OP.GT:{const b=pop(),a=pop();push(a>b);break;}
        case OP.LE:{const b=pop(),a=pop();push(a<=b);break;}
        case OP.GE:{const b=pop(),a=pop();push(a>=b);break;}
        case OP.JMP:pc=code[pc];break;
        case OP.JZ:{const t=code[pc++];if(!isTruthy(st[st.length-1]))pc=t;break;}
        case OP.CLOSURE:{
          const cp=protos[code[pc++]];
          const newups=cp.upvals.map(u=> u.fromParentLocal ? slots[u.index] : ups[u.index]);
          push(makeClosure(cp,newups));break;
        }
        case OP.CALL:{
          const n=code[pc++];const args=[];for(let i=0;i<n;i++)args.unshift(pop());
          const fn=pop();
          if(fn&&fn.__closure){push(callClosure(fn,args));}
          else throw new Error('attempt to call non-function');
          break;
        }
        case OP.RET:return pop();
        case OP.POP:pop();break;
        case OP.PRINT:output.push(luaStr(pop()));break;
        case OP.HALT:return null;
        default:throw new Error('bad op '+op+' @'+(pc-1));
      }
    }
  }
  function tget(t,k){if(!t||!t.__table)return null;if(typeof k==='number'&&k>=1&&k<=t.arr.length)return t.arr[k-1];const r=t.hash.get(k);return r===undefined?null:r;}
  function tset(t,k,v){if(!t||!t.__table)return;if(typeof k==='number'&&k>=1&&k<=t.arr.length+1){t.arr[k-1]=v;return;}t.hash.set(k,v);}
  function luaStr(v){if(v===null||v===undefined)return'nil';if(v===true)return'true';if(v===false)return'false';if(v&&v.__table)return'table';if(v&&v.__closure)return'function';return String(v);}

  const main=makeClosure(proto,[]);
  return callClosure(main,[]);
}

function exec(src){const out=[];run(compileProgram(parse(lex(src))),out);return out;}

module.exports={exec};

if(require.main===module){
  const tests=[
    [`local x=2 local y=3 print(x+y*4)`, '14'],
    [`local function add(a,b) return a+b end print(add(10,20))`, '30'],
    [`local function mk(n) return function() return n*n end end local f=mk(7) print(f())`, '49'],
    [`local t={10,20,30} print(t[2]) print(#t)`, '20|3'],
    [`local t={} t.name="kit" t["age"]=5 print(t.name) print(t.age)`, 'kit|5'],
    [`local function fib(n) if n<2 then return n end return fib(n-1)+fib(n-2) end print(fib(10))`, '55'],
    [`local s="he".."llo" print(s) print(#s)`, 'hello|5'],
    [`local c=0 local function inc() c=c+1 return c end print(inc()) print(inc()) print(inc())`, '1|2|3'],
    [`local n=5 local f=1 while n>0 do f=f*n n=n-1 end print(f)`, '120'],
    [`local x=10 if x>5 then print("big") elseif x>0 then print("small") else print("neg") end`, 'big'],
    [`print(true and 1 or 2) print(false and 1 or 2) print(nil or 9)`, '1|2|9'],
  ];
  let ok=0;
  tests.forEach(([src,exp],i)=>{
    try{const got=exec(src).join('|');const pass=got===exp;ok+=pass?1:0;
      console.log(`T${i+1} ${pass?'PASS':'FAIL'}  got[${got}] exp[${exp}]`);
    }catch(e){console.log(`T${i+1} ERROR ${e.message}`);}
  });
  console.log(`\n${ok}/${tests.length} passed`);
}
