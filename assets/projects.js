(() => {
  const make=(tag,text,className)=>{const x=document.createElement(tag);if(text!=null)x.textContent=text;if(className)x.className=className;return x;};
  const url=value=>{try{const u=new URL(value,location.origin);return u.protocol==='https:'?u.href:'';}catch{return '';}};
  const photosFor=project=>[...new Set([...(Array.isArray(project.image_urls)?project.image_urls:[]),project.image_url].filter(Boolean).map(url).filter(Boolean))];
  const dateText=value=>{if(!value)return '';const date=new Date(value+'T12:00:00Z');return Number.isNaN(date.getTime())?'':date.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});};
  const keyFor=project=>String(project.id||project.title?.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'project');
  const hrefFor=project=>'/our-work#project='+encodeURIComponent(keyFor(project));
  const portfolio=document.getElementById('managed-projects');
  let records=[],dialog,activeProject,activeIndex=0,previousFocus,track,thumbs,counter;
  const prefersReduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const photo=(source,alt,eager=false)=>{const img=make('img');img.src=source;img.alt=alt;img.loading=eager?'eager':'lazy';img.decoding='async';return img;};
  const projectLink=(project,className)=>{const a=make('a',null,className);a.href=hrefFor(project);if(portfolio)a.addEventListener('click',event=>{if(event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();previousFocus=a;if(location.hash==='#project='+encodeURIComponent(keyFor(project)))open(project);else location.hash='project='+encodeURIComponent(keyFor(project));});return a;};
  const meta=project=>[project.service,project.location].filter(Boolean).join(' · ');
  function card(project,index){
    const fig=make('figure',null,'portfolio-card');const images=photosFor(project),cover=projectLink(project,'portfolio-cover');cover.setAttribute('aria-label','View '+project.title);
    if(images[0])cover.append(photo(images[0],project.title));else cover.append(make('span','United SA Construction','portfolio-placeholder'));
    const count=make('span',images.length?images.length+' photo'+(images.length===1?'':'s'):'View project','portfolio-photo-count');cover.append(count,make('span','↗','portfolio-cover-arrow'));fig.append(cover);
    const body=make('figcaption',null,'portfolio-card-body');if(meta(project))body.append(make('p',meta(project),'portfolio-meta'));
    const title=make('h3'),titleLink=projectLink(project);titleLink.textContent=project.title;title.append(titleLink);body.append(title);
    if(project.description){const description=projectLink(project,'portfolio-description');description.textContent=project.description;body.append(description);}
    const bottom=make('div',null,'portfolio-card-bottom');if(project.completed_on){const date=make('time',dateText(project.completed_on),'project-date');date.dateTime=project.completed_on;bottom.append(date);}else bottom.append(make('span','United SA Construction'));
    const more=projectLink(project,'portfolio-more');more.textContent='View project ↗';bottom.append(more);body.append(bottom);fig.append(body);return fig;
  }
  function latestFeature(project){
    const section=document.getElementById('latest-project');if(!section)return;section.hidden=!project;if(!project){section.querySelector('.latest-project-content')?.replaceChildren();return;}
    const root=section.querySelector('.latest-project-content');root.replaceChildren();
    const images=photosFor(project),visual=make('div',null,'latest-project-visual'),link=projectLink(project,'latest-project-cover');link.setAttribute('aria-label','View '+project.title);let current=0;
    const img=images[0]?photo(images[0],project.title):null;if(img)link.append(img);else link.append(make('span','United SA Construction','portfolio-placeholder'));visual.append(link);
    if(images.length>1){const controls=make('div',null,'latest-project-controls'),prev=make('button','←'),next=make('button','→'),position=make('span','1 / '+images.length);prev.type=next.type='button';prev.setAttribute('aria-label','Previous project photo');next.setAttribute('aria-label','Next project photo');const advance=step=>{current=(current+step+images.length)%images.length;img.src=images[current];img.alt=project.title+' — photo '+(current+1);position.textContent=(current+1)+' / '+images.length;};prev.onclick=()=>advance(-1);next.onclick=()=>advance(1);controls.append(prev,position,next);visual.append(controls);let startX,swiped=false;link.addEventListener('click',e=>{if(swiped){e.preventDefault();swiped=false;}});link.addEventListener('touchstart',e=>{swiped=false;startX=e.changedTouches[0].clientX;},{passive:true});link.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-startX;if(Math.abs(delta)>45){swiped=true;advance(delta<0?1:-1);}},{passive:true});}
    const copy=make('div',null,'latest-project-copy');copy.append(make('span','A CLOSER LOOK AT OUR WORK','portfolio-eyebrow'));
    const heading=make('h3'),headingLink=projectLink(project);headingLink.textContent=project.title;heading.append(headingLink);copy.append(heading);
    if(meta(project))copy.append(make('p',meta(project),'latest-project-meta'));
    if(project.description){const desc=projectLink(project,'latest-project-description');desc.textContent=project.description;copy.append(desc);}
    if(project.completed_on){const date=make('time','Completed '+dateText(project.completed_on));date.dateTime=project.completed_on;copy.append(date);}
    const actions=make('div',null,'latest-project-actions'),view=projectLink(project,'portfolio-button');view.textContent='Explore this project ↗';const all=make('a','All projects →','portfolio-text-link');all.href='/our-work';actions.append(view,all);copy.append(actions);root.append(visual,copy);
  }
  function close(updateUrl=true){
    if(!dialog?.open)return;
    if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
    document.body.classList.remove('portfolio-open');activeProject=null;
    if(updateUrl&&location.hash.startsWith('#project='))history.replaceState(null,'',location.pathname+location.search);
    previousFocus?.focus();previousFocus=null;
  }
  function ensureDialog(){
    if(dialog)return;dialog=make('dialog',null,'project-detail');dialog.id='project-dialog';dialog.setAttribute('aria-labelledby','project-detail-title');document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
    dialog.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)){event.preventDefault();go(activeIndex+(event.key==='ArrowRight'?1:-1));}});
  }
  function highlight(index){
    const photos=photosFor(activeProject||{});activeIndex=Math.max(0,Math.min(index,Math.max(photos.length-1,0)));
    if(counter)counter.textContent=photos.length?(activeIndex+1)+' / '+photos.length:'No photos yet';
    thumbs?.querySelectorAll('button').forEach((button,i)=>{button.classList.toggle('selected',i===activeIndex);button.setAttribute('aria-pressed',String(i===activeIndex));});
  }
  function go(index){
    if(!activeProject)return;const length=photosFor(activeProject).length;if(!length)return;index=(index+length)%length;highlight(index);
    if(track?.scrollTo)track.scrollTo({left:index*track.clientWidth,behavior:prefersReduced()?'instant':'smooth'});
    else if(track)track.scrollLeft=index*track.clientWidth;
  }
  function open(project){
    ensureDialog();if(!dialog.open)previousFocus=previousFocus||document.activeElement;activeProject=project;activeIndex=0;dialog.replaceChildren();
    const top=make('div',null,'project-detail-top'),brand=make('span','UNITED SA · PROJECT STORIES','portfolio-eyebrow'),dismiss=make('button','Close ×','project-close');dismiss.type='button';dismiss.setAttribute('aria-label','Close project');dismiss.onclick=()=>close();top.append(brand,dismiss);
    const layout=make('div',null,'project-detail-layout'),gallery=make('div',null,'project-detail-gallery'),stage=make('div',null,'project-stage');track=make('div',null,'project-image-track');track.setAttribute('aria-label','Project photos. Swipe to browse.');track.tabIndex=0;
    const photos=photosFor(project);
    photos.forEach((source,i)=>{const slide=make('div',null,'project-slide');slide.setAttribute('role','group');slide.setAttribute('aria-label','Photo '+(i+1)+' of '+photos.length);slide.append(photo(source,project.title+' — photo '+(i+1),i===0));track.append(slide);});
    if(!photos.length)track.append(make('div','Project photos coming soon.','project-no-photos'));
    track.addEventListener('scroll',()=>{if(track.clientWidth)highlight(Math.round(track.scrollLeft/track.clientWidth));},{passive:true});stage.append(track);
    if(photos.length>1){for(const [label,step,text] of [['Previous photo',-1,'←'],['Next photo',1,'→']]){const button=make('button',text,'project-arrow '+(step<0?'previous':'next'));button.type='button';button.setAttribute('aria-label',label);button.onclick=()=>go(activeIndex+step);stage.append(button);}}
    const footer=make('div',null,'project-gallery-footer');counter=make('span',null,'project-image-count');counter.setAttribute('aria-live','polite');footer.append(make('span',photos.length>1?'Swipe photos or use the arrows':'PROJECT GALLERY'),counter);
    thumbs=make('div',null,'project-thumbnails');thumbs.setAttribute('aria-label','Choose a project photo');if(photos.length>1)photos.forEach((source,i)=>{const button=make('button');button.type='button';button.setAttribute('aria-label','Show photo '+(i+1));button.onclick=()=>go(i);button.append(photo(source,'Photo '+(i+1)));thumbs.append(button);});gallery.append(stage,footer,thumbs);
    const info=make('div',null,'project-detail-info');info.append(make('span',project.service||'OUR WORK','portfolio-eyebrow'));const title=make('h2',project.title);title.id='project-detail-title';info.append(title);
    if(project.location)info.append(make('p',project.location,'project-location'));
    if(project.completed_on){const time=make('time','Completed '+dateText(project.completed_on),'project-completed');time.dateTime=project.completed_on;info.append(time);}
    if(project.description)info.append(make('p',project.description,'project-full-description'));
    const cta=make('div',null,'project-detail-cta');cta.append(make('p','Have something similar in mind?'));const estimate=make('a','Let’s talk about your project ↗','portfolio-button');estimate.href='/contact#estimate';cta.append(estimate);info.append(cta);layout.append(gallery,info);dialog.append(top,layout);highlight(0);
    if(!dialog.open){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}document.body.classList.add('portfolio-open');dismiss.focus();
  }
  function fromHash(){
    if(!portfolio)return;
    if(!location.hash.startsWith('#project=')){close(false);return;}
    let id;try{id=decodeURIComponent(location.hash.slice(9));}catch{return;}
    const project=records.find(x=>keyFor(x)===id);if(project)open(project);else close(false);
  }
  window.addEventListener('hashchange',fromHash);
  window.addEventListener('resize',()=>{if(activeProject)go(activeIndex);});
  window.UnitedPortfolio={render(projects){
    records=[...projects].sort((a,b)=>{
      // Completion dates identify recent finished work. Undated projects follow,
      // newest-created first; stable order resolves legacy imports with no dates.
      if(Boolean(a.completed_on)!==Boolean(b.completed_on))return a.completed_on?-1:1;
      return String(b.completed_on||b.created_at||'').localeCompare(String(a.completed_on||a.created_at||''))||(a.sort_order||0)-(b.sort_order||0)||String(a.title).localeCompare(String(b.title));
    });
    if(portfolio){portfolio.classList.add('portfolio-grid');portfolio.replaceChildren(...records.map(card));const total=document.getElementById('project-total');if(total)total.textContent=records.length+' project'+(records.length===1?'':'s');if(!records.length)portfolio.append(make('p','Our next project story is coming soon.','portfolio-empty'));}
    latestFeature(records[0]);fromHash();
  }};
})();
