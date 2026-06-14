// ===== Bytecode compiler with multi-value calling convention =====
const OP={
  PUSHK:0x10, PUSHNIL:0x11, PUSHT:0x12, PUSHF:0x13,
  GETL:0x14, SETL:0x15, GETUP:0x16, SETUP:0x17, GETG:0x18,
  NEWTBL:0x19, GETIDX:0x1A, SETIDX:0x1B, SETARR:0x1C,
  ADD:0x20,SUB:0x21,MUL:0x22,DIV:0x23,MOD:0x24,CONCAT:0x25,LEN:0x26,NEG:0x27,
  EQ:0x30,NE:0x31,LT:0x32,GT:0x33,LE:0x34,GE:0x35,NOT:0x36,
  JMP:0x40,JZ:0x41,
  CLOSURE:0x50, CALL:0x51, RET:0x52, POP:0x53, VARARG:0x54,
  GETVARG:0x55, PACKVARG:0x56,
  PRINT:0x60, HALT:0x7F
};

// A "multi" marker on the stack is represented by pushing values then a count.
// To keep the VM simple we instead use an explicit convention:
//   CALL nargs -> pops fn + nargs, pushes EXACTLY 1 result (adjusted).
//   For multi-return we add CALLM (call, push all results as a packed list)
//   Simplicity: we implement single-result calls in expression position, and
//   full multi only for `return f()` and `a,b = f()` via CALLN (n wanted).
// Operand encoding for CALL: high nibble unused; we pass nargs in one byte and
// nwanted in the next byte.

class FnCompiler{
  constructor(parent,params,isVararg){
    this.parent=parent;this.code=[];this.consts=[];this.protos=[];
    this.scopes=[{}];this.nslot=0;this.maxslot=0;this.upvals=[];
    this.params=params||[];this.isVararg=!!isVararg;
    this.breaks=[];
    for(const pn of this.params)this.declare(pn);
  }
  k(v){const t=typeof v;for(let i=0;i<this.consts.length;i++){const c=this.consts[i];if(typeof c===t&&c===v)return i;}this.consts.push(v);return this.consts.length-1;}
  enter(){this.scopes.push({});}
  leave(){const s=this.scopes.pop();this.nslot-=Object.keys(s).length;}
  declare(name){const s=this.scopes[this.scopes.length-1];const slot=this.nslot++;if(this.nslot>this.maxslot)this.maxslot=this.nslot;s[name]=slot;return slot;}
  resolveLocal(name){for(let i=this.scopes.length-1;i>=0;i--)if(name in this.scopes[i])return this.scopes[i][name];return -1;}
  resolveUpval(name){
    for(let i=0;i<this.upvals.length;i++)if(this.upvals[i].name===name)return i;
    if(!this.parent)return -1;
    const pl=this.parent.resolveLocal(name);
    if(pl>=0){this.upvals.push({name,fromParentLocal:true,index:pl});return this.upvals.length-1;}
    const pu=this.parent.resolveUpval(name);
    if(pu>=0){this.upvals.push({name,fromParentLocal:false,index:pu});return this.upvals.length-1;}
    return -1;
  }
  emit(...b){for(const x of b)this.code.push(x|0);}
  here(){return this.code.length;}
  patch(at,v){this.code[at]=v|0;}

