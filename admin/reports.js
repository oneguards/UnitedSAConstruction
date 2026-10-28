window.UnitedReports={async mount({api,panel,summary,active}){
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const wrap=el('div',null,'reports'),toolbar=el('div',null,'reports-toolbar'),label=el('label','Date range '),range=el('select'),refresh=el('button','Refresh','secondary'),body=el('div');
  for(const days of [7,30,90])range.add(new Option('Last '+days+' days',days));range.value='30';range.setAttribute('aria-label','Report date range');label.append(range);toolbar.append(label,refresh);wrap.append(toolbar,body);panel.replaceChildren(wrap);let request=0;
  const number=value=>Number(value||0).toLocaleString();
  const table=(title,rows)=>{
    const card=el('section',null,'report-card');card.append(el('h2',title));if(!rows.length){card.append(el('p','No traffic recorded in this period.','muted'));return card;}
    const table=el('table'),head=el('thead'),hr=el('tr');for(const text of [title,'Views']){const th=el('th',text);th.scope='col';hr.append(th);}head.append(hr);const tbody=el('tbody');
    for(const item of rows){const tr=el('tr');tr.append(el('td',item.label==='/'?'Home':item.label),el('td',number(item.views)));tbody.append(tr);}table.append(head,tbody);card.append(table);return card;
  };
  async function load(){
    const current=++request;body.replaceChildren(el('p','Loading website activity…','muted'));summary.replaceChildren();refresh.disabled=true;
    try{
      const {report:r}=await api('reports','GET',null,{days:range.value});if(!active()||current!==request)return;
      summary.replaceChildren(...[['Visits',r.visits,'Anonymous browsing sessions'],['Page views',r.page_views,'Pages loaded during this period'],['Website inquiries',r.leads,'Form submissions in this period']].map(([label,value,note])=>{const card=el('div',null,'summary-card');card.append(el('div',label,'summary-top'),el('div',number(value),'summary-value'),el('div',note,'summary-note'));return card;}));
      body.replaceChildren();body.append(el('p',r.from+' – '+r.to+' · Eastern Time · Today is partial','report-period'));
      if(!r.page_views)body.append(el('div','No website traffic recorded yet for this range. Reports begin collecting when the update is deployed.','report-empty'));
      const chart=el('section',null,'report-card report-chart');chart.append(el('h2','Daily page views'));const bars=el('div',null,'report-bars');bars.setAttribute('role','img');bars.setAttribute('aria-label','Daily page views. Exact values are in the daily totals table below.');const max=Math.max(1,...r.daily.map(x=>x.page_views));
      for(const day of r.daily){const column=el('div',null,'report-bar-column'),bar=el('span',null,'report-bar');bar.style.height=(day.page_views/max*100)+'%';bar.title=day.day+': '+day.page_views+' views';column.append(bar);bars.append(column);}chart.append(bars);const axis=el('div',null,'report-axis');axis.append(el('span',r.from),el('span',r.to));chart.append(axis);
      const details=el('details'),dailyToggle=el('summary','View daily totals'),t=el('table');const head=el('thead'),hr=el('tr');for(const x of ['Date','Views','Visits']){const th=el('th',x);th.scope='col';hr.append(th);}head.append(hr);t.append(head);const tb=el('tbody');for(const row of r.daily){const tr=el('tr');tr.append(el('td',row.day),el('td',number(row.page_views)),el('td',number(row.visits)));tb.append(tr);}t.append(tb);details.append(dailyToggle,t);chart.append(details);body.append(chart);
      const grid=el('div',null,'report-grid');grid.append(table('Popular pages',r.pages),table('Referral sources',r.referrers),table('Devices',r.devices));body.append(grid);
      body.append(el('p','Visits are sessions in one browser tab, renewed after 30 minutes of inactivity between page loads—not identified people. Privacy preferences, blockers, and bots can affect totals. Daily visits may not add up to the period total when a visit crosses midnight. Inquiries are form submissions, not attributed conversions.','report-note'));
      if(r.first_tracked_at)body.append(el('p','First recorded traffic: '+new Date(r.first_tracked_at).toLocaleDateString('en-US',{timeZone:'America/New_York'}),'report-note'));
    }catch(error){if(active()&&current===request){body.replaceChildren(el('p','Reports could not load. '+error.message,'form-error'));}}
    finally{if(current===request)refresh.disabled=false;}
  }
  range.onchange=load;refresh.onclick=load;await load();
}};
