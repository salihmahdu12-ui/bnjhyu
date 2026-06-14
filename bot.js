// ============================================================
//  Private Discord Obfuscator Bot  (ID-locked, admin only)
//  Upload a .lua file -> bot returns the encrypted VM build.
//  Requires: npm i discord.js
//  Env vars:  DISCORD_TOKEN, ADMIN_ID  (your Discord user ID)
// ============================================================
const {Client,GatewayIntentBits,Partials,AttachmentBuilder}=require('discord.js');
const {obfuscate}=require('./emit');
const https=require('https');

const TOKEN=process.env.DISCORD_TOKEN;
const ADMIN_ID=process.env.ADMIN_ID;          // <-- your numeric Discord ID
const MAX_BYTES=512*1024;                      // 512 KB upload cap

if(!TOKEN||!ADMIN_ID){
  console.error('Set DISCORD_TOKEN and ADMIN_ID environment variables.');
  process.exit(1);
}

const client=new Client({
  intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,
           GatewayIntentBits.MessageContent,GatewayIntentBits.DirectMessages],
  partials:[Partials.Channel]   // needed to receive DMs
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

client.once('ready',()=>{
  console.log(`Logged in as ${client.user.tag}. Admin-locked to ID ${ADMIN_ID}.`);
});

client.on('messageCreate',async(msg)=>{
  if(msg.author.bot)return;

  // ---- HARD ID LOCK: silently ignore everyone except the admin ----
  if(msg.author.id!==ADMIN_ID){
    // Optional: react so you know someone tried, but never process their file.
    return;
  }

  if(msg.content.trim()==='!ping'){msg.reply('online — admin verified.');return;}

  const att=msg.attachments.first();
  if(!att){
    if(msg.content.trim()==='!help')
      msg.reply('Upload a `.lua` file and I will return the encrypted VM build. (admin-only)');
    return;
  }

  const name=(att.name||'file').toLowerCase();
  if(!name.endsWith('.lua')){msg.reply('Only `.lua` files are accepted.');return;}
  if(att.size>MAX_BYTES){msg.reply('File exceeds 512 KB limit.');return;}

  try{
    await msg.channel.sendTyping();
    const src=await fetchText(att.url);
    const out=obfuscate(src);
    const outName=name.replace(/\.lua$/,'')+'.obf.lua';
    const file=new AttachmentBuilder(Buffer.from(out,'utf8'),{name:outName});
    await msg.reply({content:`Done. Encrypted ${src.length}B -> ${out.length}B.`,files:[file]});
  }catch(e){
    await msg.reply('Error: '+e.message);
  }
});

client.login(TOKEN);
