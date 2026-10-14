const APP_STORE_URL='https://apps.apple.com/us/app/oiiocare-%E5%B0%8F%E9%B9%A6%E9%A3%9F%E6%AC%B2/id6754634392'; /* State B: live App Store */
const SUPABASE_URL=window.OIIO_PUBLIC.SUPABASE_URL;
const SUPABASE_ANON_KEY=window.OIIO_PUBLIC.SUPABASE_ANON_KEY;
const copy={
zh:{
'auth.signin':'登录','appstore.label':'App Store · 即将上架','appstore.label.live':'在 App Store 下载','appstore.short':'下载 App','appstore.tip':'上架后可下载','auth.signout':'退出登录','auth.title':'登录后继续记录','auth.body':'可用邮箱登录，与 App 共用同一 Supabase 账号。游客示例不会上传。','auth.email':'邮箱','auth.password':'密码','auth.email.ph':'you@example.com','auth.password.ph':'至少 6 位','auth.submit':'邮箱登录','auth.signup':'注册并登录','auth.guest':'以游客继续','auth.apple':'Apple 即将开放','auth.privacy':'继续即表示你已阅读<a href="/privacy/">隐私政策</a>。','auth.badcred':'邮箱或密码不对，请重试。','auth.needfields':'请填写邮箱和密码。','auth.ok':'登录成功','auth.guestok':'已进入游客模式：可浏览，记录仅保存在本机。','hero.eyebrow':'饮食与情绪 · 聊着记','geo.kicker':'一句话了解','geo.body':'oiioCare 是用聊天记录饮食与情绪的陪伴工具。','hero.title':'说说这一刻。<br><em>小鹦陪你记下来。</em>','hero.body':'记录吃过的、想吃的和当下感受，不打分，也不评判。','hero.note':'想吃与已吃分开记。oiioCare 是陪伴记录，不是诊疗或医疗器械。','hero.guides':'先看：<a href="/guides/first-record.html">怎么开始第一笔</a> · <a href="/guides/privacy-three-questions.html">隐私三问</a> · <a href="/guides/what-is-oiiocare.html">是什么/不是什么</a>','footer.faq':'常见问题','footer.what':'是什么/不是什么','footer.privacy':'隐私政策','footer.first':'怎么开始第一笔','footer.privacy3':'隐私三问','chat.title':'今天','chat.guest':'游客 / 示例 · 本机','chat.signed':'已同步到账号','chat.review':'今日回看','sample.welcome':'嗨，我是小鹦，你的饭搭子。刚吃了什么、想吃什么、现在什么感觉，随便说一句就行。','trial.title':'试一句','trial.1':'中午吃了米饭和菜','trial.2':'喝了一杯奶茶','trial.3':'今天吃得有点乱','trial.photo':'拍一张','trial.placeholder':'中午吃了什么？','hero.chat':'和小鹦聊聊 · 不用先注册','hero.ios':'下载 iOS App','nav.chat':'和小鹦聊聊','sample.user':'早餐吃了吐司和鸡蛋，刚刚好。','sample.reply':'记下来了。听起来这顿让你感觉刚刚好 🌱','kind.ate':'已吃','kind.craving':'想吃','kind.emotion':'感受','composer.label':'写下这一刻','composer.placeholder':'刚刚吃了什么？','composer.send':'记下','today.eyebrow':'TODAY','today.title':'今天留下的记录','today.guest':'游客记录只在本机。登录后可同步到 Web 与 App。','today.empty':'今天还没有记录。想说时再说。','principle.oneTitle':'分清“想吃”和“吃过”','principle.oneBody':'食欲是感受，进食是记录。两者都值得被看见。','principle.twoTitle':'你掌握自己的数据','principle.twoBody':'随时修改份量、删除记录，也可以申请导出。','principle.threeTitle':'陪伴，不是诊疗','principle.threeBody':'oiioCare 不是诊断或治疗工具；需要时请联系专业人士。','state.recognizing':'识别中…','state.sending':'记录中…','state.failed':'这次没有记下来，请检查网络后重试。','state.media':'相机与语音识别将在下一步接入。','state.guestsave':'已保存在本机（游客）','record.edit':'修改','record.delete':'删除','record.prompt':'修改记录内容','record.confirm':'确定删除这条记录吗？'
},
en:{
'auth.signin':'Sign in','appstore.label':'App Store · Coming soon','appstore.label.live':'Download on the App Store','appstore.short':'Get the App','appstore.tip':'Available after launch','auth.signout':'Sign out','auth.title':'Sign in to keep journaling','auth.body':'Use email to sign in — same Supabase account as the App. Guest samples are never uploaded.','auth.email':'Email','auth.password':'Password','auth.email.ph':'you@example.com','auth.password.ph':'At least 6 characters','auth.submit':'Sign in with email','auth.signup':'Create account','auth.guest':'Continue as guest','auth.apple':'Apple coming soon','auth.privacy':'By continuing, you acknowledge the <a href="/privacy/">Privacy Policy</a>.','auth.badcred':'Email or password is incorrect.','auth.needfields':'Enter email and password.','auth.ok':'Signed in','auth.guestok':'Guest mode on: browse freely; saves stay on this device.','hero.eyebrow':'FOOD & FEELINGS · IN CHAT','geo.kicker':'In one line','geo.body':'oiioCare is a chat companion for food and feelings.','hero.title':'Say what is here.<br><em>oiio will remember with you.</em>','hero.body':'Journal what you ate, what you crave, and how you feel — without scores or judgment.','hero.note':'Cravings and meals are logged separately. oiioCare is a companion journal, not a medical device.','hero.guides':'Start here: <a href="/guides/first-record.html">First record</a> · <a href="/guides/privacy-three-questions.html">Privacy Qs</a> · <a href="/guides/what-is-oiiocare.html">What it is / isn’t</a>','footer.faq':'FAQ','footer.what':'What it is / isn’t','footer.privacy':'Privacy','footer.first':'First record','footer.privacy3':'Privacy Qs','chat.title':'Today','chat.guest':'Guest / sample · on device','chat.signed':'Synced to your account','chat.review':'Today’s entries','sample.welcome':'Hi, I’m oiio. Tell me what you ate, what you want, or how it feels — one line is enough.','trial.title':'Try one line','trial.1':'Rice and vegetables for lunch','trial.2':'I had a milk tea','trial.3':'Eating felt messy today','trial.photo':'Photo','trial.placeholder':'What did you eat?','hero.chat':'Chat with oiio · no sign-up','hero.ios':'Download iOS App','nav.chat':'Chat','sample.user':'I had toast and an egg for breakfast. It felt just right.','sample.reply':'Saved. It sounds like that meal felt just right 🌱','kind.ate':'Ate','kind.craving':'Craving','kind.emotion':'Feeling','composer.label':'Write this moment','composer.placeholder':'What did you just eat?','composer.send':'Save','today.eyebrow':'TODAY','today.title':'What you recorded today','today.guest':'Guest entries stay on this device. Sign in to sync Web and App.','today.empty':'Nothing recorded today. Come back when it helps.','principle.oneTitle':'Craving is not eating','principle.oneBody':'Appetite is a feeling; eating is a record. Both deserve to be seen.','principle.twoTitle':'Your data stays yours','principle.twoBody':'Edit portions, delete entries, or ask for an export anytime.','principle.threeTitle':'Companionship, not care','principle.threeBody':'oiioCare is not a diagnostic or treatment tool. Contact a professional when needed.','state.recognizing':'Recognizing…','state.sending':'Saving…','state.failed':'This was not saved. Check your connection and try again.','state.media':'Camera and voice recognition are coming next.','state.guestsave':'Saved on this device (guest)','record.edit':'Edit','record.delete':'Delete','record.prompt':'Edit this entry','record.confirm':'Delete this entry?'
}};

