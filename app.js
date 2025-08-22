const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const fmt = (n, cur) => new Intl.NumberFormat('de-CH', { style: 'currency', currency: cur }).format(n);

const STORAGE_KEY = 'budget-tracker-data';
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

const entryForm = $('entryForm');
const typeEl = $('type');
const dateEl = $('date');
const titleEl = $('title');
const amountEl = $('amount');
const categoryEl = $('category');
const currencyEl = $('currency');
const tbody = $('tbody');

const kpiIncome = $('kpiIncome');
const kpiExpense = $('kpiExpense');
const kpiBalance = $('kpiBalance');

const searchEl = $('search');
const filterTypeEl = $('filterType');
const filterRangeEl = $('filterRange');
const clearSearchBtn = $('clearSearch');

let catChart;

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
function computeSums(list){
  let inc=0,exp=0; for(const e of list){ if(e.type==='income') inc+=e.amount; else exp+=e.amount; }
  return {inc,exp,bal:inc-exp};
}
function renderTable(list){
  tbody.innerHTML='';
  for(const e of list){
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${e.date}</td><td>${e.title}</td><td>${e.category}</td><td>${fmt(e.amount,currencyEl.value)}</td><td>${e.type}</td><td><button class="delete" data-id="${e.id}">Löschen</button></td>`;
    tbody.appendChild(tr);
  }
  document.querySelectorAll('.delete').forEach(btn=>{
    btn.onclick=()=>{ entries=entries.filter(x=>x.id!==btn.dataset.id); persist(); update(); };
  });
}
function renderChart(list){
  const ctx=$('catChart');
  const byCat={};
  for(const e of list){ if(e.type==='expense') byCat[e.category||'Sonstiges']=(byCat[e.category||'Sonstiges']||0)+e.amount; }
  const labels=Object.keys(byCat); const values=Object.values(byCat);
  if(catChart){ catChart.data={labels,datasets:[{data:values}]}; catChart.update(); }
  else {
    catChart=new Chart(ctx,{ type:'doughnut', data:{labels,datasets:[{data:values}]}, options:{plugins:{legend:{labels:{color:'white'}}}} });
  }
}
function update(){
  let list=[...entries];
  if(searchEl.value) list=list.filter(e=>(e.title+e.category).toLowerCase().includes(searchEl.value.toLowerCase()));
  if(filterTypeEl.value!=='all') list=list.filter(e=>e.type===filterTypeEl.value);
  if(filterRangeEl.value==='month') list=list.filter(e=>new Date(e.date).getMonth()===new Date().getMonth());
  const sums=computeSums(list);
  kpiIncome.textContent=fmt(sums.inc,currencyEl.value);
  kpiExpense.textContent=fmt(sums.exp,currencyEl.value);
  kpiBalance.textContent=fmt(sums.bal,currencyEl.value);
  renderTable(list);
  renderChart(list);
}
entryForm.onsubmit=(e)=>{
  e.preventDefault();
  const entry={id:Math.random().toString(36).slice(2),type:typeEl.value,title:titleEl.value,amount:parseFloat(amountEl.value),category:categoryEl.value,date:dateEl.value||today()};
  entries.unshift(entry);
  persist();
  entryForm.reset();
  dateEl.value=today();
  update();
};
searchEl.oninput=update;
filterTypeEl.onchange=update;
filterRangeEl.onchange=update;
clearSearchBtn.onclick=()=>{searchEl.value='';update();};
dateEl.value=today();
update();