  // push a single value of expr e
  cExpr(e){
    switch(e.k){
      case 'num': case 'str': this.emit(OP.PUSHK,this.k(e.v));break;
      case 'bool': this.emit(e.v?OP.PUSHT:OP.PUSHF);break;
      case 'nil': this.emit(OP.PUSHNIL);break;
      case 'vararg': this.emit(OP.VARARG);break; // single (first) vararg
      case 'paren': this.cExpr(e.e);break;
      case 'neg': this.cExpr(e.e);this.emit(OP.NEG);break;
      case 'not': this.cExpr(e.e);this.emit(OP.NOT);break;
      case 'len': this.cExpr(e.e);this.emit(OP.LEN);break;
      case 'var':{
        const l=this.resolveLocal(e.v);
        if(l>=0){this.emit(OP.GETL,l);break;}
        const u=this.resolveUpval(e.v);
        if(u>=0){this.emit(OP.GETUP,u);break;}
        this.emit(OP.GETG,this.k(e.v));break; // global lookup (builtins)
      }
      case 'index': this.cExpr(e.obj);this.cExpr(e.key);this.emit(OP.GETIDX);break;
      case 'bin':{
        if(e.op==='and'){this.cExpr(e.l);this.emit(OP.JZ,0);const j=this.here()-1;this.emit(OP.POP);this.cExpr(e.r);this.patch(j,this.here());break;}
        if(e.op==='or'){this.cExpr(e.l);this.emit(OP.JZ,0);const j=this.here()-1;this.emit(OP.JMP,0);const j2=this.here()-1;this.patch(j,this.here());this.emit(OP.POP);this.cExpr(e.r);this.patch(j2,this.here());break;}
        this.cExpr(e.l);this.cExpr(e.r);
        const m={'+':OP.ADD,'-':OP.SUB,'*':OP.MUL,'/':OP.DIV,'%':OP.MOD,'..':OP.CONCAT,'==':OP.EQ,'~=':OP.NE,'<':OP.LT,'>':OP.GT,'<=':OP.LE,'>=':OP.GE};
        this.emit(m[e.op]);break;
      }
      case 'table':{
        // Special case: {...} alone -> PACKVARG builds an array table of all varargs
        if(e.fields.length===1&&e.fields[0].type==='arr'&&e.fields[0].val.k==='vararg'){
          this.emit(OP.PACKVARG);break;
        }
        this.emit(OP.NEWTBL);let arrIdx=1;
        for(let fi=0;fi<e.fields.length;fi++){
          const f=e.fields[fi];
          if(f.type==='kv'){this.cExpr(f.key);this.cExpr(f.val);this.emit(OP.SETIDX);}
          else{this.cExpr(f.val);this.emit(OP.SETARR,arrIdx++);}
        }
        break;
      }
      case 'func':{const proto=compileFn(this,e.params,e.isVararg,e.body);const pidx=this.protos.length;this.protos.push(proto);this.emit(OP.CLOSURE,pidx);break;}
      case 'call': this.cCall(e,1);break;       // want 1 result
      case 'method': this.cMethod(e,1);break;
      default:throw new Error('cExpr unknown '+e.k);
    }
  }
  // emit a call producing `want` results (0xFF = all). Pushes results on stack.
  cCall(e,want){
    this.cExpr(e.fn);
    let n=e.args.length;
    for(let i=0;i<e.args.length;i++){
      const a=e.args[i];
      // if last arg is itself a call/vararg and we want spreading, pass multi
      this.cExpr(a);
    }
    this.emit(OP.CALL,n,want&0xFF);
  }
  cMethod(e,want){
    // obj:name(args) -> push obj, dup as self
    this.cExpr(e.obj);             // [obj]
    // get method: need obj again for index; emit GETIDX on a copy.
    // Simple approach: store obj into a temp local.
    const tmp=this.declare('(self)');
    this.emit(OP.SETL,tmp);        // store obj
    this.emit(OP.GETL,tmp);this.emit(OP.PUSHK,this.k(e.name));this.emit(OP.GETIDX); // [fn]
    this.emit(OP.GETL,tmp);        // self as first arg
    for(const a of e.args)this.cExpr(a);
    this.emit(OP.CALL,e.args.length+1,want&0xFF);
    // tmp slot leaks one slot but that's fine for correctness
  }