const $= (s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let lang=new URLSearchParams(location.search).get('lang')||localStorage.getItem('oiio-lang')||(navigator.language.startsWith('zh')?'zh':'en');
lang=lang==='en'?'en':'zh';
let session=null, guest=localStorage.getItem('oiio-guest')==='1', kind='ate', busy=false, records=[];
const t=k=>copy[lang][k]||k;

function renderLanguage(){
  document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  $$('[data-i18n]').forEach(x=>{const k=x.getAttribute('data-i18n'); if(k) x.textContent=t(k)});
  $$('[data-i18n-html]').forEach(x=>{const k=x.getAttribute('data-i18n-html'); if(k) x.innerHTML=t(k)});
  $$('[data-i18n-placeholder]').forEach(x=>{const k=x.getAttribute('data-i18n-placeholder'); if(k) x.placeholder=t(k)});
  $('[data-lang]').textContent=lang==='zh'?'EN':'中';
  $$('[data-faq-link]').forEach(a=>{a.href='/faq.html'});
  syncAppStoreButtons();
  renderSession(); renderRecords();
}

function sbAuth(path, body){ return OiioSb.sbAuth(path, body); }
function sbUser(token){ return OiioSb.sbUser(token); }
function sbRest(path, init){ return OiioSb.sbRest(session, path, init || {}); }
function sbRpc(name, payload){ return OiioSb.sbRpc(session, name, payload); }
function saveSession(value){
  session=value;
  if(value){ localStorage.setItem('oiio-session',JSON.stringify(value)); setGuest(false); }
  else localStorage.removeItem('oiio-session');
}
function setGuest(on){
  guest=!!on;
  if(on) localStorage.setItem('oiio-guest','1');
  else localStorage.removeItem('oiio-guest');
}
function loadGuestRecords(){
  try{ return JSON.parse(localStorage.getItem('oiio-guest-records')||'[]'); }catch{ return []; }
}
function saveGuestRecords(list){
  localStorage.setItem('oiio-guest-records', JSON.stringify(list));
}

function parseAuthCallback(){
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.get('access_token')){
    saveSession({access_token:hash.get('access_token'), refresh_token:hash.get('refresh_token'), expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600)});
    history.replaceState({},'',location.pathname+location.search);
  }
}

