const state={month:10,year:2026,filter:"all",view:"list"};

const calendarDays=document.getElementById("calendarDays");
const monthTitle=document.getElementById("monthTitle");

function renderCalendar(){
  const names=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  monthTitle.textContent=`${names[state.month]} ${state.year}`;
  calendarDays.innerHTML="";
  const first=new Date(Date.UTC(state.year,state.month,1));
  const last=new Date(Date.UTC(state.year,state.month+1,0));
  const prevLast=new Date(Date.UTC(state.year,state.month,0)).getUTCDate();
  const start=first.getUTCDay();
  for(let i=start-1;i>=0;i--){
    const b=document.createElement("button"); b.className="muted"; b.textContent=prevLast-i; calendarDays.appendChild(b);
  }
  for(let d=1;d<=last.getUTCDate();d++){
    const b=document.createElement("button"); b.textContent=d;
    if(state.year===2026 && state.month===10 && d>=1 && d<=5){
      b.classList.add(d===1?"start":d===5?"end":"range");
    }
    if((state.month===10 && (d===13||d===14||d===26))){
      b.classList.add("has-dot");
    }
    calendarDays.appendChild(b);
  }
  const total=calendarDays.children.length;
  for(let i=1;i<=42-total;i++){
    const b=document.createElement("button"); b.className="muted"; b.textContent=i; calendarDays.appendChild(b);
  }
}
renderCalendar();

document.getElementById("prevMonth").addEventListener("click",()=>{state.month--;if(state.month<0){state.month=11;state.year--}renderCalendar()});
document.getElementById("nextMonth").addEventListener("click",()=>{state.month++;if(state.month>11){state.month=0;state.year++}renderCalendar()});

function applyFilter(filter){
  state.filter=filter;
  document.querySelectorAll(".quick-filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
  document.getElementById("statusSelect").value=filter;
  const item=document.querySelector(".opportunity");
  const empty=document.getElementById("emptyState");
  const show=filter==="all"||filter==="running";
  item.style.display=show?"grid":"none";
  empty.style.display=show?"none":"block";
}
document.querySelectorAll(".quick-filter").forEach(b=>b.addEventListener("click",()=>applyFilter(b.dataset.filter)));
document.getElementById("statusSelect").addEventListener("change",e=>applyFilter(e.target.value));

document.getElementById("advancedBtn").addEventListener("click",()=>document.getElementById("advancedPanel").classList.toggle("open"));
document.getElementById("clearFilters").addEventListener("click",()=>{
  document.querySelectorAll(".advanced-panel input").forEach(i=>i.value="");
  document.querySelectorAll(".advanced-panel select").forEach(s=>s.selectedIndex=0);
  applyFilter("all");
});

document.getElementById("searchInput").addEventListener("input",e=>{
  const q=e.target.value.toLowerCase().trim();
  const item=document.querySelector(".opportunity");
  const match=!q||item.innerText.toLowerCase().includes(q);
  item.style.display=match&& (state.filter==="all"||state.filter==="running")?"grid":"none";
  document.getElementById("emptyState").style.display=match&& (state.filter==="all"||state.filter==="running")?"none":"block";
});

document.querySelectorAll(".view-btn").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".view-btn").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  state.view=b.dataset.view;
  document.getElementById("listPanel").style.display=state.view==="list"?"block":"none";
  document.getElementById("calendarPanel").style.display=state.view==="calendar"?"block":"block";
  if(state.view==="calendar"){
    document.querySelector(".dashboard-grid").style.gridTemplateColumns="1fr";
    document.getElementById("calendarPanel").style.borderLeft="0";
  }else{
    document.querySelector(".dashboard-grid").style.gridTemplateColumns="";
    document.getElementById("calendarPanel").style.borderLeft="";
  }
}));

const modal=document.getElementById("newModal");
document.getElementById("newOpportunity").addEventListener("click",()=>{modal.classList.add("open");modal.setAttribute("aria-hidden","false")});
document.getElementById("closeModal").addEventListener("click",()=>{modal.classList.remove("open");modal.setAttribute("aria-hidden","true")});
modal.addEventListener("click",e=>{if(e.target===modal) modal.classList.remove("open")});
document.getElementById("opportunityForm").addEventListener("submit",e=>{
  e.preventDefault();
  alert("Oportunidad preparada para publicación. Conecta este formulario con tu API para persistirla.");
  modal.classList.remove("open");
});
