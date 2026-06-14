// ===== Advanced mini-Lua front end: lexer + parser =====
// Supports: numbers, strings, booleans, nil, variables (local),
// arithmetic/comparison/logical ops, if/elseif/else, while,
// tables { } with [k]=v and array entries, indexing t[k] and t.k,
// function definitions (named + anonymous), calls, return, closures.

const KW=new Set(['local','if','then','elseif','else','end','while','do',
  'function','return','true','false','nil','and','or','not','for','in','print']);

function lex(src){
  const T=[];let i=0;const D=c=>c>='0'&&c<='9';const A=c=>/[A-Za-z_]/.test(c);
  while(i<src.length){let c=src[i];
    if(/\s/.test(c)){i++;continue;}
    if(c==='-'&&src[i+1]==='-'){while(i<src.length&&src[i]!=='\n')i++;continue;}
    if(D(c)||(c==='.'&&D(src[i+1]))){let s=i;while(i<src.length&&(D(src[i])||src[i]==='.'))i++;T.push({t:'num',v:parseFloat(src.slice(s,i))});continue;}
    if(A(c)){let s=i;while(i<src.length&&(A(src[i])||D(src[i])))i++;const w=src.slice(s,i);T.push({t:KW.has(w)?'kw':'id',v:w});continue;}
    if(c==='"'||c==="'"){const q=c;let s=++i;let buf='';while(i<src.length&&src[i]!==q){if(src[i]==='\\'){i++;const e=src[i];buf+=(e==='n'?'\n':e==='t'?'\t':e);i++;}else{buf+=src[i++];}}i++;T.push({t:'str',v:buf});continue;}
    const three=src.slice(i,i+3); if(three==='...'){T.push({t:'op',v:'...'});i+=3;continue;}
    const two=src.slice(i,i+2);
    if(['==','~=','<=','>=','..'].includes(two)){T.push({t:'op',v:two});i+=2;continue;}
    if('+-*/%()<>=[]{},.;:#'.includes(c)){T.push({t:'op',v:c});i++;continue;}
    throw new Error('lex: unexpected '+JSON.stringify(c)+' @'+i);
  }
  T.push({t:'eof',v:null});return T;
}