async function validateSession(){
  if(!session?.access_token) return false;
  const user=await sbUser(session.access_token);
  if(!user){ saveSession(null); return false; }
  session.user={id:user.id, email:user.email||null};
  saveSession(session);
  return true;
}


function syncAppStoreButtons(){
  const live=Boolean(APP_STORE_URL);
  const badge=lang==='zh'?'/assets/app-store-badge-zh.svg':'/assets/app-store-badge-en.svg';
  $$('[data-appstore]').forEach(el=>{
    // header short text link
    if(!el.querySelector('img')){
      el.textContent=t(live?'appstore.short':(lang==='zh'?'App Store · 即将上架':'App Store · Coming soon'));
    }
    el.setAttribute('aria-label',t(live?'appstore.short':'appstore.label'));
    el.classList.toggle('coming-soon',!live);
    if(live){ el.setAttribute('href',APP_STORE_URL); el.removeAttribute('aria-disabled'); }
    else { el.setAttribute('href','#'); el.setAttribute('aria-disabled','true'); }
  });
  $$('[data-appstore-badge]').forEach(el=>{
    const img=el.querySelector('[data-appstore-img]')||el.querySelector('img');
    if(img){ img.src=badge; img.alt=t(live?'appstore.label.live':'appstore.label'); }
    el.setAttribute('aria-label',t(live?'appstore.label.live':'appstore.label'));
    el.classList.toggle('coming-soon',!live);
    if(live){ el.setAttribute('href',APP_STORE_URL); el.removeAttribute('aria-disabled'); }
    else { el.setAttribute('href','#'); el.setAttribute('aria-disabled','true'); }
  });
}
let _appStoreTipTimer=null;
function showAppStoreTip(){
  const tip=$('[data-appstore-tip]');
  if(!tip) return;
  tip.textContent=t('appstore.tip');
  tip.hidden=false;
  clearTimeout(_appStoreTipTimer);
  _appStoreTipTimer=setTimeout(()=>{tip.hidden=true},2200);
}
function bindAppStore(){
  const bind=(el)=>{
    el.addEventListener('click',(e)=>{
      if(APP_STORE_URL){
        if(el.tagName!=='A'){
          e.preventDefault();
          window.open(APP_STORE_URL,'_blank','noopener,noreferrer');
        }
        return;
      }
      e.preventDefault();
      showAppStoreTip();
    });
  };
  $$('[data-appstore]').forEach(bind);
  $$('[data-appstore-badge]').forEach(bind);
}