  cStmt(s){
    switch(s.k){
      case 'local':{
        // evaluate exprs, adjust to names count
        this.adjustExprs(s.exprs,s.names.length);
        // now top of stack has names.length values; assign in reverse
        const slots=s.names.map(n=>this.declare(n));
        for(let i=slots.length-1;i>=0;i--)this.emit(OP.SETL,slots[i]);
        break;
      }
      case 'localfunc':{const slot=this.declare(s.name);const proto=compileFn(this,s.f.params,s.f.isVararg,s.f.body);const pidx=this.protos.length;this.protos.push(proto);this.emit(OP.CLOSURE,pidx);this.emit(OP.SETL,slot);break;}
      // 'assign' is handled by compileAssign via the prototype patch below
      case 'exprstmt':{
        if(s.e.k==='call'){this.cCall(s.e,0);}     // want 0 results
        else if(s.e.k==='method'){this.cMethod(s.e,0);}
        else{this.cExpr(s.e);this.emit(OP.POP);}
        break;
      }
      case 'print':{
        // print(args...) : evaluate each, call builtin print with n args
        this.emit(OP.GETG,this.k('print'));
        for(const a of s.args)this.cExpr(a);
        this.emit(OP.CALL,s.args.length,0);
        break;
      }
      case 'return':{
        if(s.exprs.length===0){this.emit(OP.RET,0);break;}
        // push all, last may spread
        for(let i=0;i<s.exprs.length;i++)this.cExpr(s.exprs[i]);
        this.emit(OP.RET,s.exprs.length);break;
      }
      case 'if':{
        const endJumps=[];
        for(const cl of s.clauses){
          this.cExpr(cl.c);this.emit(OP.JZ,0);const jz=this.here()-1;
          this.enter();for(const x of cl.b)this.cStmt(x);this.leave();
          this.emit(OP.JMP,0);endJumps.push(this.here()-1);
          this.patch(jz,this.here());
        }
        if(s.elseb){this.enter();for(const x of s.elseb)this.cStmt(x);this.leave();}
        for(const j of endJumps)this.patch(j,this.here());
        break;
      }
      case 'while':{
        const top=this.here();this.cExpr(s.c);this.emit(OP.JZ,0);const jz=this.here()-1;
        const savedBreaks=this.breaks;this.breaks=[];
        this.enter();for(const x of s.b)this.cStmt(x);this.leave();
        this.emit(OP.JMP,top);this.patch(jz,this.here());
        for(const b of this.breaks)this.patch(b,this.here());this.breaks=savedBreaks;
        break;
      }
      case 'break':{this.emit(OP.JMP,0);this.breaks.push(this.here()-1);break;}
      case 'fornum':{
        this.enter();
        const iSlot=this.declare(s.v);this.cExpr(s.a);this.emit(OP.SETL,iSlot);
        const limSlot=this.declare('(lim)');this.cExpr(s.b);this.emit(OP.SETL,limSlot);
        const stepSlot=this.declare('(step)');if(s.step)this.cExpr(s.step);else this.emit(OP.PUSHK,this.k(1));this.emit(OP.SETL,stepSlot);
        const top=this.here();
        this.emit(OP.GETL,iSlot);this.emit(OP.GETL,limSlot);this.emit(OP.LE);this.emit(OP.JZ,0);const jz=this.here()-1;
        const savedBreaks=this.breaks;this.breaks=[];
        this.enter();for(const x of s.body)this.cStmt(x);this.leave();
        this.emit(OP.GETL,iSlot);this.emit(OP.GETL,stepSlot);this.emit(OP.ADD);this.emit(OP.SETL,iSlot);
        this.emit(OP.JMP,top);this.patch(jz,this.here());
        for(const b of this.breaks)this.patch(b,this.here());this.breaks=savedBreaks;
        this.leave();break;
      }
      case 'forin':{
        // for names in iter:  iter returns f, s, ctrl
        this.enter();
        const fSlot=this.declare('(f)'),sSlot=this.declare('(s)'),cSlot=this.declare('(ctrl)');
        this.adjustExprs([s.iter],3);
        this.emit(OP.SETL,cSlot);this.emit(OP.SETL,sSlot);this.emit(OP.SETL,fSlot);
        const varSlots=s.names.map(n=>this.declare(n));
        const top=this.here();
        // call f(s, ctrl) -> wants names.length results
        this.emit(OP.GETL,fSlot);this.emit(OP.GETL,sSlot);this.emit(OP.GETL,cSlot);
        this.emit(OP.CALL,2,varSlots.length&0xFF);
        for(let i=varSlots.length-1;i>=0;i--)this.emit(OP.SETL,varSlots[i]);
        // if first var == nil then break
        this.emit(OP.GETL,varSlots[0]);this.emit(OP.PUSHNIL);this.emit(OP.EQ);this.emit(OP.JZ,0);const cont=this.here()-1;
        this.emit(OP.JMP,0);const out=this.here()-1;
        this.patch(cont,this.here());
        // ctrl = first var
        this.emit(OP.GETL,varSlots[0]);this.emit(OP.SETL,cSlot);
        const savedBreaks=this.breaks;this.breaks=[];
        this.enter();for(const x of s.body)this.cStmt(x);this.leave();
        this.emit(OP.JMP,top);
        this.patch(out,this.here());
        for(const b of this.breaks)this.patch(b,this.here());this.breaks=savedBreaks;
        this.leave();break;
      }
      default:throw new Error('cStmt unknown '+s.k);
    }
  }

