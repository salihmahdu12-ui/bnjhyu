// ============================================================
//  Private Discord Obfuscator Bot (ID-locked, admin only)
//  DM or post a .lua file -> returns the hardened .obf.lua build.
//  npm i discord.js   |   env: DISCORD_TOKEN, ADMIN_ID
// ============================================================
const {Client,GatewayIntentBits,Partials,AttachmentBuilder}=require('discord.js');
const {obfuscate}=require('./emit');
const https=require('https');

const TOKEN=process.env.DISCORD_TOKEN;
const ADMIN_ID=process.env.ADMIN_ID;
const MAX_BYTES=512*1024;

if(!TOKEN||!ADMIN_ID){console.error('Set DISCORD_TOKEN and ADMIN_ID.');process.exit(1);}

const client=new Client({
  intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,
           GatewayIntentBits.MessageContent,GatewayIntentBits.DirectMessages],
  partials:[Partials.Channel]
});

function fetchText(url){
  return new Promise((res,rej)=>{
    https.get(url,r=>{
      if(r.statusCode!==200){rej(new Error('download HTTP '+r.statusCode));return;}
      let data='';let size=0;
      r.on('data',c=>{size+=c.length;if(size>MAX_BYTES){r.destroy();rej(new Error('file too large'));return;}data+=c;});
      r.on('end',()=>res(data));
    }).on('error',rej);
  });
}

client.once('ready',()=>{console.log(`Logged in as ${client.user.tag}. Locked to admin ID ${ADMIN_ID}.`);});

client.on('messageCreate',async(msg)=>{
  if(msg.author.bot)return;
  if(msg.author.id!==ADMIN_ID)return;            // HARD ID LOCK

  if(msg.content.trim()==='!ping'){msg.reply('online — admin verified.');return;}
  if(msg.content.trim()==='!help'){msg.reply('Upload a `.lua` file; I return the hardened `.obf.lua` build. (admin only)');return;}

  const att=msg.attachments.first();
  if(!att)return;
  const name=(att.name||'file').toLowerCase();
  if(!name.endsWith('.lua')){msg.reply('Only `.lua` files are accepted.');return;}
  if(att.size>MAX_BYTES){msg.reply('File exceeds 512 KB limit.');return;}

  try{
    await msg.channel.sendTyping();
    const src=await fetchText(att.url);
    let out;
    try{out=obfuscate(src);}
    catch(ce){await msg.reply('Compile error in your Lua: '+ce.message);return;}
    const outName=name.replace(/\.lua$/,'')+'.obf.lua';
    const file=new AttachmentBuilder(Buffer.from(out,'utf8'),{name:outName});
    await msg.reply({content:`Done. ${src.length}B -> ${out.length}B, hardened (VM + opcode remap + string enc + integrity check).`,files:[file]});
  }catch(e){await msg.reply('Error: '+e.message);}
});

client.login(TOKEN);
