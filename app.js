/* ============================================================
   Patient Referral Registry — KCPH
   Stack: single HTML + GitHub Pages + Google Apps Script + Sheets
   Reads: JSONP (Apps Script has no CORS)  |  Writes: GET-only (no preflight)
   ============================================================ */

/* ---------- CONFIG: paste your Apps Script /exec URL here ---------- */
const GAS_URL = "https://script.google.com/macros/s/AKfycbykKZ5ixJFfg2-Bfw0WvQGi1WrOVQFGHE_O7MSjp9j3LzCI1gkRPcMSnnyf1WVEverb/exec";
const LS_OUTBOX = "kcph_ref_outbox_v1";   // offline queue
const LS_CACHE  = "kcph_ref_cache_v1";    // last dashboard snapshot

/* ---------- Reference lists ---------- */
const REFERRING = [
  "មន្ទីរពេទ្យខេត្តកំពង់ឆ្នាំង","មន្ទីរពេទ្យបង្អែកកំពង់ត្រឡាច","មន្ទីរពេទ្យបង្អែកបរិបូណ៍",
  "មណ្ឌលសុខភាព ផ្សារឆ្នាំង","មណ្ឌលសុខភាព កំពង់ឆ្នាំង","មណ្ឌលសុខភាព ព្រៃខ្មែរ","មណ្ឌលសុខភាព ជើងគ្រាវ",
  "មណ្ឌលសុខភាព ស្រែថ្មី","មណ្ឌលសុខភាព ព្រៃគ្រី","មណ្ឌលសុខភាព ពាមឆ្កោក","មណ្ឌលសុខភាព កំពង់ហៅ",
  "មណ្ឌលសុខភាព ស្វាយរំពារ","មណ្ឌលសុខភាព ច្រណូក","មណ្ឌលសុខភាព ព្រះកុសុមៈ","មណ្ឌលសុខភាព ជ្រៃបាក់",
  "មណ្ឌលសុខភាព ប្រឡាយមាស","មណ្ឌលសុខភាព ផ្លូវទូក","មណ្ឌលសុខភាព ព្រៃមូល","មណ្ឌលសុខភាព អភិវឌ្ឍន៍",
  "មណ្ឌលសុខភាព ចោងម៉ោង","មណ្ឌលសុខភាព ជៀប","មណ្ឌលសុខភាព តាំងក្រសាំង","មណ្ឌលសុខភាព ក្បាលទឹក",
  "មណ្ឌលសុខភាព កំពង់ត្រឡាចលើ","មណ្ឌលសុខភាព ច្រេស","មណ្ឌលសុខភាព សាលាលេខ៥","មណ្ឌលសុខភាព អំពិលទឹក",
  "មណ្ឌលសុខភាព តាជេស","មណ្ឌលសុខភាព សែប","មណ្ឌលសុខភាព លង្វែក","មណ្ឌលសុខភាព កោះថ្កូវ",
  "មណ្ឌលសុខភាព ស្វាយជុក","មណ្ឌលសុខភាព ស្វាយ","មណ្ឌលសុខភាព ក្រាំងល្វា","មណ្ឌលសុខភាព ធ្លកវៀន",
  "មណ្ឌលសុខភាព ពាម","មណ្ឌលសុខភាព ត្បែងខ្ពស់","មណ្ឌលសុខភាព ឈូកស","មណ្ឌលសុខភាព ឆ្នុកទ្រូ",
  "មណ្ឌលសុខភាព ផ្សារ","មណ្ឌលសុខភាព ពន្លៃ","មណ្ឌលសុខភាព ត្រពាំងចាន់","មណ្ឌលសុខភាព ពង្រ",
  "មណ្ឌលសុខភាព ស្វាយជ្រុំ","មណ្ឌលសុខភាព ពេជចង្វារ","មណ្ឌលសុខភាព ក្រាំងលាវ","មណ្ឌលសុខភាព ក្រាំងស្គារ",
  "មណ្ឌលសុខភាព ក្តុល"
];
const RECEIVING = [
  "មន្ទីរពេទ្យខេត្តកំពង់ឆ្នាំង",
  "មន្ទីរពេទ្យកាលម៉ែត","មន្ទីរពេទ្យមិត្តភាពកម្ពុជាចិនព្រះកុសុម៉ះ","មន្ទីរពេទ្យមិត្តភាពខ្មែរសូវៀត",
  "មន្ទីរពេទ្យគន្ធបុប្ផា","មន្ទីរពេទ្យកុមារជាតិ","មជ្ឈមណ្ឌលជាតិគាំពារមាតានិងទារក","មន្ទីរពេទ្យព្រះកេតុមាលា",
  "មន្ទីរពេទ្យតេជោសន្តិភាព","មន្ទីរពេទ្យព្រះអង្គឌួង","មន្ទីរពេទ្យព្រះសីហនុមណ្ឌលនៃក្តីសង្ឃឹម",
  "មន្ទីរពេទ្យរ៉ួយ៉ាល់ភ្នំពេញ","ផ្សេងៗ"
];
const WARDS = ["Chirurgie","Medicine Gén","ICU","Gyneco","Maternité","Pédiatrie","ផ្សេងៗ"];
const URGENCY = ["បន្ទាន់ (Emergency)","មិនបន្ទាន់ (Non-emergency)"];
const DIRECTION = ["ចេញ (Out — KCPH → higher level)","ចូល (In — HC/RH → KCPH)"];
const AGEUNIT = ["ឆ្នាំ (Years)","ខែ (Months)"];
const SEX = ["ប្រុស (Male)","ស្រី (Female)"];
const DX_CAT = [
  "ជំងឺសរសៃឈាមបេះដូង (Cardiovascular)","ជំងឺផ្លូវដង្ហើម (Respiratory)","ជំងឺរំលាយអាហារ (Digestive)",
  "ជំងឺប្រព័ន្ធសរសៃប្រសាទ (Neurological)","ជំងឺស្ត្រី (Gynecological)","ជំងឺមាតាភាព (Obstetric)",
  "ជំងឺកុមារ/ទារកទើបនឹងកើត (Pediatric/Neonatal)","របួស/គ្រោះថ្នាក់ (Trauma/Injury)",
  "ជំងឺឆ្លងមេរោគ (Infectious)","ជំងឺមហារីក (Cancer/Oncology)","ជំងឺនោមផ្អែម (Diabetes/Endocrine)",
  "ជំងឺតម្រងនោម/ផ្លូវទឹកនោម (Renal/Urological)","ជំងឺស្បែក (Dermatological)","ជំងឺភ្នែក (Ophthalmology)",
  "ជំងឺ ត្រចៀក-ច្រមុះ-បំពង់ក (ENT)","ពុលឈាម (Sepsis)","ជំងឺមិនទាន់កំណត់ (Undiagnosed)","ផ្សេងៗ (Others)"
];
const REASON = [
  "ខ្វះឧបករណ៍ពិនិត្យរោគ (Lack of diagnostic capacity)","ខ្វះឧបករណ៍/សមត្ថភាពវះកាត់ (Lack of surgical capacity)",
  "ខ្វះឈាម (Blood shortage)","ខ្វះឱសថ/សម្ភារៈ (Drug/supply shortage)",
  "ត្រូវការគ្រូពេទ្យឯកទេស (Need specialist)","ត្រូវការ ICU/ថែទាំដែនពិសេស (Need ICU/critical care)",
  "ស្ថានភាពធ្ងន់ធ្ងរ/មិនស្ថិតស្ថេរ (Critical/unstable)","ជំងឺស្មុគស្មាញ (Complex case)",
  "លើសសមត្ថភាពមូលដ្ឋាន (Beyond facility level)","អ្នកជំងឺ/គ្រួសារស្នើសុំ (Patient/family request)",
  "ក្រៅម៉ោងធ្វើការ (After-hours, no service)","ផ្សេងៗ (Others)"
];
const OUTCOME = [
  "ចូលសម្រាកព្យាបាល (Admitted)","ព្យាបាលរួចឲ្យត្រឡប់ (Treated & discharged)","បញ្ជូនបន្ត (Referred onward)",
  "មិនទទួល/បដិសេធ (Not accepted)","ស្លាប់ (Died)","មិនបានទៅដល់ (Did not arrive)","មិនទាន់ដឹង (Unknown)","ផ្សេងៗ (Others)"
];
const COMPLETE = ["ពេញលេញ (Complete)","មិនពេញលេញ (Incomplete)"];
const FEEDBACK = [
  "ពេញលេញល្អ — គ្មានយោបល់ (Complete, no comment)","បន្ថែមប្រវត្តិ/សញ្ញាតម្អូញ (Add history/complaint)",
  "បន្ថែមលទ្ធផលពិនិត្យ/តេស្ត (Add exam/test results)","បន្ថែមសញ្ញាជីវិត (Add vital signs)",
  "បញ្ជាក់រោគវិនិច្ឆ័យ (Clarify diagnosis)","បញ្ជាក់មូលហេតុបញ្ជូន (Clarify referral reason)",
  "គួរធ្វើ stabilization មុនបញ្ជូន (Stabilize before referral)","គួរពិគ្រោះទូរស័ព្ទមុនបញ្ជូន (Call/consult first)",
  "ការបញ្ជូនមិនចាំបាច់ (Unnecessary referral)","ផ្សេងៗ (Others)"
];

