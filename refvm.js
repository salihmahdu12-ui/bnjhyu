// Reference VM (JS) implementing multi-value calls + builtins.
const {OP,compileProgram}=require('./compiler');
const {lex,parse}=require('./frontend');

function truthy(v){return !(v===null||v===undefined||v===false);}
function luaStr(v){
  if(v===null||v===undefined)return'nil';
  if(v===true)return'true';if(v===false)return'false';
  if(typeof v==='object'){if(v.__table)return'table';if(v.__native||v.__closure)return'function';}
  if(typeof v==='number')return Number.isInteger(v)?String(v):String(v);
  return String(v);
}
function newTable(){return{__table:true,hash:new Map(),arr:[]};}
function tget(t,k){if(!t||!t.__table)return null;if(typeof k==='number'&&Number.isInteger(k)&&k>=1&&k<=t.arr.length)return t.arr[k-1];const r=t.hash.get(k);return r===undefined?null:r;}
function tset(t,k,v){if(!t||!t.__table)return;if(typeof k==='number'&&Number.isInteger(k)&&k>=1&&k<=t.arr.length+1){if(v===null&&k===t.arr.length){t.arr.pop();}else t.arr[k-1]=v;return;}if(v===null)t.hash.delete(k);else t.hash.set(k,v);}

function makeBuiltins(output){
  const B=newTable();
  const nat=(fn)=>({__native:true,fn});
  // print
  B.hash.set('print',nat((args)=>{output.push(args.map(luaStr).join('\t'));return[];}));
  // pairs / ipairs
  B.hash.set('pairs',nat((args)=>{
    const t=args[0];const keys=[];
    for(let i=0;i<t.arr.length;i++)keys.push(i+1);
    for(const k of t.hash.keys())keys.push(k);
    let idx=0;
    const iter=nat(()=>{if(idx>=keys.length)return[null];const k=keys[idx++];return[k,tget(t,k)];});
    return[iter,t,null];
  }));
  B.hash.set('ipairs',nat((args)=>{
    const t=args[0];
    const iter=nat((a)=>{const i=(a[1]||0)+1;const v=tget(t,i);if(v===null||v===undefined)return[null];return[i,v];});
    return[iter,t,0];
  }));
  B.hash.set('tostring',nat((args)=>[luaStr(args[0])]));
  B.hash.set('tonumber',nat((args)=>{const n=parseFloat(args[0]);return[isNaN(n)?null:n];}));
  B.hash.set('type',nat((args)=>{const v=args[0];let t='nil';if(typeof v==='number')t='number';else if(typeof v==='string')t='string';else if(v===true||v===false)t='boolean';else if(v&&v.__table)t='table';else if(v&&(v.__native||v.__closure))t='function';return[t];}));
  // string library
  const S=newTable();
  S.hash.set('len',nat(a=>[String(a[0]).length]));
  S.hash.set('upper',nat(a=>[String(a[0]).toUpperCase()]));
  S.hash.set('lower',nat(a=>[String(a[0]).toLowerCase()]));
  S.hash.set('sub',nat(a=>{const s=String(a[0]);let i=a[1],j=a[2]===undefined||a[2]===null?s.length:a[2];if(i<0)i=s.length+i+1;if(j<0)j=s.length+j+1;if(i<1)i=1;return[s.slice(i-1,j)];}));
  S.hash.set('rep',nat(a=>[String(a[0]).repeat(Math.max(0,a[1]|0))]));
  S.hash.set('reverse',nat(a=>[String(a[0]).split('').reverse().join('')]));
  S.hash.set('byte',nat(a=>{const s=String(a[0]);const i=a[1]||1;return[s.charCodeAt(i-1)];}));
  S.hash.set('char',nat(a=>[a.map(c=>String.fromCharCode(c)).join('')]));
  S.hash.set('format',nat(a=>{let f=String(a[0]);let i=1;f=f.replace(/%[difsxX%]/g,m=>{if(m==='%%')return'%';const v=a[i++];if(m==='%d'||m==='%i')return String(Math.floor(v));if(m==='%f')return String(v);if(m==='%s')return luaStr(v);if(m==='%x')return (v>>>0).toString(16);if(m==='%X')return (v>>>0).toString(16).toUpperCase();return m;});return[f];}));
  B.hash.set('string',S);
  // table library
  const T=newTable();
  T.hash.set('insert',nat(a=>{const t=a[0];if(a.length>=3){const pos=a[1];t.arr.splice(pos-1,0,a[2]);}else{t.arr.push(a[1]);}return[];}));
  T.hash.set('remove',nat(a=>{const t=a[0];const pos=a[1]===undefined?t.arr.length:a[1];const v=t.arr.splice(pos-1,1)[0];return[v===undefined?null:v];}));
  T.hash.set('concat',nat(a=>{const t=a[0];const sep=a[1]===undefined||a[1]===null?'':String(a[1]);return[t.arr.map(luaStr).join(sep)];}));
  T.hash.set('getn',nat(a=>[a[0].arr.length]));
  B.hash.set('table',T);
  // math library
  const M=newTable();
  M.hash.set('floor',nat(a=>[Math.floor(a[0])]));
  M.hash.set('ceil',nat(a=>[Math.ceil(a[0])]));
  M.hash.set('abs',nat(a=>[Math.abs(a[0])]));
  M.hash.set('max',nat(a=>[Math.max(...a)]));
  M.hash.set('min',nat(a=>[Math.min(...a)]));
  M.hash.set('sqrt',nat(a=>[Math.sqrt(a[0])]));
  M.hash.set('huge',undefined);M.hash.set('pi',Math.PI);
  M.hash.set('random',nat(a=>{if(a.length===0)return[Math.random()];if(a.length===1)return[1+Math.floor(Math.random()*a[0])];return[a[0]+Math.floor(Math.random()*(a[1]-a[0]+1))];}));
  B.hash.set('math',M);
  return B;
}

