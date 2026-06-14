// ===== Extended mini-Lua front end =====
// Adds over vm2: vararg (...), multiple return (return a,b),
// multiple assignment (a,b = f()), generic for (for k,v in pairs(t)),
// method-ish calls already covered by index+call, builtin names.
const KW=new Set(['local','if','then','elseif','else','end','while','do',
  'function','return','true','false','nil','and','or','not','for','in','print',
  'break']);

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
    if(t.t==='kw'&&t.v==='function'){nx();return funcbody();}
    if(t.t==='op'&&t.v==='-'){nx();return{k:'neg',e:unary()};}
    if(t.t==='op'&&t.v==='#'){nx();return{k:'len',e:unary()};}
    if(t.t==='op'&&t.v==='...'){nx();return{k:'vararg'};}
    if(t.t==='op'&&t.v==='('){nx();const e=expr(0);eat(')');return{k:'paren',e};}
    if(t.t==='op'&&t.v==='{'){return tablecons();}
    if(t.t==='id'){nx();return{k:'var',v:t.v};}
    throw new Error('parse: unexpected in expr '+JSON.stringify(t));
  }
  function suffixed(){
    let e=primary();
    while(true){const t=pk();
      if(t.t==='op'&&t.v==='.'){nx();const n=nx();e={k:'index',obj:e,key:{k:'str',v:n.v}};}
      else if(t.t==='op'&&t.v==='['){nx();const idx=expr(0);eat(']');e={k:'index',obj:e,key:idx};}
      else if(t.t==='op'&&t.v===':'){nx();const m=nx().v;eat('(');const args=callargs();eat(')');e={k:'method',obj:e,name:m,args};}
      else if(t.t==='op'&&t.v==='('){nx();const args=callargs();eat(')');e={k:'call',fn:e,args};}
      else if(t.t==='str'){const s=nx();e={k:'call',fn:e,args:[{k:'str',v:s.v}]};}
      else if(t.t==='op'&&t.v==='{'){const tb=tablecons();e={k:'call',fn:e,args:[tb]};}
      else break;
    }
    return e;
  }
  function callargs(){const args=[];if(!(pk().t==='op'&&pk().v===')')){args.push(expr(0));while(pk().t==='op'&&pk().v===','){nx();args.push(expr(0));}}return args;}
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
  function funcbody(){
    eat('(');const params=[];let isVararg=false;
    if(!(pk().t==='op'&&pk().v===')')){
      while(true){
        if(pk().t==='op'&&pk().v==='...'){nx();isVararg=true;break;}
        params.push(nx().v);
        if(pk().t==='op'&&pk().v===','){nx();continue;}
        break;
      }
    }
    eat(')');const body=block(['end']);eat('end');
    return{k:'func',params,isVararg,body};
  }
  function stmt(){
    const t=pk();
    if(t.t==='kw'&&t.v==='local'){nx();
      if(pk().t==='kw'&&pk().v==='function'){nx();const name=nx().v;const f=funcbody();return{k:'localfunc',name,f};}
      const names=[nx().v];while(pk().t==='op'&&pk().v===','){nx();names.push(nx().v);}
      let exprs=[];if(pk().t==='op'&&pk().v==='='){nx();exprs.push(expr(0));while(pk().t==='op'&&pk().v===','){nx();exprs.push(expr(0));}}
      return{k:'local',names,exprs};
    }
    if(t.t==='kw'&&t.v==='function'){nx();
      let target={k:'var',v:nx().v};let isMethod=false;
      while(pk().t==='op'&&pk().v==='.'){nx();const n=nx().v;target={k:'index',obj:target,key:{k:'str',v:n}};}
      if(pk().t==='op'&&pk().v===':'){nx();const n=nx().v;target={k:'index',obj:target,key:{k:'str',v:n}};isMethod=true;}
      const f=funcbody();if(isMethod)f.params.unshift('self');
      return{k:'assign',targets:[target],exprs:[f]};
    }
    if(t.t==='kw'&&t.v==='if'){nx();const c=expr(0);eat('then');const b=block(['elseif','else','end']);
      const clauses=[{c,b}];let elseb=null;
      while(pk().t==='kw'&&pk().v==='elseif'){nx();const c2=expr(0);eat('then');const b2=block(['elseif','else','end']);clauses.push({c:c2,b:b2});}
      if(pk().t==='kw'&&pk().v==='else'){nx();elseb=block(['end']);}
      eat('end');return{k:'if',clauses,elseb};
    }
    if(t.t==='kw'&&t.v==='while'){nx();const c=expr(0);eat('do');const b=block(['end']);eat('end');return{k:'while',c,b};}
    if(t.t==='kw'&&t.v==='break'){nx();return{k:'break'};}
    if(t.t==='kw'&&t.v==='for'){nx();const n1=nx().v;
      if(pk().t==='op'&&pk().v==='='){nx();const a=expr(0);eat(',');const b=expr(0);let step=null;if(pk().t==='op'&&pk().v===','){nx();step=expr(0);}eat('do');const body=block(['end']);eat('end');return{k:'fornum',v:n1,a,b,step,body};}
      // generic for: for k,v in expr do
      const names=[n1];while(pk().t==='op'&&pk().v===','){nx();names.push(nx().v);}
      eat('in');const iter=expr(0);eat('do');const body=block(['end']);eat('end');
      return{k:'forin',names,iter,body};
    }
    if(t.t==='kw'&&t.v==='return'){nx();const exprs=[];
      if(!(pk().t==='kw'&&(pk().v==='end'||pk().v==='elseif'||pk().v==='else'))&&pk().t!=='eof'&&!(pk().t==='op'&&pk().v===';')){
        exprs.push(expr(0));while(pk().t==='op'&&pk().v===','){nx();exprs.push(expr(0));}
      }
      return{k:'return',exprs};
    }
    if(t.t==='kw'&&t.v==='print'){nx();eat('(');const args=callargs();eat(')');return{k:'print',args};}
    // expression statement or (multi) assignment
    const first=suffixed();
    if(pk().t==='op'&&(pk().v==='='||pk().v===',')){
      const targets=[first];
      while(pk().t==='op'&&pk().v===','){nx();targets.push(suffixed());}
      eat('=');const exprs=[expr(0)];while(pk().t==='op'&&pk().v===','){nx();exprs.push(expr(0));}
      return{k:'assign',targets,exprs};
    }
    return{k:'exprstmt',e:first};
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
  return block([]);
}

module.exports={lex,parse};
