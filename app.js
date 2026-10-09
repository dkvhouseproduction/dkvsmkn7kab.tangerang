(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.DKV_CONFIG || {};
  const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');
  const sb = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  let items = [], currentUser = null, activeFilter = 'all';
  $('year').textContent = new Date().getFullYear();
  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)}
  function notice(msg){$('adminNotice').textContent=msg||''}
  function openLogin(){ $('loginOverlay').classList.remove('hidden'); $('loginEmail').focus(); }
  function closeLogin(){ $('loginOverlay').classList.add('hidden'); }
  $('openLogin').addEventListener('click',openLogin); $('closeLogin').addEventListener('click',closeLogin);
  $('loginOverlay').addEventListener('click',e=>{if(e.target===$('loginOverlay'))closeLogin()});
  $('menuToggle').addEventListener('click',()=>{const n=$('mainNav');n.classList.toggle('open');$('menuToggle').setAttribute('aria-expanded',n.classList.contains('open')?'true':'false')});
  document.querySelectorAll('#mainNav a').forEach(a=>a.addEventListener('click',()=> $('mainNav').classList.remove('open')));
  document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeFilter=b.dataset.filter;renderGallery()}));
  $('refreshGallery').addEventListener('click',loadItems);
  if(!sb){$('galleryGrid').innerHTML='<div class="empty-state"><div class="empty-icon">▧</div><h3>Website siap dikonfigurasi</h3><p>Galeri akan aktif setelah URL dan public key Supabase diisi pada file config.js.</p></div>'; $('loginMessage').textContent='Hubungkan project Supabase terlebih dahulu. Lihat README.md.';}
  async function loadItems(){if(!sb)return;const {data,error}=await sb.from('content').select('*').eq('published',true).order('event_date',{ascending:false});if(error){$('galleryGrid').innerHTML='<div class="empty-state"><h3>Galeri belum dapat dimuat</h3><p>Periksa pengaturan Supabase dan kebijakan database.</p></div>';return}items=data||[];renderGallery()}
  function mediaMarkup(item){if(item.youtube_url){let id='';try{const u=new URL(item.youtube_url);if(u.hostname.includes('youtu.be'))id=u.pathname.slice(1);else id=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop()}catch{};return id?`<iframe class="gallery-media" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="${esc(item.title)}" loading="lazy" allowfullscreen></iframe>`:'<div class="gallery-media"></div>'}if(!item.media_url)return '<div class="gallery-media"></div>';if((item.media_type||'').startsWith('video/'))return `<video class="gallery-media" controls preload="metadata" src="${esc(item.media_url)}"></video>`;return `<img class="gallery-media" src="${esc(item.media_url)}" alt="${esc(item.title)}" loading="lazy">`}
  function renderGallery(){const filtered=items.filter(x=>activeFilter==='all'||x.category===activeFilter||(activeFilter==='Desain'&&x.category==='Karya Siswa'));$('galleryCount').textContent=`${filtered.length} konten ditampilkan`;if(!filtered.length){$('galleryGrid').innerHTML='<div class="empty-state"><div class="empty-icon">▧</div><h3>Belum ada konten</h3><p>Konten yang dipublikasikan admin akan tampil di sini.</p></div>';return}$('galleryGrid').innerHTML=filtered.map(x=>`<article class="gallery-card">${mediaMarkup(x)}<div class="gallery-info"><small>${esc(x.category)} · ${esc(x.event_date||'')}</small><h3>${esc(x.title)}</h3><p>${esc(x.description||'')}</p></div></article>`).join('')}
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = $('loginMessage');
    const submitButton = $('loginForm').querySelector('button[type=submit]');
    if (!sb) {
      message.textContent = 'Supabase belum dikonfigurasi. Periksa config.js dan pastikan URL serta publishable/anon key berasal dari project yang sama.';
      return;
    }
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;
    submitButton.disabled = true;
    message.textContent = 'Memeriksa akun…';
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        message.textContent = 'Login gagal: ' + error.message;
        return; media 
      }
      if (!data.user) {
        message.textContent = 'Login tidak menghasilkan data user. Periksa akun di Supabase Authentication > Users.';
        return;
      }
      currentUser = data.user;
      const { data: profile, error: profileError } = await sb
        .from('profiles').select('role').eq('id', currentUser.id).maybeSingle();
      if (profileError) {
        await sb.auth.signOut();
        currentUser = null;
        message.textContent = 'Login Supabase berhasil, tetapi profil gagal dibaca: ' + profileError.message + (profileError.code ? ' (kode ' + profileError.code + ')' : '') + '. Periksa tabel profiles dan kebijakan SELECT RLS.';
        return;
      }
      if (!profile) {
        await sb.auth.signOut();
        currentUser = null;
        message.textContent = 'Login Supabase berhasil, tetapi profil untuk user ID ini tidak ditemukan di public.profiles. Pastikan admin dibuat pada project Supabase yang sama.';
        return;
      }
      if (!['admin', 'editor'].includes(profile.role)) {
        await sb.auth.signOut();
        currentUser = null;
        message.textContent = 'Akun berhasil login, tetapi role yang terbaca adalah "' + profile.role + '". Role harus admin atau editor.';
        return;
      }
      closeLogin();
      $('publicSite').classList.add('hidden');
      document.querySelector('.site-header').classList.add('hidden');
      document.querySelector('.site-footer').classList.add('hidden');
      $('adminApp').classList.remove('hidden');
      $('adminEmail').textContent = currentUser.email || email;
      $('adminAvatar').textContent = (currentUser.email || email || 'A')[0].toUpperCase();
      notice('Login berhasil. Peran: ' + profile.role);
      await loadAdminItems();
    } catch (err) {
      message.textContent = 'Kesalahan saat login: ' + (err && err.message ? err.message : String(err));
    } finally {
      submitButton.disabled = false;
    }
  });
  document.querySelectorAll('.admin-tab').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.panel)));
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.goto)));
  function showPanel(name){document.querySelectorAll('.admin-tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));document.querySelectorAll('.admin-panel').forEach(p=>p.classList.toggle('hidden',p.id!=='panel-'+name));$('adminPageTitle').textContent=({overview:'Ringkasan',content:'Konten & Galeri',add:'Tambah konten'})[name]||'Dashboard';if(name==='add')resetForm()}
  $('viewSite').addEventListener('click',()=>{ $('adminApp').classList.add('hidden');$('publicSite').classList.remove('hidden');document.querySelector('.site-header').classList.remove('hidden');document.querySelector('.site-footer').classList.remove('hidden') });
  $('logoutButton').addEventListener('click',async()=>{if(sb)await sb.auth.signOut();currentUser=null;$('adminApp').classList.add('hidden');$('publicSite').classList.remove('hidden');document.querySelector('.site-header').classList.remove('hidden');document.querySelector('.site-footer').classList.remove('hidden');toast('Kamu sudah keluar dari dashboard')});
  async function loadAdminItems(){if(!sb)return;const {data,error}=await sb.from('content').select('*').order('created_at',{ascending:false});if(error){notice('Gagal memuat data: '+error.message);return}const all=data||[];$('statTotal').textContent=all.length;$('statPublished').textContent=all.filter(x=>x.published).length;$('statDraft').textContent=all.filter(x=>!x.published).length;const row=x=>`<div class="admin-row"><div>${x.media_url&&x.media_type?.startsWith('image/')?`<img src="${esc(x.media_url)}" alt="">`:'▧'}</div><div><strong>${esc(x.title)}</strong><small>${esc(x.category)} · ${x.published?'Terbit':'Draft'} · ${esc(x.event_date||'')}</small></div></div>`;$('recentList').innerHTML=all.slice(0,5).map(row).join('')||'<p class="muted">Belum ada konten.</p>';$('manageList').innerHTML=all.map(x=>`<div class="manage-row"><div>${x.media_url&&x.media_type?.startsWith('image/')?`<img src="${esc(x.media_url)}" alt="">`:'▧'}</div><div class="row-copy"><strong>${esc(x.title)}</strong><small>${esc(x.category)} · ${esc(x.event_date||'')} · ${x.published?'Dipublikasikan':'Draft'}</small></div><div class="row-actions"><button class="small-btn" data-edit="${x.id}">Edit</button><button class="small-btn" data-toggle="${x.id}" data-published="${x.published}">${x.published?'Jadikan draft':'Publikasikan'}</button><button class="small-btn danger" data-delete="${x.id}">Hapus</button></div></div>`).join('')||'<p class="muted">Belum ada konten.</p>';document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editContent(all.find(x=>x.id===b.dataset.edit)));document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>togglePublish(b.dataset.toggle,b.dataset.published==='true'));document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteContent(b.dataset.delete))}
  function resetForm(){ $('contentForm').reset();$('contentId').value='';$('contentFormTitle').textContent='Tambah konten baru';$('contentDate').value=new Date().toISOString().slice(0,10);$('currentMedia').textContent='';$('contentMessage').textContent='';$('saveContent').disabled=false }
  function editContent(x){if(!x)return;showPanel('add');$('contentId').value=x.id;$('contentTitle').value=x.title;$('contentCategory').value=x.category;$('contentDate').value=x.event_date;$('contentDescription').value=x.description||'';$('videoUrl').value=x.youtube_url||'';$('contentPublished').checked=!!x.published;$('currentMedia').textContent=x.media_url?'Media saat ini tersimpan. Unggah file baru untuk menggantinya.':'';$('contentFormTitle').textContent='Edit konten'}
  $('cancelEdit').addEventListener('click',()=>showPanel('content'));
  $('contentForm').addEventListener('submit',async e=>{e.preventDefault();if(!sb||!currentUser)return;const btn=$('saveContent');btn.disabled=true;$('contentMessage').textContent='Menyimpan…';try{const id=$('contentId').value||null,file=$('mediaFile').files[0],youtube=$('videoUrl').value.trim();let media_url=null,media_type=null;const old=items.find(x=>x.id===id);if(old){media_url=old.media_url;media_type=old.media_type}if(file){const isVideo= isVideo ? 'Video' : 'image'.startsWith('video/');const max=isVideo?50*1024*1024:8*1024*1024;if(file.size>max)throw new Error(isVideo?'Ukuran video maksimal 50 MB.':'Ukuran foto maksimal 8 MB.');const path=`${currentUser.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await sb.storage.from('dkv-media').upload(path,file,{upsert:false,contentType:file.type});if(up.error)throw up.error;media_url=sb.storage.from('dkv-media').getPublicUrl(path).data.publicUrl;media_type=file.type}const payload={title:$('contentTitle').value.trim(),category:$('contentCategory').value,event_date:$('contentDate').value,description:$('contentDescription').value.trim(),youtube_url:youtube||null,media_url:youtube?null:media_url,media_type:youtube?'video/youtube':media_type,published:$('contentPublished').checked,created_by:currentUser.id};let res=id?await sb.from('content').update(payload).eq('id',id):await sb.from('content').insert(payload);if(res.error)throw res.error;$('contentMessage').textContent='Konten berhasil disimpan.';toast('Konten berhasil disimpan');resetForm();await loadAdminItems();await loadItems();showPanel('content')}catch(err){$('contentMessage').textContent='Gagal menyimpan: '+(err.message||'Periksa konfigurasi Supabase.')}finally{btn.disabled=false}});
  async function togglePublish(id,published){const {error}=await sb.from('content').update({published:!published}).eq('id',id);if(error){notice('Gagal mengubah status: '+error.message);return}toast('Status publikasi diperbarui');await loadAdminItems();await loadItems()}
  async function deleteContent(id){if(!confirm('Yakin ingin menghapus konten ini?'))return;const {error}=await sb.from('content').delete().eq('id',id);if(error){notice('Gagal menghapus: '+error.message);return}toast('Konten dihapus');await loadAdminItems();await loadItems()}
  if(sb){loadItems();sb.auth.getSession().then(({data})=>{if(data.session)currentUser=data.session.user})}
})();