function run(proto,output){
  const G=makeBuiltins(output);
  function callValue(fn,args){
    if(fn&&fn.__native)return fn.fn(args)||[];
    if(fn&&fn.__closure)return callClosure(fn,args);
    throw new Error('attempt to call a '+luaStr(fn)+' value');
  }
  function callClosure(cl,args){
    const p=cl.proto;
    const slots=new Array(p.maxslot);
    for(let i=0;i<p.maxslot;i++)slots[i]={v:null};
    for(let i=0;i<p.nparams;i++)slots[i]={v:i<args.length?args[i]:null};
    const varargs=p.isVararg?args.slice(p.nparams):[];
    const code=p.code,K=p.consts,ups=cl.upvals,protos=p.protos;
    const st=[];let pc=0,guard=0;
    const push=v=>st.push(v),pop=()=>st.pop();
    while(true){
      if(++guard>2e7)throw new Error('runaway');
      const op=code[pc++];
      switch(op){
        case OP.PUSHK:push(K[code[pc++]]);break;
        case OP.PUSHNIL:push(null);break;
        case OP.PUSHT:push(true);break;
        case OP.PUSHF:push(false);break;
        case OP.GETL:push(slots[code[pc++]].v);break;
        case OP.SETL:slots[code[pc++]].v=pop();break;
        case OP.GETUP:push(ups[code[pc++]].v);break;
        case OP.SETUP:ups[code[pc++]].v=pop();break;
        case OP.GETG:{const name=K[code[pc++]];const v=G.hash.get(name);push(v===undefined?null:v);break;}
        case OP.NEWTBL:push(newTable());break;
        case OP.GETIDX:{const k=pop();const t=pop();push(tget(t,k));break;}
        case OP.SETIDX:{const v=pop();const k=pop();const t=st[st.length-1];tset(t,k,v);break;}
        case OP.SETARR:{const idx=code[pc++];const v=pop();const t=st[st.length-1];t.arr[idx-1]=v;break;}
        case OP.ADD:{const b=pop(),a=pop();push(a+b);break;}
        case OP.SUB:{const b=pop(),a=pop();push(a-b);break;}
        case OP.MUL:{const b=pop(),a=pop();push(a*b);break;}
        case OP.DIV:{const b=pop(),a=pop();push(a/b);break;}
        case OP.MOD:{const b=pop(),a=pop();push(a-Math.floor(a/b)*b);break;}
        case OP.CONCAT:{const b=pop(),a=pop();push(luaStr(a)+luaStr(b));break;}
        case OP.LEN:{const a=pop();push(a&&a.__table?a.arr.length:String(a).length);break;}
        case OP.NEG:push(-pop());break;
        case OP.NOT:push(!truthy(pop()));break;
        case OP.EQ:{const b=pop(),a=pop();push(a===b);break;}
        case OP.NE:{const b=pop(),a=pop();push(a!==b);break;}
        case OP.LT:{const b=pop(),a=pop();push(a<b);break;}
        case OP.GT:{const b=pop(),a=pop();push(a>b);break;}
        case OP.LE:{const b=pop(),a=pop();push(a<=b);break;}
        case OP.GE:{const b=pop(),a=pop();push(a>=b);break;}
        case OP.JMP:pc=code[pc];break;
        case OP.JZ:{const t=code[pc++];if(!truthy(st[st.length-1]))pc=t;break;}
        case OP.CLOSURE:{const cp=protos[code[pc++]];const newups=cp.upvals.map(u=>u.fromParentLocal?slots[u.index]:ups[u.index]);push({__closure:true,proto:cp,upvals:newups});break;}
        case OP.CALL:{
          const nargs=code[pc++];const want=code[pc++];
          const args=[];for(let i=0;i<nargs;i++)args.unshift(pop());
          const fn=pop();
          const results=callValue(fn,args);
          if(want===0){/* discard */}
          else if(want===0xFF){for(const r of results)push(r);}
          else{for(let i=0;i<want;i++)push(i<results.length?results[i]:null);}
          break;
        }
        case OP.RET:{
          const nret=code[pc++];
          if(nret===0)return[];
          const out=[];for(let i=0;i<nret;i++)out.unshift(pop());
          return out;
        }
        case OP.POP:pop();break;
        case OP.VARARG:push(varargs.length>0?varargs[0]:null);break;
        case OP.PACKVARG:{const t=newTable();for(let i=0;i<varargs.length;i++)t.arr[i]=varargs[i];push(t);break;}
        case OP.GETVARG:{const want=code[pc++];if(want===0){}else if(want===0xFF){for(const v of varargs)push(v);}else{for(let i=0;i<want;i++)push(i<varargs.length?varargs[i]:null);}break;}
        case OP.PRINT:{const v=pop();output.push(luaStr(v));break;}
        case OP.HALT:return[];
        default:throw new Error('bad op 0x'+op.toString(16)+' @'+(pc-1));
      }
    }
  }
  const main={__closure:true,proto,upvals:[]};
  callClosure(main,[]);
}