/* ---------- Field definitions (order = sheet columns) ---------- */
const FIELDS = [
  {k:"date",      km:"កាលបរិច្ឆេទ",     en:"Date"},
  {k:"from",      km:"មូលដ្ឋានបញ្ជូន",  en:"Referring facility"},
  {k:"ftype",     km:"ប្រភេទមូលដ្ឋាន",  en:"Facility type"},
  {k:"urgency",   km:"ប្រភេទបញ្ជូន",    en:"Urgency"},
  {k:"direction", km:"ទិសដៅ",           en:"Direction"},
  {k:"code",      km:"លេខកូដ",          en:"Patient code"},
  {k:"age",       km:"អាយុ",            en:"Age"},
  {k:"ageunit",   km:"ឯកតាអាយុ",        en:"Age unit"},
  {k:"sex",       km:"ភេទ",             en:"Sex"},
  {k:"dxcat",     km:"ក្រុមរោគ",        en:"Diagnosis category"},
  {k:"dxtext",    km:"រោគជាក់លាក់",     en:"Specific diagnosis"},
  {k:"reason",    km:"មូលហេតុបញ្ជូន",   en:"Reason"},
  {k:"to",        km:"មូលដ្ឋានទទួល",   en:"Receiving facility"},
  {k:"ward",      km:"ផ្នែក",           en:"Ward"},
  {k:"outcome",   km:"លទ្ធផល",          en:"Outcome"},
  {k:"complete",  km:"ភាពពេញលេញ",      en:"Completeness"},
  {k:"feedback",  km:"មតិកែលម្អ",       en:"Feedback"},
  {k:"remark",    km:"កំណត់សម្គាល់",    en:"Remark"}
];

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function fill(sel, arr, placeholder){
  const el = $(sel); el.innerHTML="";
  if(placeholder){ const o=document.createElement("option"); o.value=""; o.textContent=placeholder; el.appendChild(o); }
  arr.forEach(v=>{ const o=document.createElement("option"); o.value=v; o.textContent=v; el.appendChild(o); });
}
function facilityType(name){
  if(!name) return "";
  if(name.includes("ខេត្ត")) return "មន្ទីរពេទ្យខេត្ត (Provincial Hospital)";
  if(name.includes("បង្អែក")) return "មន្ទីរពេទ្យបង្អែក (Referral Hospital)";
  if(name.includes("មណ្ឌលសុខភាព")) return "មណ្ឌលសុខភាព (Health Center)";
  return "ផ្សេងៗ (Other)";
}
function toast(msg, type){
  const t=$("#toast"); t.textContent=msg; t.className="show "+(type||"");
  clearTimeout(t._h); t._h=setTimeout(()=>t.className="",3200);
}
function uid(){ return "R"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function todayISO(){ const d=new Date(); return d.toISOString().slice(0,10); }

/* ---------- Populate all dropdowns ---------- */
function initDropdowns(){
  fill("#f_from", REFERRING, "— ជ្រើសរើស · select —");
  fill("#f_urgency", URGENCY, "— ជ្រើសរើស —");
  fill("#f_direction", DIRECTION, "— ជ្រើសរើស —");
  fill("#f_ageunit", AGEUNIT); $("#f_ageunit").value=AGEUNIT[0];
  fill("#f_sex", SEX, "— ជ្រើសរើស —");
  fill("#f_dxcat", DX_CAT, "— ជ្រើសរើស —");
  fill("#f_reason", REASON, "— ជ្រើសរើស —");
  fill("#f_to", RECEIVING, "— ជ្រើសរើស —");
  fill("#f_ward", WARDS, "— ជ្រើសរើស —");
  fill("#f_outcome", OUTCOME, "— ជ្រើសរើស —");
  fill("#f_complete", COMPLETE, "— ជ្រើសរើស —");
  fill("#f_feedback", FEEDBACK, "— ជ្រើសរើស —");
  // dashboard filters
  fill("#fl_facility", REFERRING, "ទាំងអស់ · All");
  fill("#fl_dx", DX_CAT, "ទាំងអស់ · All");
  $("#f_date").value = todayISO();
}

/* auto facility-type hint */
function bindTypeHint(){
  $("#f_from").addEventListener("change", e=>{
    const t=facilityType(e.target.value);
    $("#typeHint").textContent = t ? "ប្រភេទ · Type: "+t : "";
  });
}

/* ============================================================
   FORM: collect, validate, save (optimistic + offline outbox)
   ============================================================ */
function collectForm(){
  return {
    id: uid(),
    date: $("#f_date").value,
    from: $("#f_from").value,
    ftype: facilityType($("#f_from").value),
    urgency: $("#f_urgency").value,
    direction: $("#f_direction").value,
    code: $("#f_code").value.trim(),
    age: $("#f_age").value,
    ageunit: $("#f_ageunit").value,
    sex: $("#f_sex").value,
    dxcat: $("#f_dxcat").value,
    dxtext: $("#f_dxtext").value.trim(),
    reason: $("#f_reason").value,
    to: $("#f_to").value,
    ward: $("#f_ward").value,
    outcome: $("#f_outcome").value,
    complete: $("#f_complete").value,
    feedback: $("#f_feedback").value,
    remark: $("#f_remark").value.trim(),
    ts: new Date().toISOString()
  };
}
function validate(r){
  const need=[["date","កាលបរិច្ឆេទ"],["from","មូលដ្ឋានបញ្ជូន"],["urgency","ប្រភេទបញ្ជូន"],
    ["age","អាយុ"],["sex","ភេទ"],["dxcat","ក្រុមរោគ"],["reason","មូលហេតុបញ្ជូន"],["to","មូលដ្ឋានទទួល"]];
  for(const [k,label] of need){ if(!r[k]&&r[k]!==0||r[k]===""){ return "សូមបំពេញ · Please fill: "+label; } }
  if(r.age<0||r.age>130) return "អាយុមិនត្រឹមត្រូវ · Invalid age";
  return null;
}
function clearForm(){
  ["f_code","f_age","f_dxtext","f_remark"].forEach(id=>$("#"+id).value="");
  ["f_from","f_urgency","f_direction","f_sex","f_dxcat","f_reason","f_to","f_ward","f_outcome","f_complete","f_feedback"].forEach(id=>$("#"+id).selectedIndex=0);
  $("#f_ageunit").value=AGEUNIT[0];
  $("#f_date").value=todayISO();
  $("#typeHint").textContent="";
  $("#f_from").focus();
}

/* Offline outbox */
function getOutbox(){ try{return JSON.parse(localStorage.getItem(LS_OUTBOX)||"[]")}catch{return[]} }
function setOutbox(a){ localStorage.setItem(LS_OUTBOX, JSON.stringify(a)); updateNetbar(); }
function queueRecord(r){ const o=getOutbox(); o.push(r); setOutbox(o); }
function updateNetbar(){
  const n=getOutbox().length;
  const bar=$("#netbar");
  if(n>0){ bar.classList.add("show"); $("#netmsg").textContent=`មាន ${n} កំណត់ត្រាមិនទាន់ផ្ញើ។ ត្រូវបានរក្សាទុកក្នុងឧបករណ៍ (${n} record(s) pending upload).`; }
  else bar.classList.remove("show");
}

/* Send one record to GAS via GET (no preflight). Returns Promise. */
function sendToGAS(params){
  return new Promise((resolve,reject)=>{
    const cb="cb_"+Math.random().toString(36).slice(2);
    const timer=setTimeout(()=>{ cleanup(); reject(new Error("timeout")); }, 15000);
    function cleanup(){ clearTimeout(timer); delete window[cb]; s.remove(); }
    window[cb]=(res)=>{ cleanup(); resolve(res); };
    const qs=Object.entries(params).map(([k,v])=>encodeURIComponent(k)+"="+encodeURIComponent(v??"")).join("&");
    const s=document.createElement("script");
    s.src=GAS_URL+"?"+qs+"&callback="+cb;
    s.onerror=()=>{ cleanup(); reject(new Error("network")); };
    document.body.appendChild(s);
  });
}

/* Flush outbox to server */
let flushing=false;
async function flushOutbox(silent){
  if(flushing) return;
  const box=getOutbox(); if(!box.length){ if(!silent) toast("គ្មានទិន្នន័យត្រូវផ្ញើ · Nothing to send","warn"); return; }
  flushing=true;
  let sent=0, remain=[...box];
  for(const r of box){
    try{
      await sendToGAS({action:"submit", ...r});
      sent++; remain=remain.filter(x=>x.id!==r.id); setOutbox(remain);
    }catch(e){ break; } // stop on first failure, keep the rest queued
  }
  flushing=false;
  if(sent>0 && !silent) toast(`✓ ផ្ញើ ${sent} កំណត់ត្រា · uploaded ${sent}`, "ok");
  else if(sent>0 && silent) toast(`✓ ផ្ញើ ${sent} កំណត់ត្រាដែលរង់ចាំ · synced ${sent} pending`, "ok");
  if(getOutbox().length && !silent) toast("នៅមានទិន្នន័យមិនទាន់ផ្ញើ · some records still pending","warn");
}

/* Save handler — optimistic: queue locally, then attempt upload */
async function onSave(){
  const r=collectForm();
  const err=validate(r);
  if(err){ toast(err,"err"); return; }
  const btn=$("#saveBtn"); btn.disabled=true;
  queueRecord(r);                 // optimistic local save
  clearForm();
  toast("✓ រក្សាទុករួច · saved","ok");
  try{ await flushOutbox(true); }catch{}
  btn.disabled=false;
}

/* ============================================================
   DASHBOARD: JSONP list read, cache, render
   ============================================================ */
let ALL=[];   // server records
function jsonpList(){
  return new Promise((resolve,reject)=>{
    const cb="cb_"+Math.random().toString(36).slice(2);
    const timer=setTimeout(()=>{ cleanup(); reject(new Error("timeout")); },15000);
    function cleanup(){ clearTimeout(timer); delete window[cb]; s.remove(); }
    window[cb]=(res)=>{ cleanup(); resolve(res); };
    const s=document.createElement("script");
    s.src=GAS_URL+"?action=list&callback="+cb;
    s.onerror=()=>{ cleanup(); reject(new Error("network")); };
    document.body.appendChild(s);
  });
}
async function loadDashboard(){
  $("#loadingRow").style.display="block";
  try{
    await flushOutbox(true);               // sync pending first
    const res=await jsonpList();
    ALL=(res&&res.data)?res.data:[];
    localStorage.setItem(LS_CACHE, JSON.stringify(ALL));
  }catch(e){
    // fall back to cache
    try{ ALL=JSON.parse(localStorage.getItem(LS_CACHE)||"[]"); }catch{ ALL=[]; }
    toast("ប្រើទិន្នន័យ cache (offline) · showing cached data","warn");
  }
  $("#loadingRow").style.display="none";
  renderAll();
}

function applyFilters(rows){
  const from=$("#fl_from").value, to=$("#fl_to").value;
  const fac=$("#fl_facility").value, dx=$("#fl_dx").value;
  const q=$("#fl_search").value.trim().toLowerCase();
  return rows.filter(r=>{
    if(from && (r.date||"")<from) return false;
    if(to && (r.date||"")>to) return false;
    if(fac && r.from!==fac) return false;
    if(dx && r.dxcat!==dx) return false;
    if(q){
      const hay=[r.code,r.dxtext,r.dxcat,r.from,r.to,r.reason,r.remark].join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderAll(){
  const rows=applyFilters(ALL);
  renderStats(rows);
  renderCharts(rows);
  renderTable(rows);
  updateNetbar();
}

function renderStats(rows){
  const total=rows.length;
  const emerg=rows.filter(r=>(r.urgency||"").includes("Emergency")).length;
  const incomplete=rows.filter(r=>(r.complete||"").includes("Incomplete")).length;
  const died=rows.filter(r=>(r.outcome||"").includes("Died")).length;
  const compRate= total ? Math.round((total-incomplete)/total*100) : 0;
  const S=$("#stats");
  S.innerHTML=`
    <div class="stat accent-t"><div class="v">${total}</div><div class="l">សរុប · Total referrals</div></div>
    <div class="stat accent-r"><div class="v">${emerg}</div><div class="l">បន្ទាន់ · Emergency</div></div>
    <div class="stat accent-g"><div class="v">${compRate}%</div><div class="l">ឯកសារពេញលេញ · Documentation complete</div></div>
    <div class="stat accent-a"><div class="v">${incomplete}</div><div class="l">ឯកសារមិនពេញលេញ · Incomplete</div></div>
    <div class="stat accent-r"><div class="v">${died}</div><div class="l">ស្លាប់ · Died</div></div>`;
}

function topCounts(rows, key, n){
  const m={};
  rows.forEach(r=>{ const v=r[key]||"—"; m[v]=(m[v]||0)+1; });
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n);
}
function barBlock(title, pairs, total){
  if(!pairs.length) return "";
  const max=Math.max(...pairs.map(p=>p[1]))||1;
  const rowsHtml=pairs.map(([lbl,c])=>`
    <div class="bar-row">
      <div class="bar-lbl" title="${lbl}">${lbl}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(c/max*100)}%"></div></div>
      <div class="bar-val">${c}</div>
    </div>`).join("");
  return `<div class="barlist"><h3>${title}</h3>${rowsHtml}</div>`;
}
function renderCharts(rows){
  const c=$("#charts");
  c.innerHTML =
    barBlock("មូលដ្ឋានបញ្ជូនច្រើនជាងគេ · Top referring facilities", topCounts(rows,"from",8)) +
    barBlock("ក្រុមរោគច្រើនជាងគេ · Top diagnosis categories", topCounts(rows,"dxcat",8)) +
    barBlock("មូលហេតុបញ្ជូន · Reasons for referral", topCounts(rows,"reason",8));
}

function pill(val){
  if((val||"").includes("Emergency")) return `<span class="pill pill-em">${val}</span>`;
  if((val||"").includes("Non-emergency")) return `<span class="pill pill-ne">${val}</span>`;
  if((val||"").includes("Incomplete")) return `<span class="pill pill-inc">${val}</span>`;
  if((val||"").includes("Complete")) return `<span class="pill pill-com">${val}</span>`;
  return val||"";
}
function renderTable(rows){
  const cols=[
    ["date","កាលបរិច្ឆេទ"],["from","ពីមូលដ្ឋាន"],["urgency","បន្ទាន់"],
    ["code","កូដ"],["age","អាយុ"],["sex","ភេទ"],["dxcat","ក្រុមរោគ"],
    ["reason","មូលហេតុ"],["to","ទៅមូលដ្ឋាន"],["outcome","លទ្ធផល"],["complete","ឯកសារ"]
  ];
  $("#thead").innerHTML = cols.map(c=>`<th>${c[1]}</th>`).join("") + "<th>សកម្មភាព</th>";
  const tb=$("#tbody");
  if(!rows.length){
    tb.innerHTML=`<tr><td colspan="${cols.length+1}"><div class="empty"><div class="ic">📭</div>គ្មានទិន្នន័យ · No records match your filters</div></td></tr>`;
    return;
  }
  const sorted=[...rows].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.ts||"").localeCompare(a.ts||""));
  tb.innerHTML=sorted.map(r=>{
    const cells=cols.map(([k])=>{
      let v=r[k]||"";
      if(k==="age"&&v){ v=v+" "+((r.ageunit||"").includes("Months")?"ខែ":"ឆ្នាំ"); }
      if(k==="urgency"||k==="complete") return `<td>${pill(v)}</td>`;
      return `<td>${v}</td>`;
    }).join("");
    return `<tr>${cells}<td style="white-space:nowrap">
      <button class="rowbtn" title="Edit" onclick="openEdit('${r.id}')">✏️</button>
      <button class="rowbtn" title="Delete" onclick="delRecord('${r.id}')">🗑️</button></td></tr>`;
  }).join("");
}

/* ============================================================
   EDIT / DELETE (per-record id)
   ============================================================ */
function openEdit(id){
  const r=ALL.find(x=>x.id===id); if(!r) return;
  const body=$("#editBody");
  const sel=(id2,arr,val)=>`<select id="e_${id2}">${arr.map(o=>`<option ${o===val?"selected":""}>${o}</option>`).join("")}</select>`;
  body.innerHTML=`
    <div class="grid">
      <div class="field"><label>កាលបរិច្ឆេទ · Date</label><input type="date" id="e_date" value="${r.date||""}"></div>
      <div class="field"><label>មូលដ្ឋានបញ្ជូន · Referring</label>${sel("from",REFERRING,r.from)}</div>
      <div class="field"><label>ប្រភេទបញ្ជូន · Urgency</label>${sel("urgency",URGENCY,r.urgency)}</div>
      <div class="field"><label>ទិសដៅ · Direction</label>${sel("direction",DIRECTION,r.direction)}</div>
      <div class="field"><label>លេខកូដ · Code</label><input type="text" id="e_code" value="${r.code||""}"></div>
      <div class="field"><label>អាយុ · Age</label><div class="age-row"><input type="number" id="e_age" value="${r.age||""}">${sel("ageunit",AGEUNIT,r.ageunit)}</div></div>
      <div class="field"><label>ភេទ · Sex</label>${sel("sex",SEX,r.sex)}</div>
      <div class="field"><label>ក្រុមរោគ · Dx category</label>${sel("dxcat",DX_CAT,r.dxcat)}</div>
      <div class="field"><label>រោគជាក់លាក់ · Specific dx</label><input type="text" id="e_dxtext" value="${r.dxtext||""}"></div>
      <div class="field full"><label>មូលហេតុ · Reason</label>${sel("reason",REASON,r.reason)}</div>
      <div class="field"><label>មូលដ្ឋានទទួល · Receiving</label>${sel("to",RECEIVING,r.to)}</div>
      <div class="field"><label>ផ្នែក · Ward</label>${sel("ward",WARDS,r.ward)}</div>
      <div class="field"><label>លទ្ធផល · Outcome</label>${sel("outcome",OUTCOME,r.outcome)}</div>
      <div class="field"><label>ភាពពេញលេញ · Completeness</label>${sel("complete",COMPLETE,r.complete)}</div>
      <div class="field full"><label>មតិកែលម្អ · Feedback</label>${sel("feedback",FEEDBACK,r.feedback)}</div>
      <div class="field full"><label>កំណត់សម្គាល់ · Remark</label><textarea id="e_remark">${r.remark||""}</textarea></div>
    </div>
    <div class="actions" style="margin-top:16px">
      <button class="btn btn-primary" onclick="saveEdit('${r.id}')">💾 រក្សាទុក · Update</button>
      <button class="btn btn-ghost" onclick="closeEdit()">បោះបង់ · Cancel</button>
    </div>`;
  $("#editModal").classList.add("show");
}
function closeEdit(){ $("#editModal").classList.remove("show"); }
async function saveEdit(id){
  const g=k=>{ const el=$("#e_"+k); return el?el.value:""; };
  const upd={ action:"update", id,
    date:g("date"), from:g("from"), ftype:facilityType(g("from")), urgency:g("urgency"),
    direction:g("direction"), code:g("code"), age:g("age"), ageunit:g("ageunit"), sex:g("sex"),
    dxcat:g("dxcat"), dxtext:g("dxtext"), reason:g("reason"), to:g("to"), ward:g("ward"),
    outcome:g("outcome"), complete:g("complete"), feedback:g("feedback"), remark:g("remark") };
  try{
    await sendToGAS(upd);
    const i=ALL.findIndex(x=>x.id===id); if(i>=0) ALL[i]={...ALL[i],...upd};
    localStorage.setItem(LS_CACHE, JSON.stringify(ALL));
    closeEdit(); renderAll(); toast("✓ កែសម្រួលរួច · updated","ok");
  }catch{ toast("ផ្ញើមិនបាន · update failed, check connection","err"); }
}
async function delRecord(id){
  if(!confirm("លុបកំណត់ត្រានេះ? · Delete this record?")) return;
  try{
    await sendToGAS({action:"delete", id});
    ALL=ALL.filter(x=>x.id!==id);
    localStorage.setItem(LS_CACHE, JSON.stringify(ALL));
    renderAll(); toast("✓ លុបរួច · deleted","ok");
  }catch{ toast("លុបមិនបាន · delete failed","err"); }
}

/* ============================================================
   EXPORTS: Excel (SheetJS) + Print/PDF (browser)
   ============================================================ */
function exportXLSX(){
  const rows=applyFilters(ALL);
  if(!rows.length){ toast("គ្មានទិន្នន័យ · nothing to export","warn"); return; }
  const header=FIELDS.map(f=>f.en);
  const aoa=[header];
  rows.forEach(r=> aoa.push(FIELDS.map(f=>r[f.k]??"")));
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"]=FIELDS.map(f=>({wch: f.k==="remark"||f.k==="dxtext"?26:16}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Referrals");
  const d=todayISO();
  XLSX.writeFile(wb, `KCPH_Referrals_${d}.xlsx`);
  toast("✓ នាំចេញ Excel · exported","ok");
}
/* ---------- Comprehensive summary report (print → PDF) ----------
   Aggregated statistics only — no per-entry detail rows. Respects
   the dashboard filters (date range, facility, diagnosis, search). */
function pct(n,total){ return total ? (Math.round(n/total*1000)/10).toFixed(1)+"%" : "0%"; }
function ageYears(r){
  var a=parseFloat(r.age); if(isNaN(a)) return null;
  return (String(r.ageunit||"").indexOf("Months")>=0) ? a/12 : a;
}
var AGE_ORDER=["<1 ឆ្នាំ (infant)","1–4 ឆ្នាំ","5–14 ឆ្នាំ","15–24 ឆ្នាំ","25–44 ឆ្នាំ","45–64 ឆ្នាំ","65+ ឆ្នាំ","មិនស្គាល់ (unknown)"];
function ageGroup(r){
  var y=ageYears(r);
  if(y===null) return "មិនស្គាល់ (unknown)";
  if(y<1) return "<1 ឆ្នាំ (infant)";
  if(y<5) return "1–4 ឆ្នាំ";
  if(y<15) return "5–14 ឆ្នាំ";
  if(y<25) return "15–24 ឆ្នាំ";
  if(y<45) return "25–44 ឆ្នាំ";
  if(y<65) return "45–64 ឆ្នាំ";
  return "65+ ឆ្នាំ";
}
function freqMap(rows,keyFn){
  var m={};
  rows.forEach(function(r){ var v=keyFn(r); v=(v===""||v==null)?"— (មិនបានបំពេញ · blank)":v; m[v]=(m[v]||0)+1; });
  return m;
}
function pairsByCount(m){ return Object.entries(m).sort(function(a,b){return b[1]-a[1];}); }
function repFreqTable(pairs,total,col1){
  var body=pairs.map(function(p){
    return "<tr><td>"+p[0]+"</td><td class='num'>"+p[1]+"</td><td class='num'>"+pct(p[1],total)+"</td></tr>";
  }).join("");
  var totalRow="<tr class='total-row'><td>សរុប · Total</td><td class='num'>"+total+"</td><td class='num'>100%</td></tr>";
  return "<table class='rep'><thead><tr><th>"+col1+"</th><th class='num'>n</th><th class='num'>%</th></tr></thead><tbody>"+body+totalRow+"</tbody></table>";
}
function repSection(title,tableHtml){ return "<div class='rep-sec'><h3>"+title+"</h3>"+tableHtml+"</div>"; }
function repPair(t1,h1,t2,h2){
  return "<div class='rep-cols'><div class='rep-sec'><h3>"+t1+"</h3>"+h1+"</div>"+
         "<div class='rep-sec'><h3>"+t2+"</h3>"+h2+"</div></div>";
}
function ageTableHtml(rows,total){
  var m=freqMap(rows,ageGroup);
  var pairs=AGE_ORDER.filter(function(g){return m[g];}).map(function(g){return [g,m[g]];});
  return repFreqTable(pairs,total,"ក្រុមអាយុ · Age group");
}
/* QI cross-tab: documentation completeness per referring facility */
function completenessByFacilityHtml(rows){
  var m={};
  rows.forEach(function(r){
    var f=r.from||"— (blank)"; if(!m[f]) m[f]={c:0,i:0,t:0};
    m[f].t++;
    if(String(r.complete||"").indexOf("Incomplete")>=0) m[f].i++;
    else if(String(r.complete||"").indexOf("Complete")>=0) m[f].c++;
  });
  var arr=Object.entries(m).sort(function(a,b){return b[1].t-a[1].t;});
  var body=arr.map(function(e){
    var f=e[0],o=e[1], assessed=o.c+o.i, rate=assessed?Math.round(o.c/assessed*100):null;
    var hl=(rate!==null&&rate<80)?" style='background:#fdf1e2'":"";
    return "<tr"+hl+"><td>"+f+"</td><td class='num'>"+o.t+"</td><td class='num'>"+o.c+"</td><td class='num'>"+o.i+"</td><td class='num'>"+(rate===null?"—":rate+"%")+"</td></tr>";
  }).join("");
  return "<table class='rep'><thead><tr><th>មូលដ្ឋានបញ្ជូន · Referring facility</th><th class='num'>សរុប</th><th class='num'>ពេញលេញ</th><th class='num'>មិនពេញលេញ</th><th class='num'>អត្រា · Rate</th></tr></thead><tbody>"+body+"</tbody></table>";
}
function buildReportHTML(){
  var rows=applyFilters(ALL);
  if(!rows.length) return null;
  var total=rows.length;

  // filter context line
  var from=$("#fl_from").value,to=$("#fl_to").value,fac=$("#fl_facility").value,dx=$("#fl_dx").value,q=$("#fl_search").value.trim();
  var ctx=[];
  if(from||to) ctx.push("កំឡុងពេល · Period: "+(from||"…")+" → "+(to||"…"));
  if(fac) ctx.push("មូលដ្ឋានបញ្ជូន · Referring: "+fac);
  if(dx) ctx.push("ក្រុមរោគ · Dx: "+dx);
  if(q) ctx.push("ស្វែងរក · Search: “"+q+"”");
  var ctxHtml=ctx.length?ctx.join(" &nbsp;·&nbsp; "):"ទិន្នន័យទាំងអស់ · All records (no filter)";

  // KPIs
  var emerg=rows.filter(function(r){return String(r.urgency||"").indexOf("(Emergency)")>=0;}).length;
  var incomplete=rows.filter(function(r){return String(r.complete||"").indexOf("Incomplete")>=0;}).length;
  var complete=rows.filter(function(r){return String(r.complete||"").indexOf("Complete")>=0 && String(r.complete||"").indexOf("Incomplete")<0;}).length;
  var assessed=complete+incomplete;
  var docRate=assessed?Math.round(complete/assessed*100)+"%":"—";
  var died=rows.filter(function(r){return String(r.outcome||"").indexOf("Died")>=0;}).length;

  function kpi(v,l){return "<div class='k'><div class='v'>"+v+"</div><div class='l'>"+l+"</div></div>";}
  var kpiHtml="<div class='rep-kpi'>"+
    kpi(total,"សរុប · Total referrals")+
    kpi(emerg+" · "+pct(emerg,total),"បន្ទាន់ · Emergency")+
    kpi(docRate,"ឯកសារពេញលេញ · Doc complete (of assessed)")+
    kpi(incomplete,"មិនពេញលេញ · Incomplete")+
    kpi(died+" · "+pct(died,total),"ស្លាប់ · Died")+"</div>";

  // aggregate tables
  var tFtype   = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.ftype;})),total,"ប្រភេទមូលដ្ឋាន · Facility type");
  var tDir     = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.direction;})),total,"ទិសដៅ · Direction");
  var tUrg     = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.urgency;})),total,"ប្រភេទបញ្ជូន · Urgency");
  var tComp    = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.complete;})),total,"ភាពពេញលេញ · Completeness");
  var tSex     = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.sex;})),total,"ភេទ · Sex");
  var tAge     = ageTableHtml(rows,total);
  var tDx      = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.dxcat;})),total,"ក្រុមរោគវិនិច្ឆ័យ · Diagnosis category");
  var tReason  = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.reason;})),total,"មូលហេតុបញ្ជូន · Reason for referral");
  var tTo      = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.to;})),total,"មូលដ្ឋានទទួល · Receiving facility");
  var tWard    = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.ward;})),total,"ផ្នែក · Ward");
  var tOutcome = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.outcome;})),total,"លទ្ធផល · Outcome");
  var tFeed    = repFreqTable(pairsByCount(freqMap(rows,function(r){return r.feedback;})),total,"មតិកែលម្អ · Feedback");
  var tCompFac = completenessByFacilityHtml(rows);

  var now=new Date();
  var pad=function(x){return String(x).padStart(2,"0");};
  var gen=now.getFullYear()+"-"+pad(now.getMonth()+1)+"-"+pad(now.getDate())+" "+pad(now.getHours())+":"+pad(now.getMinutes());

  return "<div class='rep-head'>"+
      "<h1>មន្ទីរពេទ្យខេត្តកំពង់ឆ្នាំង · Kampong Chhnang Provincial Hospital</h1>"+
      "<h2>របាយការណ៍សង្ខេបទិន្នន័យបញ្ជូនអ្នកជំងឺ · Patient Referral Summary Report</h2>"+
      "<div class='meta'>"+ctxHtml+"</div>"+
      "<div class='gen'>បង្កើតនៅ · Generated: "+gen+"</div>"+
    "</div>"+
    kpiHtml+
    repPair("ប្រភេទមូលដ្ឋានបញ្ជូន · Referring facility type",tFtype,"ទិសដៅបញ្ជូន · Referral direction",tDir)+
    repPair("ប្រភេទបញ្ជូន · Urgency",tUrg,"ភាពពេញលេញនៃឯកសារ · Documentation",tComp)+
    repPair("ភេទ · Sex",tSex,"ក្រុមអាយុ · Age group",tAge)+
    repSection("ក្រុមរោគវិនិច្ឆ័យពេលបញ្ជូន · Diagnosis category",tDx)+
    repSection("មូលហេតុបញ្ជូន · Reason for referral",tReason)+
    repSection("មូលដ្ឋានទទួលអ្នកជំងឺ · Receiving facility",tTo)+
    repPair("ផ្នែកចូលសម្រាក · Ward",tWard,"លទ្ធផលបញ្ជូន · Outcome",tOutcome)+
    repSection("ភាពពេញលេញនៃឯកសារ តាមមូលដ្ឋានបញ្ជូន · Documentation completeness by referring facility (QI — rate &lt;80% highlighted)",tCompFac)+
    repSection("មតិកែលម្អទៅមូលដ្ឋានបញ្ជូន · Feedback to referring facilities",tFeed)+
    "<div class='rep-foot'>ការិយាល័យបច្ចេកទេស មន្ទីរពេទ្យខេត្តកំពង់ឆ្នាំង · KCPH Technical Office — Referral Registry</div>";
}
function exportPDF(){
  var html=buildReportHTML();
  if(!html){ toast("គ្មានទិន្នន័យសម្រាប់របាយការណ៍ · no data to report","warn"); return; }
  var c=$("#reportContainer"); c.innerHTML=html;
  setTimeout(function(){ window.print(); }, 200);
}