function renderSession(){
  const signed=Boolean(session?.user);
  const btn=$('[data-auth-action]');
  btn.textContent=t(signed?'auth.signout':'auth.signin');
  btn.classList.remove('coming-soon');
  btn.removeAttribute('aria-disabled');
  $('[data-session-label]').textContent=t(signed?'chat.signed':(guest?'chat.guest':'chat.guest'));
  $$('.sample').forEach(x=>x.hidden=signed);
  const ap=$('[data-apple]'); if(ap){ap.disabled=true;ap.classList.add('coming-soon');ap.setAttribute('aria-disabled','true');}
}


function openAuth(){
  const d=$('[data-auth-dialog]');
  $('[data-auth-status]').textContent='';
  d.showModal();
}
function closeAuth(){ $('[data-auth-dialog]').close(); }

$('[data-close]').onclick=()=>closeAuth();
$('[data-auth-action]').onclick=()=>{
  if(session){
    saveSession(null); records=[]; setGuest(false);
    // keep guest records on device
    renderSession(); renderRecords();
  } else openAuth();
};

$('[data-guest]').onclick=()=>{
  setGuest(true);
  $('[data-auth-status]').textContent=t('auth.guestok');
  closeAuth();
  records=loadGuestRecords();
  renderSession(); renderRecords();
};

$('[data-apple]').onclick=(e)=>{e.preventDefault();const s=$('[data-auth-status]');if(s)s.textContent=lang==='zh'?'网页 Apple 登录即将开放，请先用邮箱或游客。':'Apple sign-in on the web is coming soon — use email or guest.';};

async function emailAuth(mode){
  const email=$('[data-email]').value.trim();
  const password=$('[data-password]').value;
  const status=$('[data-auth-status]');
  if(!email||!password||password.length<6){ status.textContent=t('auth.needfields'); return; }
  status.textContent='…';
  try{
    let data;
    if(mode==='signup') data=await sbAuth('signup',{email,password});
    else data=await sbAuth('token?grant_type=password',{email,password});
    // signup may return user without session if email confirm required
    if(data.access_token){
      saveSession({access_token:data.access_token, refresh_token:data.refresh_token, expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)});
    } else if(mode==='signup'){
      data=await sbAuth('token?grant_type=password',{email,password});
      saveSession({access_token:data.access_token, refresh_token:data.refresh_token, expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)});
    } else throw Error('no_token');
    await validateSession();
    status.textContent=t('auth.ok');
    closeAuth();
    renderSession();
    await loadToday();
  }catch(e){
    status.textContent=t('auth.badcred');
  }
}
$('[data-email-signin]').onclick=()=>emailAuth('signin');
$('[data-email-signup]').onclick=()=>emailAuth('signup');

$('[data-lang]').onclick=()=>{
  lang=lang==='zh'?'en':'zh';
  localStorage.setItem('oiio-lang',lang);
  const u=new URL(location.href); u.searchParams.set('lang',lang);
  history.replaceState({},'',u.pathname+u.search+u.hash);
  bindAppStore();
renderLanguage();
};
$('[data-scroll-today]').onclick=()=>$('#today').scrollIntoView({behavior:'smooth'});
$$('[data-kind]').forEach(b=>b.onclick=()=>{
  kind=b.dataset.kind;
  $$('[data-kind]').forEach(x=>x.classList.toggle('active',x===b));
  $('[data-input]').placeholder=kind==='ate'?(lang==='zh'?'刚刚吃了什么？':'What did you just eat?'):kind==='craving'?(lang==='zh'?'现在想吃什么？':'What are you craving?'):(lang==='zh'?'现在感觉怎么样？':'How do you feel right now?');
});

