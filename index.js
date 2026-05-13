// ============================================================
// LEARN FORGE — index.js  (Home page logic)
// Handles: hero stats, filter tabs/chips, project grid,
//          project detail overlay, bookmark, start project.
// Depends on: auth.js (loaded first), projects-data.js
// ============================================================
import { auth, db } from './auth.js';
import {
  collection, getDocs, doc, setDoc, updateDoc,
  arrayUnion, arrayRemove, increment,
  serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── State ──────────────────────────────────────────────────────
let currentUser      = null;
let allProjects      = [];
let filtered         = [];
let activeCategory   = 'all';
let activeTech       = 'all';
let currentProjectId = null;
let savedProjects    = new Set();

// ── Seed Data (shown while Firestore loads) ───────────────────
const SEED_PROJECTS = (window.LF_PROJECTS || []).slice(0, 12);

// ── Auth callback (called by auth.js when state changes) ──────
window.onAuthReady = function (user) {
  currentUser = user;
  if (user) {
    // Reload saved bookmarks
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')
      .then(({ doc: d, getDoc }) => getDoc(d(db, 'users', user.uid)))
      .then(snap => { if (snap.exists()) savedProjects = new Set(snap.data().saved || []); })
      .catch(() => {});
  }
};

// ── Load Projects ─────────────────────────────────────────────
async function loadProjects() {
  try {
    const snap = await getDocs(query(collection(db, 'projects'), orderBy('devs', 'desc')));
    if (snap.empty) {
      const base = window.LF_PROJECTS || SEED_PROJECTS;
      for (const p of base) {
        await setDoc(doc(db, 'projects', p.id), { ...p, createdAt: serverTimestamp() });
      }
      allProjects = base;
    } else {
      allProjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    allProjects = window.LF_PROJECTS || SEED_PROJECTS;
  }
  applyFilters();
  updateStatCount();
}

function updateStatCount() {
  const totalDevs = allProjects.reduce((s, p) => s + (p.devs || 0), 0);
  animateNumber('stat-devs',      totalDevs, '+');
  animateNumber('stat-projects',  allProjects.length, '+');
  animateNumber('stat-solutions', Math.round(totalDevs * 0.28), '+');
}

function animateNumber(id, target, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1200;
  const startTime = performance.now();
  const fmt = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;
  const animate = now => {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(Math.round(target * ease)) + suffix;
    if (t < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

// ── Filtering ─────────────────────────────────────────────────
function applyFilters() {
  filtered = allProjects.filter(p => {
    const catOk  = activeCategory === 'all' || p.category === activeCategory;
    const techOk = activeTech === 'all' || (p.tech && p.tech.includes(activeTech));
    return catOk && techOk;
  });
  renderProjects();
}

function renderProjects() {
  const grid  = document.getElementById('projects-grid');
  const count = document.getElementById('projects-count');
  if (!grid) return;
  count.textContent = `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--text-muted);">
        <div style="font-size:40px;margin-bottom:12px;">🔍</div>
        <div style="font-size:16px;margin-bottom:8px;">No projects found</div>
        <div style="font-size:14px;">Try a different filter combination</div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => `
    <article class="project-card" role="listitem" style="animation-delay:${i * 40}ms"
             onclick="openDetail('${p.id}')" tabindex="0"
             onkeydown="if(event.key==='Enter') openDetail('${p.id}')"
             aria-label="${p.title}">
      <div class="card-top">
        <span class="badge badge-${p.difficulty}">${p.difficulty}</span>
        <span class="card-category">${categoryLabel(p.category)}</span>
      </div>
      <h3 class="card-title">${p.title}</h3>
      <p class="card-desc">${p.desc}</p>
      <div class="card-tech">
        ${(p.tags || []).slice(0, 4).map(t => `<span class="tech-tag">${t}</span>`).join('')}
      </div>
      <div class="card-footer">
        <div class="card-devs">
          <span class="dev-icon">👥</span>
          <span>${formatNum(p.devs)} developers</span>
        </div>
        <div class="card-link-btn">View Project →</div>
      </div>
    </article>`).join('');
}

// ── Helpers ───────────────────────────────────────────────────
const categoryLabel = c => ({ web: '🌐 Web', mobile: '📱 Mobile', tool: '🛠️ Tools' }[c] || c);
const formatNum = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;

// ── Filter Controls ───────────────────────────────────────────
document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => {
      b.classList.remove('active'); b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
    activeCategory = btn.dataset.cat;
    const headings = {
      all: 'All Projects', web: '🌐 Web Projects',
      mobile: '📱 Mobile Projects', tool: '🛠️ Tools & Automation'
    };
    const h = document.getElementById('projects-heading');
    if (h) h.textContent = headings[activeCategory] || 'Projects';
    applyFilters();
  });
});

document.querySelectorAll('.tech-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tech-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTech = btn.dataset.tech;
    applyFilters();
  });
});

// ── Project Detail Overlay ────────────────────────────────────
window.openDetail = function (id) {
  const p = allProjects.find(x => x.id === id);
  if (!p) return;
  currentProjectId = id;

  document.getElementById('detail-title').textContent         = p.title;
  document.getElementById('detail-category-label').textContent = categoryLabel(p.category);
  const diffBadge = document.getElementById('detail-difficulty');
  diffBadge.textContent = p.difficulty;
  diffBadge.className   = `badge badge-${p.difficulty}`;
  document.getElementById('detail-desc').textContent    = p.desc;
  document.getElementById('detail-devs').textContent    = formatNum(p.devs);
  document.getElementById('detail-time').textContent    = p.time || '1–2 weeks';

  document.getElementById('detail-tech-tags').innerHTML =
    (p.tags || []).map(t => `<span class="tech-tag">${t}</span>`).join('');

  document.getElementById('detail-requirements').innerHTML =
    (p.requirements || []).map(r => `<li><span class="req-dot"></span>${r}</li>`).join('');

  document.getElementById('detail-skills').innerHTML =
    (p.skills || []).map(s => `<span class="badge badge-tech">${s}</span>`).join('');

  const bm = document.getElementById('btn-bookmark');
  bm.classList.toggle('saved', savedProjects.has(id));
  bm.setAttribute('aria-pressed', savedProjects.has(id));

  const overlay = document.getElementById('detail-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('detail-title').focus();
};

window.closeDetail = function () {
  document.getElementById('detail-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
};

document.getElementById('detail-overlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) window.closeDetail();
});

// ── Bookmark ──────────────────────────────────────────────────
window.toggleBookmark = async function () {
  if (!currentUser) { window.openModal('signup'); return; }
  const id = currentProjectId;
  const ref = doc(db, 'users', currentUser.uid);
  const isSaved = savedProjects.has(id);
  if (isSaved) {
    savedProjects.delete(id);
    try { await updateDoc(ref, { saved: arrayRemove(id) }); } catch (e) {}
    window.showToast('Removed from saved', 'info');
  } else {
    savedProjects.add(id);
    try { await updateDoc(ref, { saved: arrayUnion(id) }); } catch (e) {}
    window.showToast('Project saved! 🔖', 'success');
  }
  const bm = document.getElementById('btn-bookmark');
  bm.classList.toggle('saved', savedProjects.has(id));
  bm.setAttribute('aria-pressed', savedProjects.has(id));
};

// ── Start Project ─────────────────────────────────────────────
window.startProject = async function () {
  if (!currentUser) { window.openModal('signup'); return; }
  const id = currentProjectId;
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'inProgress', id),
      { projectId: id, startedAt: serverTimestamp() });
    await updateDoc(doc(db, 'projects', id), { devs: increment(1) });
  } catch (e) {}
  window.showToast('Project started! Good luck 🚀', 'success');
  window.closeDetail();
};

// ── Footer filter shortcut ────────────────────────────────────
window.filterByTech = function (tech) {
  document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
  if (['web', 'mobile', 'tool'].includes(tech)) {
    document.querySelector(`[data-cat="${tech}"]`)?.click();
  } else {
    document.querySelector(`[data-tech="${tech}"]`)?.click();
  }
};

// ── Init ──────────────────────────────────────────────────────
loadProjects();
