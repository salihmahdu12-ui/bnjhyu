#include <stdio.h>
#include <stdlib.h>
// Minimal Lua 5.4 C API decls (avoid needing headers)
typedef struct lua_State lua_State;
extern lua_State *luaL_newstate(void);
extern void luaL_openlibs(lua_State *L);
extern int  luaL_loadstring(lua_State *L, const char *s);
extern int  lua_pcallk(lua_State *L,int nargs,int nresults,int errfunc,long ctx,void*k);
extern const char *lua_tolstring(lua_State *L,int idx,size_t *len);
extern void lua_close(lua_State *L);
extern void lua_settop(lua_State *L,int idx);

#define LUA_OK 0
static int lua_pcall_(lua_State*L,int na,int nr,int ef){return lua_pcallk(L,na,nr,ef,0,NULL);}

static char* readfile(const char*path){
  FILE*f=fopen(path,"rb"); if(!f){perror("open");exit(2);}
  fseek(f,0,SEEK_END);long n=ftell(f);fseek(f,0,SEEK_SET);
  char*b=malloc(n+1);fread(b,1,n,f);b[n]=0;fclose(f);return b;
}

int main(int argc,char**argv){
  if(argc<2){fprintf(stderr,"usage: runner file.lua\n");return 2;}
  char*code=readfile(argv[1]);
  lua_State*L=luaL_newstate();
  luaL_openlibs(L);
  if(luaL_loadstring(L,code)!=LUA_OK){
    size_t len;const char*e=lua_tolstring(L,-1,&len);
    fprintf(stderr,"SYNTAX ERROR: %s\n",e?e:"?");
    lua_close(L);return 1;
  }
  if(lua_pcall_(L,0,0,0)!=LUA_OK){
    size_t len;const char*e=lua_tolstring(L,-1,&len);
    fprintf(stderr,"RUNTIME ERROR: %s\n",e?e:"?");
    lua_close(L);return 1;
  }
  lua_close(L);
  free(code);
  return 0;
}
