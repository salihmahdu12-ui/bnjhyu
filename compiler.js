// ===== Bytecode compiler for the advanced mini-Lua =====
const OP={
  PUSHK:0x10, PUSHNIL:0x11, PUSHT:0x12, PUSHF:0x13,
  GETL:0x14, SETL:0x15,            // local get/set by slot
  GETUP:0x16, SETUP:0x17,          // upvalue get/set
  NEWTBL:0x18, GETIDX:0x19, SETIDX:0x1A, SETARR:0x1B,
  ADD:0x20,SUB:0x21,MUL:0x22,DIV:0x23,MOD:0x24,CONCAT:0x25,LEN:0x26,NEG:0x27,
  EQ:0x30,NE:0x31,LT:0x32,GT:0x33,LE:0x34,GE:0x35,NOT:0x36,
  JMP:0x40,JZ:0x41,             // jumps (operand = target instr index)
  CLOSURE:0x50, CALL:0x51, RET:0x52, POP:0x53,
  PRINT:0x60, HALT:0x7F
};

// Compile a function body into a "proto": {code, consts, nslot, upvals, nparams, protos}
class FnCompiler{
  constructor(parent,params){
    this.parent=parent; this.code=[]; this.consts=[]; this.protos=[];
    this.scopes=[{}]; this.nslot=0; this.maxslot=0;
    this.upvals=[];           // [{name, fromParentLocal:bool, index}]
    this.params=params||[];
    for(const pn of this.params) this.declare(pn);
  }
  k(v){const t=typeof v; for(let i=0;i<this.consts.length;i++){const c=this.consts[i];if(typeof c===t&&c===v)return i;} this.consts.push(v);return this.consts.length-1;}
  enter(){this.scopes.push({});}
  leave(){const s=this.scopes.pop();this.nslot-=Object.keys(s).length;}
  declare(name){const s=this.scopes[this.scopes.length-1];const slot=this.nslot++;if(this.nslot>this.maxslot)this.maxslot=this.nslot;s[name]=slot;return slot;}
  resolveLocal(name){for(let i=this.scopes.length-1;i>=0;i--){if(name in this.scopes[i])return this.scopes[i][name];}return -1;}
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

