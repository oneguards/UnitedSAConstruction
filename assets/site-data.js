(() => {
  const get = async collection => {
    const response = await fetch('/.netlify/functions/api?public=1&collection=' + collection);
    if (!response.ok) throw Error('Content unavailable');
    return (await response.json()).items;
  };
  const safeUrl = value => {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
    catch { return ''; }
  };
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const image = (url, alt) => {
    const src = safeUrl(url);
    if (!src) return null;
    const img = node('img'); img.src = src; img.alt = alt || ''; img.loading = 'lazy';
    return img;
  };
  const external = (url, text, className) => {
    const a = node('a', text, className); a.href = safeUrl(url); a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  };
  // Keep the static snapshot only when the API fails. A successful empty result
  // means an administrator has intentionally unpublished the content.
  const load = async (collection, render) => {
    try { render(await get(collection)); } catch (error) { console.warn('Unable to load ' + collection); }
  };
  const syncStructuredData = (collection, items) => {
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
      try {
        const data = JSON.parse(el.textContent);
        if (collection === 'social_links') {
          data.sameAs = items.filter(x => x.platform !== 'google_maps').map(x => safeUrl(x.url)).filter(Boolean);
          const maps = items.find(x => x.platform === 'google_maps');
          if (maps) data.hasMap = safeUrl(maps.url); else delete data.hasMap;
        }
        if (collection === 'licenses') {
          data.hasCredential = items.map(x => ({'@type':'EducationalOccupationalCredential',name:[x.state,x.license_type,x.license_number].filter(Boolean).join(' ')}));
        }
        el.textContent = JSON.stringify(data);
      } catch {}
    });
  };
  const renderSocial = social => {
    document.querySelectorAll('footer .social-links').forEach(el => {
      el.replaceChildren(...social.filter(x => safeUrl(x.url)).map(x => external(x.url, x.label, 'social-link')));
    });
    document.querySelectorAll('[data-social-platform]').forEach(a => {
      const item = social.find(x => x.platform === a.dataset.socialPlatform && safeUrl(x.url));
      a.hidden = !item;
      if (item) a.href = safeUrl(item.url); else a.removeAttribute('href');
    });
    syncStructuredData('social_links', social);
  };
  const renderLicenses = licenses => {
    const text = x => [x.state,x.license_type,x.license_number,x.holder ? 'License holder: '+x.holder : '',x.expires_on ? 'Expires '+x.expires_on : ''].filter(Boolean).join(' · ');
    document.querySelectorAll('footer .license-line').forEach(el => el.replaceChildren(...licenses.map(x => node('div',text(x)))));
    document.querySelectorAll('.license-credentials').forEach(section => {
      const container = section.querySelector('.container');
      container.querySelectorAll('p').forEach(el => el.remove());
      licenses.forEach(x => container.append(node('p',text(x))));
      section.hidden = !licenses.length;
    });
    document.querySelectorAll('footer .copyright').forEach(el => { el.textContent = '© '+new Date().getFullYear()+' United SA Construction, Inc. All rights reserved.'; });
    syncStructuredData('licenses', licenses);
  };
  const renderServices = services => {
    const select = document.getElementById('service');
    if (select) {
      const current = select.value || sessionStorage.getItem('requestedService') || '';
      select.replaceChildren(new Option('Choose a service',''),...services.map(x => new Option(x.name,x.name)));
      select.value = current;
    }
    document.querySelectorAll('#cards').forEach(container => {
      container.replaceChildren(...services.filter(x => x.show_card !== false).map(x => {
        const card = node('article',null,'card'); const img = image(x.image_url,x.name); if (img) card.append(img);
        const body = node('div',null,'body'); body.append(node('h3',x.name),node('p',x.description));
        const a = node('a','REQUEST AN ESTIMATE →'); a.href = '/contact#estimate';
        a.addEventListener('click',() => sessionStorage.setItem('requestedService',x.name));
        body.append(a); card.append(body); return card;
      }));
    });
    document.querySelectorAll('footer .cols > div').forEach(column => {
      if (column.querySelector('h4')?.textContent.trim() === 'Services') {
        const p = column.querySelector('p'); if (p) p.textContent = services.map(x => x.name).join(' · ');
      }
    });
  };
  const renderProjects = projects => { window.UnitedPortfolio?.render(projects); };
  const renderBrands = brands => {
    document.querySelectorAll('.brand-list').forEach(container => {
      container.replaceChildren(...brands.map(x => {
        const tile = node('div',null,'brand-tile'); const img = image(x.image_url,x.name);
        const wordmark = node('span',x.name,'brand-wordmark');
        // Preserve the existing wordmark styles when no replacement logo is set.
        const styles = {'Trex':'brand-trex','TimberTech':'brand-timbertech','GAF Timberline':'brand-gaf','Ply Gem':'brand-plygem'};
        if (styles[x.name]) wordmark.classList.add(styles[x.name]);
        const label = img || wordmark;
        if (img) { img.style.maxWidth = '180px'; img.style.maxHeight = '64px'; img.style.objectFit = 'contain'; }
        if (safeUrl(x.url)) { const a = external(x.url); a.append(label); tile.append(a); } else tile.append(label);
        tile.append(node('small',x.description)); return tile;
      }));
      container.closest('.brand-strip').hidden = !brands.length;
    });
  };
  Promise.all([
    load('social_links',renderSocial), load('licenses',renderLicenses),
    load('services',renderServices), load('projects',renderProjects), load('brands',renderBrands)
  ]);
  const form = document.getElementById('estimate');
  if (form) form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true;
    const data = Object.fromEntries(new FormData(form)); data.kind = 'estimate';
    try {
      const response = await fetch('/.netlify/functions/api?submit=1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const result = await response.json(); if (!response.ok) throw Error(result.error || 'Submission failed');
      form.reset(); alert('Thank you! Your request has been received. We will contact you soon.');
    } catch (error) { alert(error.message+' Please call (508) 252-7420 if this continues.'); }
    finally { button.disabled = false; }
  });
})();
