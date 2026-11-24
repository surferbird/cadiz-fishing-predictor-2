const SPECIES=["Dorada","Lubina","Sargo","Baila","Herrera"];
const ZONES=[
{name:"La Cortadura",habitat:"playa",exposure:"open",species:["Dorada","Herrera","Baila","Lubina"],methods:["Surfcasting","Spinning","Pesca a fondo"],note:"Playa abierta y fondos arenosos; revisar mar de fondo y viento."},
{name:"Playa Victoria",habitat:"playa",exposure:"open",species:["Dorada","Herrera","Baila","Lubina"],methods:["Surfcasting","Spinning","Pesca a fondo"],note:"Tramo urbano de playa; comprobar restricciones y horarios locales."},
{name:"Santa María del Mar",habitat:"mixta",exposure:"open",species:["Sargo","Lubina","Baila"],methods:["Spinning","Boya","Pesca a fondo"],note:"Playa con estructura y zonas de roca; precaución con rompiente."},
{name:"La Caleta",habitat:"roca",exposure:"open",species:["Sargo","Lubina","Baila"],methods:["Spinning","Boya"],note:"Ensenada y roca; no acceder con oleaje o resaca peligrosa."},
{name:"Punta de San Felipe",habitat:"estructura",exposure:"sheltered",species:["Lubina","Sargo"],methods:["Spinning","Boya"],note:"Entorno portuario: verificar expresamente zonas autorizadas y prohibiciones."}
];
const $=id=>document.getElementById(id);
const getConfig=()=>JSON.parse(localStorage.getItem("cfp2profile")||'{"radius":"Hasta 15 km","species":["Dorada","Lubina","Sargo","Baila","Herrera"]}');
const getLogs=()=>JSON.parse(localStorage.getItem("cfp2logs")||"[]");
const clamp=x=>Math.max(0,Math.min(100,Math.round(x)));
function val(id){return +$(id).value}
function suitability(species){
 const wind=val("wind"),wave=val("wave"),period=val("period"),cur=val("current"),temp=val("temp"),pressure=val("pressure"),tide=$("tide").value,time=$("time").value,trend=$("trend").value;
 let s=58, why=[];
 const add=(n,reason)=>{s+=n;if(n>5)why.push(reason)};
 // General environmental quality: soft optimums, with exposed-water safety penalties.
 add(wind<=15?8:wind<=25?0:wind<=35?-12:-28,wind<=15?"viento suave": "viento a vigilar");
 add(wave<=0.8?8:wave<=1.3?2:wave<=2?-10:-25,wave<=1.3?"oleaje moderado":"oleaje elevado");
 add(cur>=0.1&&cur<=0.55?7:cur<0.1?-3:cur<=0.9?1:-12,"corriente");
 add(temp>=15&&temp<=22?5:temp>=12&&temp<=25?0:-7,"temperatura del agua");
 add(pressure>=1005&&pressure<=1025?3:-3,"presión");
 add(trend==="stable"?3:trend==="falling"?-2:1,"tendencia de presión");
 add(tide==="slack"?-3:6,"marea en movimiento");
 const speciesBonus={Dorada:0,Lubina:0,Sargo:0,Baila:0,Herrera:0};
 if(species==="Dorada"){add(wave<=1.2?5:-5,"mar moderado");add(tide==="rising"?5:0,"marea creciente");add(time==="dawn"||time==="dusk"?4:0,"luz baja");}
 if(species==="Lubina"){add(wave>=0.3&&wave<=1.5?7:wave<0.3?-2:-8,"rompiente");add(time==="dawn"||time==="dusk"||time==="night"?8:0,"franja crepuscular/nocturna");add(cur>=0.2&&cur<=0.8?5:0,"agua en movimiento");}
 if(species==="Sargo"){add(wave>=0.3&&wave<=1.3?7:wave>1.8?-10:0,"agua ligeramente movida");add(time==="dawn"||time==="dusk"?4:0,"luz baja");}
 if(species==="Baila"){add(time==="dawn"||time==="dusk"?7:0,"franja crepuscular");add(wave<=1.2?4:-5,"oleaje");}
 if(species==="Herrera"){add(wave<=1.1?7:-8,"mar manejable");add(tide==="rising"?4:0,"marea creciente");}
 const method=$("method").value;
 if(method==="Kayak"||method==="Embarcación")add(wind<=12&&wave<=0.7?5:-30,"seguridad de navegación");
 if(method==="Surfcasting"||method==="Pesca a fondo")add(wind<=20&&wave<=1.5?4:-8,"condiciones de playa");
 if(method==="Spinning")add(time==="dawn"||time==="dusk"?5:0,"actividad visual");
 return {score:clamp(s),why:[...new Set(why)].slice(0,3)};
}
function calculate(){
 const profile=getConfig(),enabled=profile.species;
 const results=enabled.map(sp=>({species:sp,...suitability(sp)})).sort((a,b)=>b.score-a.score);
 $("speciesResults").innerHTML=results.map(r=>`<div class="result"><div class="resulttop"><b>${r.species}</b><strong>${r.score}/100</strong></div><div class="bar"><i style="width:${r.score}%"></i></div><small>${r.why.join(" · ")}</small></div>`).join("")||"<p class='muted'>Selecciona al menos una especie en Perfil.</p>";
 let combos=[];for(const z of ZONES){for(const r of results){if(!z.species.includes(r.species))continue;let score=r.score;if(z.exposure==="open"&&val("wave")>1.5)score-=18;if(z.habitat==="roca"&&val("wave")>1.2)score-=12;if(z.habitat==="playa"&&$("method").value==="Boya")score-=8;if($("method").value!=="Todas las modalidades"&&!z.methods.includes($("method").value))score-=12;combos.push({zone:z,species:r.species,score:clamp(score)});}}
 combos.sort((a,b)=>b.score-a.score);const top=combos.slice(0,3);
 $("recommendations").innerHTML=top.map(x=>`<div class="recommend"><b>${x.zone.name} · ${x.species} <span style="float:right;color:#087e86">${x.score}/100</span></b><small>${x.zone.note}</small></div>`).join("")||"<p class='muted'>No hay coincidencias con el perfil seleccionado.</p>";
 if(results.length){const best=results[0];$("bestScore").textContent=best.score;$("bestSpecies").textContent=best.species+" · escenario orientativo";$("bestSummary").textContent=top[0]?top[0].zone.name+" es la zona mejor puntuada en esta combinación.":"Sin zona coincidente";}
 $("dataState").textContent="CÁLCULO MANUAL";
}
function renderZones(){ $("zoneCards").innerHTML=ZONES.map(z=>`<div class="zone"><b>${z.name}</b><small>${z.habitat} · Especies: ${z.species.join(", ")}<br>${z.note}</small></div>`).join("");$("logZone").innerHTML=ZONES.map(z=>`<option>${z.name}</option>`).join("");}
function renderHistory(){const logs=getLogs();$("history").innerHTML=logs.length?logs.slice().reverse().map(x=>`<div class="historyitem"><b>${x.date} · ${x.zone} · ${x.count} capturas</b><small>${x.species} · ${x.method}${x.notes?" · "+esc(x.notes):""}</small></div>`).join(""):"<p class='muted'>Aún no has guardado jornadas.</p>";}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function renderProfile(){let c=getConfig();$("radius").value=c.radius;$("fishChecks").innerHTML=SPECIES.map(s=>`<label><input type="checkbox" value="${s}" ${c.species.includes(s)?"checked":""}>${s}</label>`).join("");}
function updateOutputs(){for(const [id,out,unit,digits] of [["wind","windOut"," km/h",0],["wave","waveOut"," m",1],["period","periodOut"," s",0],["current","currentOut"," m/s",2],["temp","tempOut"," °C",0],["pressure","pressureOut"," hPa",0]])$(out).textContent=val(id).toFixed(digits).replace(".",",")+unit;}
["wind","wave","period","current","temp","pressure"].forEach(id=>$(id).addEventListener("input",updateOutputs));
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab,.panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active");});
$("calculate").onclick=calculate;
$("logForm").onsubmit=e=>{e.preventDefault();let logs=getLogs();logs.push({date:$("logDate").value,zone:$("logZone").value,species:$("logFish").value,method:$("logMethod").value,count:+$("logCount").value,notes:$("logNotes").value});localStorage.setItem("cfp2logs",JSON.stringify(logs));$("logNotes").value="";$("logCount").value=0;renderHistory();alert("Jornada guardada en este dispositivo.");};
$("profile").onsubmit=e=>{e.preventDefault();let species=[...document.querySelectorAll("#fishChecks input:checked")].map(x=>x.value);localStorage.setItem("cfp2profile",JSON.stringify({radius:$("radius").value,species}));calculate();alert("Perfil guardado.");};
$("export").onclick=()=>{let rows=[["fecha","zona","especie","modalidad","capturas","observaciones"],...getLogs().map(x=>[x.date,x.zone,x.species,x.method,x.count,x.notes])];let csv=rows.map(r=>r.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(",")).join("\n");let a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"}));a.download="cadiz-fishing-capturas.csv";a.click();URL.revokeObjectURL(a.href);};
$("logDate").value=new Date().toISOString().slice(0,10);
renderZones();renderProfile();renderHistory();updateOutputs();calculate();
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));