function exec(src){const out=[];run(compileProgram(parse(lex(src))),out);return out;}
module.exports={exec};

if(require.main===module){
  const tests=[
    [`local a,b=1,2 print(a+b)`,'3'],
    [`local function two() return 10,20 end local x,y=two() print(x) print(y)`,'10\n20'],
    [`local function sum(...) local s=0 for _,v in ipairs({...}) do s=s+v end return s end print(sum(1,2,3,4))`,'10'],
    [`local t={a=1,b=2,c=3} local s=0 for k,v in pairs(t) do s=s+v end print(s)`,'6'],
    [`local t={5,10,15} for i,v in ipairs(t) do print(v) end`,'5\n10\n15'],
    [`print(string.upper("hello"))`,'HELLO'],
    [`print(string.sub("hello world",1,5))`,'hello'],
    [`local t={} table.insert(t,1) table.insert(t,2) table.insert(t,3) print(table.concat(t,","))`,'1,2,3'],
    [`print(math.floor(3.7)) print(math.max(2,9,4))`,'3\n9'],
    [`print(string.format("x=%d y=%s",5,"hi"))`,'x=5 y=hi'],
    [`local function fib(n) if n<2 then return n end return fib(n-1)+fib(n-2) end print(fib(15))`,'610'],
    [`local function mk(n) local c=0 return function() c=c+n return c end end local f=mk(3) print(f()) print(f())`,'3\n6'],
    [`local function swap(a,b) return b,a end local x,y=swap(1,2) print(x) print(y)`,'2\n1'],
    [`local s=0 for i=1,10 do if i==5 then break end s=s+i end print(s)`,'10'],
  ];
  let ok=0;
  tests.forEach(([src,exp],i)=>{
    try{const got=exec(src).join('\n');const pass=got===exp;ok+=pass?1:0;console.log(`T${String(i+1).padStart(2)} ${pass?'PASS':'FAIL'}${pass?'':'  got['+got.replace(/\n/g,'|')+'] exp['+exp.replace(/\n/g,'|')+']'}`);}
    catch(e){console.log(`T${i+1} ERROR ${e.message}`);}
  });
  console.log(`\n${ok}/${tests.length} passed (reference VM)`);
}