/* ============================================================
   INIT
   ============================================================ */
function switchTab(tab){
  $$(".tab-btn").forEach(b=>b.classList.toggle("active", b.dataset.tab===tab));
  $("#formPanel").classList.toggle("show", tab==="form");
  $("#dashPanel").classList.toggle("show", tab==="dash");
  if(tab==="dash") loadDashboard();
}
function init(){
  initDropdowns();
  bindTypeHint();
  $("#saveBtn").addEventListener("click", onSave);
  $("#clearBtn").addEventListener("click", clearForm);
  $("#retryBtn").addEventListener("click", ()=>flushOutbox(false));
  $$(".tab-btn").forEach(b=>b.addEventListener("click", ()=>switchTab(b.dataset.tab)));
  $("#refreshBtn").addEventListener("click", loadDashboard);
  $("#resetFilterBtn").addEventListener("click", ()=>{
    ["fl_from","fl_to","fl_search"].forEach(id=>$("#"+id).value="");
    $("#fl_facility").selectedIndex=0; $("#fl_dx").selectedIndex=0; renderAll();
  });
  ["fl_from","fl_to","fl_facility","fl_dx","fl_search"].forEach(id=>{
    $("#"+id).addEventListener("input", renderAll);
    $("#"+id).addEventListener("change", renderAll);
  });
  $("#xlsxBtn").addEventListener("click", exportXLSX);
  $("#pdfBtn").addEventListener("click", exportPDF);
  $("#editX").addEventListener("click", closeEdit);
  $("#editModal").addEventListener("click", e=>{ if(e.target.id==="editModal") closeEdit(); });
  window.addEventListener("online", ()=>{ toast("🌐 មាន internet · back online","ok"); flushOutbox(true); });
  window.addEventListener("offline", ()=>toast("⚠️ អស់ internet · offline mode","warn"));
  updateNetbar();
  // try syncing anything pending on load
  flushOutbox(true);
}
window.openEdit=openEdit; window.delRecord=delRecord; window.saveEdit=saveEdit; window.closeEdit=closeEdit;
document.addEventListener("DOMContentLoaded", init);