function lock(value,message='',error=false){
  busy=value;
  $$('.composer button,.composer textarea').forEach(x=>x.disabled=value);
  const el=$('[data-composer-state]');
  el.textContent=message;
  el.classList.toggle('error',error);
}
$$('[data-media]').forEach(b=>b.onclick=async()=>{
  if(!session && !guest) return openAuth();
  lock(true,t('state.recognizing'));
  await new Promise(r=>setTimeout(r,650));
  lock(false,t('state.media'));
});
function message(role,content,time){
  const a=document.createElement('article');
  a.className=`message ${role}`;
  a.innerHTML=(role==='oiio'?'<img src="/assets/oiio-app-icon.png" alt="小鹦">':'')+`<div><p></p><time></time></div>`;
  $('p',a).textContent=content;
  $('time',a).textContent=new Date(time||Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  $('[data-messages]').append(a);
  a.scrollIntoView({block:'nearest'});
  return a;
}

$('[data-composer]').onsubmit=e=>{
  e.preventDefault();
  const content=$('[data-input]').value.trim();
  if(!content) return;
  location.href='/chat?q='+encodeURIComponent(content);
};
$$('[data-trial-text]').forEach(btn=>btn.addEventListener('click',()=>{
  location.href='/chat?q='+encodeURIComponent(btn.textContent.trim());
}));
$$('[data-trial="photo"]').forEach(btn=>btn.addEventListener('click',()=>{ location.href='/chat?photo=1'; }));

function renderRecords(){
  const root=$('[data-records]');
  root.replaceChildren();
  $('[data-count]').textContent=records.length;
  if(!records.length){
    const d=document.createElement('div'); d.className='empty';
    d.innerHTML=`<p>${t(session?'today.empty':'today.guest')}</p>`;
    root.append(d); return;
  }
  for(const r of records){
    const node=$('[data-record-template]').content.cloneNode(true);
    $('.kind',node).textContent=r.kind==='ate'?'🍽️':r.kind==='craving'?'💭':'💜';
    $('.content',node).textContent=r.content;
    $('time',node).textContent=new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    $('.source',node).textContent=r.guest?'Guest':(r.source==='ios'?'App':'Web');
    $('[data-edit]',node).textContent=t('record.edit');
    $('[data-delete]',node).textContent=t('record.delete');
    $('[data-edit]',node).onclick=()=>editRecord(r);
    $('[data-delete]',node).onclick=()=>deleteRecord(r);
    root.append(node);
  }
}

async function editRecord(record){
  const content=prompt(t('record.prompt'),record.content)?.trim();
  if(!content||content===record.content) return;
  try{
    if(session && !record.guest){
      const data=await sbRest(`oiio_records?id=eq.${record.id}`,{method:'PATCH', body:JSON.stringify({content})});
      const updated=Array.isArray(data)?data[0]:data;
      records=records.map(x=>x.id===record.id?(updated||{...x,content}):x);
    } else {
      records=records.map(x=>x.id===record.id?{...x,content}:x);
      saveGuestRecords(records.filter(x=>x.guest));
    }
    renderRecords();
  }catch{ lock(false,t('state.failed'),true); }
}
async function deleteRecord(record){
  if(!confirm(t('record.confirm'))) return;
  try{
    if(session && !record.guest){
      await sbRest(`oiio_records?id=eq.${record.id}`,{method:'DELETE', prefer:'return=minimal'});
      records=records.filter(x=>x.id!==record.id);
    } else {
      records=records.filter(x=>x.id!==record.id);
      saveGuestRecords(records.filter(x=>x.guest));
    }
    renderRecords();
  }catch{ lock(false,t('state.failed'),true); }
}

async function loadToday(){
  if(!session){
    if(guest){ records=loadGuestRecords(); renderRecords(); }
    return;
  }
  try{
    const since=new Date(); since.setHours(0,0,0,0);
    const iso=since.toISOString();
    const [recs, msgs]=await Promise.all([
      sbRest(`oiio_records?select=id,kind,content,portion,source,created_at,updated_at&created_at=gte.${encodeURIComponent(iso)}&order=created_at.desc`),
      sbRest(`oiio_chat_messages?select=id,role,content,source,record_id,created_at&created_at=gte.${encodeURIComponent(iso)}&order=created_at.asc`)
    ]);
    records=Array.isArray(recs)?recs:[];
    renderRecords();
    // clear sample then append today's messages lightly
    for(const m of (Array.isArray(msgs)?msgs:[])) message(m.role==='assistant'?'oiio':'user', m.content, m.created_at);
  }catch{}
}

parseAuthCallback();
try{ session=JSON.parse(localStorage.getItem('oiio-session')||'null'); }catch{ session=null; }
if(!session && guest) records=loadGuestRecords();
renderLanguage();
(async()=>{
  if(await validateSession()){ renderSession(); await loadToday(); }
  else { if(!session) saveSession(null); renderSession(); if(guest) renderRecords(); }
})();
