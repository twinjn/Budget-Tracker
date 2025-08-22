
    // Hilfen
    const $ = (id) => document.getElementById(id);
    const today = () => new Date().toISOString().slice(0,10);
    const fmt = (n, cur) => new Intl.NumberFormat('de-CH', { style: 'currency', currency: cur }).format(n);

    // Zustand
    const STORAGE_KEY = 'budget-tracker-data-v1';
    const SETTINGS_KEY = 'budget-tracker-settings-v1';
    let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"currency":"CHF"}');

    // Elemente
    const entryForm = $('entryForm');
    const typeEl = $('type');
    const dateEl = $('date');
    const titleEl = $('title');
    const amountEl = $('amount');
    const categoryEl = $('category');
    const currencyEl = $('currency');
    const exportCsvBtn = $('exportCsv');
    const importJsonBtn = $('importJson');
    const fileInput = $('fileInput');
    const clearAllBtn = $('clearAll');

    const searchEl = $('search');
    const clearSearchBtn = $('clearSearch');
    const filterTypeEl = $('filterType');
    const filterRangeEl = $('filterRange');
    const tbody = $('tbody');

    const kpiIncome = $('kpiIncome');
    const kpiExpense = $('kpiExpense');
    const kpiBalance = $('kpiBalance');
    const rangeLabel = $('rangeLabel');

    // defaults
    dateEl.value = today();
    currencyEl.value = settings.currency || 'CHF';

    // Speichern
    const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    const persistSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    // Filtern nach Monat
    function inCurrentMonth(d){
      const now = new Date();
      const dt = new Date(d);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }

    // KPIs berechnen
    function computeSums(list){
      let inc = 0, exp = 0;
      for(const e of list){
        if(e.type === 'income') inc += e.amount;
        else exp += e.amount;
      }
      return { inc, exp, bal: inc - exp };
    }

    // Tabelle
    function renderTable(list){
      tbody.innerHTML = '';
      const cur = currencyEl.value;
      for(const e of list){
        const tr = document.createElement('tr');
        tr.className = 'odd:bg-slate-950/40';
        tr.innerHTML = `
          <td class="p-3 whitespace-nowrap">${e.date}</td>
          <td class="p-3">${escapeHtml(e.title)}</td>
          <td class="p-3">${escapeHtml(e.category || '')}</td>
          <td class="p-3 text-right ${e.type==='expense' ? 'text-rose-300' : 'text-emerald-300'}">
            ${e.type==='expense' ? '-' : ''}${fmt(e.amount, cur)}
          </td>
          <td class="p-3 text-right">${e.type === 'income' ? 'Einnahme' : 'Ausgabe'}</td>
          <td class="p-3 text-right">
            <button data-id="${e.id}" class="delete rounded-lg bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700">Löschen</button>
          </td>`;
        tbody.appendChild(tr);
      }
      // Delete Handler
      tbody.querySelectorAll('button.delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          entries = entries.filter(x => x.id !== id);
          persist();
          update();
        });
      });
    }

    // Suche und Filter anwenden
    function applyFilters(){
      const q = (searchEl.value || '').trim().toLowerCase();
      const t = filterTypeEl.value; // all | income | expense
      const r = filterRangeEl.value; // all | month

      let list = [...entries].sort((a,b)=> b.createdAt - a.createdAt);
      if(q){
        list = list.filter(e => (e.title+" "+(e.category||'')).toLowerCase().includes(q));
      }
      if(t !== 'all') list = list.filter(e => e.type === t);
      if(r === 'month') list = list.filter(e => inCurrentMonth(e.date));
      rangeLabel.textContent = r === 'month' ? 'aktueller Monat' : 'gesamter Verlauf';
      return list;
    }

    // Chart
    let catChart;
    function renderChart(list){
      const ctx = document.getElementById('catChart');
      const byCat = {};
      for(const e of list){
        if(e.type !== 'expense') continue;
        const k = e.category || 'Sonstiges';
        byCat[k] = (byCat[k] || 0) + e.amount;
      }
      const labels = Object.keys(byCat);
      const values = Object.values(byCat);

      const data = {
        labels,
        datasets: [{ data: values }]
      };

      if(catChart){
        catChart.data = data;
        catChart.update();
      } else {
        catChart = new Chart(ctx, {
          type: 'doughnut',
          data,
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'bottom', labels: { color: '#cbd5e1' } },
              tooltip: { callbacks: { label: (item) => {
                const cur = currencyEl.value;
                const v = item.parsed;
                const total = values.reduce((a,b)=>a+b,0) || 1;
                const pct = Math.round(v*100/total);
                return `${item.label}: ${fmt(v, cur)} (${pct}%)`;
              }}}
            }
          }
        });
      }
    }

    // HTML Escaping
    function escapeHtml(str){
      return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
    }

    // Hauptupdate
    function update(){
      const list = applyFilters();
      renderTable(list);
      const sums = computeSums(list);
      kpiIncome.textContent = fmt(sums.inc, currencyEl.value);
      kpiExpense.textContent = fmt(sums.exp, currencyEl.value);
      kpiBalance.textContent = fmt(sums.bal, currencyEl.value);
      renderChart(list);
    }

    // Form speichern
    entryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(amountEl.value);
      if(!titleEl.value || !amount || amount <= 0){
        amountEl.focus();
        return;
      }
      const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        type: typeEl.value,
        title: titleEl.value.trim(),
        amount: Math.round(amount * 100) / 100,
        category: (categoryEl.value || '').trim() || (typeEl.value === 'income' ? 'Allgemein' : 'Sonstiges'),
        date: dateEl.value || today(),
        createdAt: Date.now()
      };
      entries.unshift(entry);
      persist();
      titleEl.value = '';
      amountEl.value = '';
      categoryEl.value = '';
      titleEl.focus();
      update();
    });

    // Suche
    searchEl.addEventListener('input', update);
    clearSearchBtn.addEventListener('click', () => { searchEl.value = ''; update(); });
    filterTypeEl.addEventListener('change', update);
    filterRangeEl.addEventListener('change', update);

    // Währung
    currencyEl.addEventListener('change', () => {
      settings.currency = currencyEl.value;
      persistSettings();
      update();
    });

    // Export CSV
    exportCsvBtn.addEventListener('click', () => {
      const cur = currencyEl.value;
      const header = ['id','art','titel','kategorie','datum','betrag'];
      const rows = entries.map(e => [e.id, e.type, escCsv(e.title), escCsv(e.category||''), e.date, e.amount]);
      const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `budget-export-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    });

    function escCsv(v){
      const s = String(v ?? '');
      if(/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }

    // Import JSON
    importJsonBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arr = JSON.parse(reader.result);
          if(Array.isArray(arr)){
            // einfache Validierung
            const cleaned = arr.map(x => ({
              id: x.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
              type: x.type === 'income' ? 'income' : 'expense',
              title: String(x.title || 'Eintrag'),
              amount: Math.abs(Number(x.amount) || 0),
              category: String(x.category || 'Sonstiges'),
              date: x.date && !isNaN(new Date(x.date)) ? x.date.slice(0,10) : today(),
              createdAt: Number(x.createdAt) || Date.now()
            })).filter(x => x.amount > 0);
            entries = cleaned.concat(entries);
            persist();
            update();
          } else {
            alert('Ungültiges JSON');
          }
        } catch(e){
          alert('Konnte Datei nicht lesen');
        }
      };
      reader.readAsText(f);
      fileInput.value = '';
    });

    // Alles löschen
    clearAllBtn.addEventListener('click', () => {
      if(confirm('Wirklich alles löschen?')){
        entries = [];
        persist();
        update();
      }
    });

    // Shortcuts
    document.addEventListener('keydown', (e) => {
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
        e.preventDefault();
        searchEl.focus();
      }
      if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){
        e.preventDefault();
        entryForm.requestSubmit();
      }
    });

    // Start
    update();
  