  // ----- expressions -----
  cExpr(e){
    switch(e.k){
      case 'num': this.emit(OP.PUSHK,this.k(e.v));break;
      case 'str': this.emit(OP.PUSHK,this.k(e.v));break;
      case 'bool': this.emit(e.v?OP.PUSHT:OP.PUSHF);break;
      case 'nil': this.emit(OP.PUSHNIL);break;
      case 'neg': this.cExpr(e.e);this.emit(OP.NEG);break;
      case 'not': this.cExpr(e.e);this.emit(OP.NOT);break;
      case 'len': this.cExpr(e.e);this.emit(OP.LEN);break;
      case 'var':{
        const l=this.resolveLocal(e.v);
        if(l>=0){this.emit(OP.GETL,l);break;}
        const u=this.resolveUpval(e.v);
        if(u>=0){this.emit(OP.GETUP,u);break;}
        // unknown -> nil (globals not modeled); treat as nil
        this.emit(OP.PUSHNIL);break;
      }
      case 'index': this.cExpr(e.obj);this.cExpr(e.key);this.emit(OP.GETIDX);break;
      case 'bin':{
        if(e.op==='and'){ // short-circuit
          this.cExpr(e.l);this.emit(OP.JZ,0);const j=this.here()-1;
          this.emit(OP.POP);this.cExpr(e.r);this.patch(j,this.here());break;
        }
        if(e.op==='or'){
          this.cExpr(e.l);this.emit(OP.JZ,0);const j=this.here()-1;
          this.emit(OP.JMP,0);const j2=this.here()-1;
          this.patch(j,this.here());this.emit(OP.POP);this.cExpr(e.r);this.patch(j2,this.here());break;
        }
        this.cExpr(e.l);this.cExpr(e.r);
        const m={'+':OP.ADD,'-':OP.SUB,'*':OP.MUL,'/':OP.DIV,'%':OP.MOD,'..':OP.CONCAT,
                 '==':OP.EQ,'~=':OP.NE,'<':OP.LT,'>':OP.GT,'<=':OP.LE,'>=':OP.GE};
        this.emit(m[e.op]);break;
      }
      case 'table':{
        this.emit(OP.NEWTBL);let arrIdx=1;
        for(const f of e.fields){
          if(f.type==='kv'){this.emit(OP.POP===undefined?0:0); // keep table on stack
            // stack: [tbl]; dup approach: we use SETIDX which pops k,v but keeps tbl
            this.cExpr(f.key);this.cExpr(f.val);this.emit(OP.SETIDX);
          } else {
            this.cExpr(f.val);this.emit(OP.SETARR,arrIdx++);
          }
        }
        break;
      }
      case 'func':{
        const proto=compileFn(this,e.params,e.body);
        const pidx=this.protos.length;this.protos.push(proto);
        this.emit(OP.CLOSURE,pidx);break;
      }
      case 'call':{
        this.cExpr(e.fn);
        for(const a of e.args)this.cExpr(a);
        this.emit(OP.CALL,e.args.length);break;
      }
      default:throw new Error('cExpr unknown '+e.k);
    }
  }
  // ----- statements -----
  cStmt(s){
    switch(s.k){
      case 'local':{this.cExpr(s.e);const slot=this.declare(s.name);this.emit(OP.SETL,slot);break;}
      case 'localfunc':{const slot=this.declare(s.name);const proto=compileFn(this,s.f.params,s.f.body);const pidx=this.protos.length;this.protos.push(proto);this.emit(OP.CLOSURE,pidx);this.emit(OP.SETL,slot);break;}
      case 'assign':{
        if(s.target.k==='var'){
          this.cExpr(s.e);
          const l=this.resolveLocal(s.target.v);
          if(l>=0){this.emit(OP.SETL,l);break;}
          const u=this.resolveUpval(s.target.v);
          if(u>=0){this.emit(OP.SETUP,u);break;}
          const slot=this.declare(s.target.v);this.emit(OP.SETL,slot);break;
        } else { // index assign
          this.cExpr(s.target.obj);this.cExpr(s.target.key);this.cExpr(s.e);this.emit(OP.SETIDX);this.emit(OP.POP);break;
        }
      }
      case 'exprstmt':{this.cExpr(s.e);this.emit(OP.POP);break;}
      case 'print':{this.cExpr(s.e);this.emit(OP.PRINT);break;}
      case 'return':{if(s.e)this.cExpr(s.e);else this.emit(OP.PUSHNIL);this.emit(OP.RET);break;}
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
        this.enter();for(const x of s.b)this.cStmt(x);this.leave();
        this.emit(OP.JMP,top);this.patch(jz,this.here());break;
      }
      case 'fornum':{
        // local i=a ; while i<=b do <body>; i=i+step end
        this.enter();
        const iSlot=this.declare(s.v);
        this.cExpr(s.a);this.emit(OP.SETL,iSlot);
        const limSlot=this.declare('(for_lim)');this.cExpr(s.b);this.emit(OP.SETL,limSlot);
        const stepSlot=this.declare('(for_step)');
        if(s.step)this.cExpr(s.step);else this.emit(OP.PUSHK,this.k(1));
        this.emit(OP.SETL,stepSlot);
        const top=this.here();
        this.emit(OP.GETL,iSlot);this.emit(OP.GETL,limSlot);this.emit(OP.LE);
        this.emit(OP.JZ,0);const jz=this.here()-1;
        this.enter();for(const x of s.body)this.cStmt(x);this.leave();
        this.emit(OP.GETL,iSlot);this.emit(OP.GETL,stepSlot);this.emit(OP.ADD);this.emit(OP.SETL,iSlot);
        this.emit(OP.JMP,top);this.patch(jz,this.here());
        this.leave();
        break;
      }
      default:throw new Error('cStmt unknown '+s.k);
    }
  }
}

function compileFn(parent,params,body){
  const fc=new FnCompiler(parent,params);
  for(const s of body)fc.cStmt(s);
  fc.emit(OP.PUSHNIL,OP.RET); // implicit return nil
  return {code:fc.code,consts:fc.consts,maxslot:fc.maxslot,
          upvals:fc.upvals.map(u=>({fromParentLocal:u.fromParentLocal,index:u.index})),
          nparams:params.length,protos:fc.protos};
}

function compileProgram(ast){
  // top-level is a function with no params, no parent
  return compileFn(null,[],ast);
}

module.exports={OP,compileProgram};