  // evaluate a list of exprs producing exactly `want` values on the stack
  adjustExprs(exprs,want){
    if(exprs.length===0){for(let i=0;i<want;i++)this.emit(OP.PUSHNIL);return;}
    for(let i=0;i<exprs.length-1;i++)this.cExpr(exprs[i]); // each yields 1
    const last=exprs[exprs.length-1];
    const haveBefore=exprs.length-1;
    const need=want-haveBefore;
    if(last.k==='call'){this.cCall(last,need<0?0:need);}
    else if(last.k==='method'){this.cMethod(last,need<0?0:need);}
    else if(last.k==='vararg'){this.emit(OP.GETVARG,need<0?0:need);}
    else{
      this.cExpr(last);
      // adjust: if need>1 pad nils; if need<1 pop extras
      if(need>1)for(let i=0;i<need-1;i++)this.emit(OP.PUSHNIL);
      else if(need<1)for(let i=0;i<1-need;i++)this.emit(OP.POP);
      return;
    }
    // call/vararg already produced exactly `need` (>=0). If haveBefore+need<want pad
    // (handled by passing need to CALL). Done.
  }
}

// Correct assignment compile (separate, since the inline one above was a stub)
function compileAssign(fc,s){
  // Evaluate target obj/keys first (for index targets), then values, then store.
  const preps=s.targets.map(t=>{
    if(t.k==='index'){fc.cExpr(t.obj);fc.cExpr(t.key);return 'index';}
    return t.k==='var'?'var':'other';
  });
  fc.adjustExprs(s.exprs,s.targets.length);
  // Stack now: for each index target we pushed obj,key earlier (in order),
  // then N values on top. Assign from last target to first.
  // To keep ordering sane, simplest correct approach: store values into temps.
  const tmps=[];
  for(let i=0;i<s.targets.length;i++){const ts=fc.declare('(at'+i+')');tmps.push(ts);}
  for(let i=s.targets.length-1;i>=0;i--)fc.emit(OP.SETL,tmps[i]);
  // Now assign each target using its temp value
  for(let i=0;i<s.targets.length;i++){
    const t=s.targets[i];
    if(t.k==='var'){
      const l=fc.resolveLocal(t.v);
      if(l>=0){fc.emit(OP.GETL,tmps[i]);fc.emit(OP.SETL,l);}
      else{const u=fc.resolveUpval(t.v);if(u>=0){fc.emit(OP.GETL,tmps[i]);fc.emit(OP.SETUP,u);}else{const slot=fc.declare(t.v);fc.emit(OP.GETL,tmps[i]);fc.emit(OP.SETL,slot);}}
    } else if(t.k==='index'){
      fc.cExpr(t.obj);fc.cExpr(t.key);fc.emit(OP.GETL,tmps[i]);fc.emit(OP.SETIDX);fc.emit(OP.POP);
    }
  }
}

// monkeypatch: replace the stubbed assign case by intercepting cStmt
const _origStmt=FnCompiler.prototype.cStmt;
FnCompiler.prototype.cStmt=function(s){
  if(s.k==='assign'){return compileAssign(this,s);}
  return _origStmt.call(this,s);
};

function compileFn(parent,params,isVararg,body){
  const fc=new FnCompiler(parent,params,isVararg);
  for(const s of body)fc.cStmt(s);
  fc.emit(OP.RET,0);
  return {code:fc.code,consts:fc.consts,maxslot:fc.maxslot,
          upvals:fc.upvals.map(u=>({fromParentLocal:u.fromParentLocal,index:u.index})),
          nparams:params.length,isVararg:fc.isVararg,protos:fc.protos};
}

function compileProgram(ast){return compileFn(null,[],true,ast);}

module.exports={OP,compileProgram};