function parse(toks){
  let p=0;const pk=()=>toks[p];const nx=()=>toks[p++];
  const is=(t,v)=>pk().t===t&&(v===undefined||pk().v===v);
  const eat=(v)=>{const t=nx();if(t.v!==v)throw new Error(`parse: expected '${v}' got '${t.v}'`);return t;};
  const BP={'or':1,'and':2,'==':3,'~=':3,'<':4,'>':4,'<=':4,'>=':4,'..':5,'+':6,'-':6,'*':7,'/':7,'%':7};

  function primary(){
    const t=pk();
    if(t.t==='num'){nx();return{k:'num',v:t.v};}
    if(t.t==='str'){nx();return{k:'str',v:t.v};}
    if(t.t==='kw'&&t.v==='true'){nx();return{k:'bool',v:true};}
    if(t.t==='kw'&&t.v==='false'){nx();return{k:'bool',v:false};}
    if(t.t==='kw'&&t.v==='nil'){nx();return{k:'nil'};}
    if(t.t==='kw'&&t.v==='not'){nx();return{k:'not',e:unary()};}
    if(t.t==='kw'&&t.v==='function'){nx();return funcbody(null);}
    if(t.t==='op'&&t.v==='-'){nx();return{k:'neg',e:unary()};}
    if(t.t==='op'&&t.v==='#'){nx();return{k:'len',e:unary()};}
    if(t.t==='op'&&t.v==='('){nx();const e=expr(0);eat(')');return e;}
    if(t.t==='op'&&t.v==='{'){return tablecons();}
    if(t.t==='id'){nx();return{k:'var',v:t.v};}
    throw new Error('parse: unexpected in expr '+JSON.stringify(t));
  }
  function suffixed(){
    let e=primary();
    while(true){const t=pk();
      if(t.t==='op'&&t.v==='.'){nx();const n=nx();e={k:'index',obj:e,key:{k:'str',v:n.v}};}
      else if(t.t==='op'&&t.v==='['){nx();const idx=expr(0);eat(']');e={k:'index',obj:e,key:idx};}
      else if(t.t==='op'&&t.v==='('){nx();const args=[];if(!(pk().t==='op'&&pk().v===')')){args.push(expr(0));while(pk().t==='op'&&pk().v===','){nx();args.push(expr(0));}}eat(')');e={k:'call',fn:e,args};}
      else break;
    }
    return e;
  }
  function unary(){return suffixed();}
  function expr(minbp){
    let left=unary();
    while(true){const t=pk();const v=t.v;
      if(!((t.t==='op'||t.t==='kw')&&v in BP))break;
      const bp=BP[v];if(bp<minbp)break;nx();
      const right=expr(bp+1);left={k:'bin',op:v,l:left,r:right};
    }
    return left;
  }
  function tablecons(){
    eat('{');const fields=[];
    while(!(pk().t==='op'&&pk().v==='}')){
      if(pk().t==='op'&&pk().v==='['){nx();const key=expr(0);eat(']');eat('=');const val=expr(0);fields.push({type:'kv',key,val});}
      else if(pk().t==='id'&&toks[p+1].t==='op'&&toks[p+1].v==='='){const key={k:'str',v:nx().v};nx();const val=expr(0);fields.push({type:'kv',key,val});}
      else{fields.push({type:'arr',val:expr(0)});}
      if(pk().t==='op'&&(pk().v===','||pk().v===';'))nx();else break;
    }
    eat('}');return{k:'table',fields};
  }
  function funcbody(name){
    eat('(');const params=[];
    if(!(pk().t==='op'&&pk().v===')')){params.push(nx().v);while(pk().t==='op'&&pk().v===','){nx();params.push(nx().v);}}
    eat(')');const body=block(['end']);eat('end');
    return{k:'func',name,params,body};
  }
  function stmt(){
    const t=pk();
    if(t.t==='kw'&&t.v==='local'){nx();
      if(pk().t==='kw'&&pk().v==='function'){nx();const name=nx().v;const f=funcbody(name);return{k:'localfunc',name,f};}
      const name=nx().v;let e={k:'nil'};if(pk().t==='op'&&pk().v==='='){nx();e=expr(0);}return{k:'local',name,e};
    }
    if(t.t==='kw'&&t.v==='function'){nx();
      // function name or name.field
      let base=nx().v;let target={k:'var',v:base};let methodName=base;
      while(pk().t==='op'&&pk().v==='.'){nx();const n=nx().v;target={k:'index',obj:target,key:{k:'str',v:n}};methodName=n;}
      const f=funcbody(methodName);return{k:'assign',target,e:f};
    }
    if(t.t==='kw'&&t.v==='if'){nx();const c=expr(0);eat('then');const b=block(['elseif','else','end']);
      const clauses=[{c,b}];let elseb=null;
      while(pk().t==='kw'&&pk().v==='elseif'){nx();const c2=expr(0);eat('then');const b2=block(['elseif','else','end']);clauses.push({c:c2,b:b2});}
      if(pk().t==='kw'&&pk().v==='else'){nx();elseb=block(['end']);}
      eat('end');return{k:'if',clauses,elseb};
    }
    if(t.t==='kw'&&t.v==='while'){nx();const c=expr(0);eat('do');const b=block(['end']);eat('end');return{k:'while',c,b};}
    if(t.t==='kw'&&t.v==='for'){nx();const v=nx().v;eat('=');const a=expr(0);eat(',');const b=expr(0);let step=null;if(pk().t==='op'&&pk().v===','){nx();step=expr(0);}eat('do');const body=block(['end']);eat('end');return{k:'fornum',v,a,b,step,body};}
    if(t.t==='kw'&&t.v==='return'){nx();let e=null;if(!(pk().t==='kw'&&(pk().v==='end'||pk().v==='elseif'||pk().v==='else'))&&pk().t!=='eof')e=expr(0);return{k:'return',e};}
    if(t.t==='kw'&&t.v==='print'){nx();eat('(');const e=expr(0);eat(')');return{k:'print',e};}
    // expression statement or assignment
    const lhs=suffixed();
    if(pk().t==='op'&&pk().v==='='){nx();const e=expr(0);return{k:'assign',target:lhs,e};}
    return{k:'exprstmt',e:lhs};
  }
  function block(stop){const out=[];
    while(true){const t=pk();
      if(t.t==='eof')break;
      if(t.t==='kw'&&stop.includes(t.v))break;
      out.push(stmt());
      if(pk().t==='op'&&pk().v===';')nx();
    }
    return out;
  }
  const prog=block([]);
  return prog;
}

module.exports={lex,parse};
