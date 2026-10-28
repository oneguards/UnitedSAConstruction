const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const script=fs.readFileSync(path.join(root,'assets/projects.js'),'utf8');const tick=()=>new Promise(r=>setTimeout(r,0));
const examples=[
 {id:'older',title:'Established project',description:'Original work.',image_url:'https://example.com/old.jpg',completed_on:'2026-01-01',created_at:'2026-10-20',sort_order:0},
 {id:'latest',title:'Latest completed deck',description:'Built with composite decking.\nRoom to relax.',image_urls:['https://example.com/cover.jpg','https://example.com/detail.jpg'],image_url:'https://example.com/cover.jpg',completed_on:'2026-10-20',created_at:'2026-10-21',service:'Decks',location:'Rehoboth, MA'},
 {id:'undated',title:'Undated project',description:'Dates are optional.',image_urls:[],created_at:'2026-10-25'}
];
function page(file,hash=''){
 const dom=new JSDOM(fs.readFileSync(path.join(root,file+'.html'),'utf8'),{url:'https://unitedsaconstruction.com/'+(file==='index'?'':file)+hash,runScripts:'outside-only',pretendToBeVisual:true});
 dom.window.HTMLElement.prototype.scrollTo=function(options){this.scrollLeft=options.left;};dom.window.eval(script);return dom;
}
(async()=>{
 let dom=page('index');let w=dom.window,doc=w.document;w.UnitedPortfolio.render(examples);
 assert.equal(doc.getElementById('latest-project').hidden,false);assert.equal(doc.querySelector('.latest-project-copy h3').textContent,'Latest completed deck');assert.equal(doc.querySelector('.latest-project-cover').getAttribute('href'),'/our-work#project=latest');
 doc.querySelector('[aria-label="Next project photo"]').click();assert.equal(doc.querySelector('.latest-project-cover img').src,'https://example.com/detail.jpg');doc.querySelector('[aria-label="Previous project photo"]').click();assert.equal(doc.querySelector('.latest-project-cover img').src,'https://example.com/cover.jpg');
 const touchStart=new w.Event('touchstart');Object.defineProperty(touchStart,'changedTouches',{value:[{clientX:250}]});doc.querySelector('.latest-project-cover').dispatchEvent(touchStart);
 const touchEnd=new w.Event('touchend');Object.defineProperty(touchEnd,'changedTouches',{value:[{clientX:100}]});doc.querySelector('.latest-project-cover').dispatchEvent(touchEnd);assert.equal(doc.querySelector('.latest-project-cover img').src,'https://example.com/detail.jpg');
 const swipeClick=new w.MouseEvent('click',{bubbles:true,cancelable:true});doc.querySelector('.latest-project-cover').dispatchEvent(swipeClick);assert(swipeClick.defaultPrevented);
 w.UnitedPortfolio.render(examples.filter(x=>!x.completed_on));assert.equal(doc.querySelector('.latest-project-copy h3').textContent,'Undated project');w.UnitedPortfolio.render([]);assert(doc.getElementById('latest-project').hidden);w.close();
 dom=page('our-work');w=dom.window;doc=w.document;w.UnitedPortfolio.render(examples);
 assert.equal(doc.querySelectorAll('.portfolio-card').length,3);assert.match(doc.getElementById('project-total').textContent,/3 projects/);assert.equal(doc.querySelector('.portfolio-card h3').textContent,'Latest completed deck');
 for(const selector of ['.portfolio-cover','.portfolio-card h3 a','.portfolio-description']){
  doc.querySelector(selector).click();await tick();await tick();const dialog=doc.getElementById('project-dialog');assert(dialog.open);assert.equal(doc.getElementById('project-detail-title').textContent,'Latest completed deck');assert.equal(doc.querySelectorAll('.project-slide').length,2);assert.equal(doc.querySelectorAll('.project-thumbnails button').length,2);assert.match(doc.querySelector('.project-full-description').textContent,/Room to relax/);assert.equal(doc.querySelector('.project-completed').dateTime,'2026-10-20');
  doc.querySelector('[aria-label="Next photo"]').click();assert.equal(doc.querySelector('.project-image-count').textContent,'2 / 2');
  dialog.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(doc.querySelector('.project-image-count').textContent,'1 / 2');
  dialog.dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal(dialog.open,false);assert(!w.location.hash);assert(!doc.body.classList.contains('portfolio-open'));
 }
 w.location.hash='project=undated';await tick();assert.match(doc.querySelector('.project-no-photos').textContent,/coming soon/);assert.equal(doc.querySelector('.project-completed'),null);w.close();
 dom=page('our-work','#project=latest');w=dom.window;doc=w.document;w.UnitedPortfolio.render(examples);assert(doc.getElementById('project-dialog').open);
 w.UnitedPortfolio.render([]);assert.equal(doc.getElementById('project-dialog').open,false);assert.equal(doc.querySelectorAll('.portfolio-card').length,0);w.close();
 dom=page('our-work');w=dom.window;doc=w.document;w.UnitedPortfolio.render([{id:'safe',title:'<img onerror=alert(1)>',description:'<script>bad()</script>',image_urls:['javascript:alert(1)','https://example.com/safe.jpg']}]);assert.equal(doc.querySelectorAll('.portfolio-cover img').length,1);assert.match(doc.querySelector('.portfolio-card h3').textContent,/<img/);assert.equal(doc.querySelector('.portfolio-description script'),null);w.close();
 console.log('Portfolio: latest-project selection, photo slides, all click targets, shareable links, keyboard/close behavior, missing dates/photos and safe rendering passed');
})().catch(e=>{console.error(e);process.exitCode=1});
