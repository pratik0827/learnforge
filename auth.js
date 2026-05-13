// ============================================================
// LEARN FORGE — Shared Auth & UI Utilities
// ============================================================
import { auth, db, googleProvider } from './firebase-config.js';
import {
  signInWithPopup, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut as fbSignOut,
  onAuthStateChanged, updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Toast ─────────────────────────────────────────────────────
window.showToast = function (msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
};

// ── Auth Modal ────────────────────────────────────────────────
window.openModal = function (tab = 'login') {
  const m = document.getElementById('auth-modal');
  if (m) { 
    window.switchTab(tab);
    m.classList.add('open'); 
    document.body.style.overflow = 'hidden'; 
  }
};
window.closeModal = function () {
  const m = document.getElementById('auth-modal');
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
};

window.switchTab = function (tab) {
  const loginTab  = document.getElementById('tab-login')  || document.getElementById('tab-login-m');
  const signupTab = document.getElementById('tab-signup') || document.getElementById('tab-signup-m');
  const fLogin   = document.getElementById('form-login');
  const fSignup  = document.getElementById('form-signup');
  
  if (fLogin)  fLogin.style.display  = tab === 'login'  ? '' : 'none';
  if (fSignup) fSignup.style.display = tab === 'signup' ? '' : 'none';
  if (loginTab)  loginTab.classList.toggle('active',  tab === 'login');
  if (signupTab) signupTab.classList.toggle('active', tab === 'signup');
};

// ── Google Sign-In ─────────────────────────────────────────────
window.signInWithGoogle = async function () {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
    window.closeModal();
    window.showToast(`Welcome back, ${result.user.displayName}! 👋`, 'success');
  } catch (e) {
    console.error("Google Sign-In Error:", e);
    let msg = 'Sign-in failed. Please try again.';
    if (e.code === 'auth/popup-blocked') msg = 'Popup blocked by browser. Please allow popups.';
    if (e.code === 'auth/cancelled-popup-request') msg = 'Sign-in cancelled.';
    if (e.code === 'auth/operation-not-allowed') msg = 'Google sign-in is not enabled in Firebase Console.';
    window.showToast(msg, 'error');
  }
};

// ── Email Sign-In ──────────────────────────────────────────────
window.signInWithEmail = async function () {
  const email = document.getElementById('login-email')?.value.trim();
  const pass  = document.getElementById('login-password')?.value;
  if (!email || !pass) { window.showToast('Please fill in all fields', 'error'); return; }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    window.closeModal();
    window.showToast('Welcome back! 👋', 'success');
  } catch (e) {
    window.showToast(friendlyAuthError(e.code), 'error');
  }
};

// ── Email Sign-Up ──────────────────────────────────────────────
window.signUpWithEmail = async function () {
  const name  = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim();
  const pass  = document.getElementById('signup-password')?.value;
  if (!name || !email || !pass) { window.showToast('Please fill in all fields', 'error'); return; }
  if (pass.length < 6) { window.showToast('Password must be at least 6 characters', 'error'); return; }
  try {
    const r = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(r.user, { displayName: name });
    await ensureUserDoc(r.user, name);
    window.closeModal();
    window.showToast(`Welcome to Learn Forge, ${name}! 🎉`, 'success');
  } catch (e) {
    window.showToast(friendlyAuthError(e.code), 'error');
  }
};

// ── Sign Out ───────────────────────────────────────────────────
window.signOut = async function () {
  try { 
    await fbSignOut(auth); 
    window.showToast('Signed out. See you soon! 👋', 'info'); 
  } catch (e) {
    console.error("Sign Out Error:", e);
  }
};

// ── User Menu ──────────────────────────────────────────────────
window.toggleUserMenu = function () {
  document.getElementById('user-menu')?.classList.toggle('open');
};

// Handle clicks outside the user menu to close it
document.addEventListener('click', e => {
  const menu = document.getElementById('user-menu');
  const btn  = document.getElementById('user-btn');
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove('open');
  }
});

// ── Ensure User Firestore Doc ──────────────────────────────────
async function ensureUserDoc(user, displayName) {
  try {
    const ref  = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid:      user.uid,
        name:     displayName || user.displayName || '',
        email:    user.email,
        photoURL: user.photoURL || '',
        saved:    [], inProgress: [], completed: [],
        createdAt: serverTimestamp()
      });
    }
  } catch (e) { 
    console.error("Error ensuring user doc:", e);
  }
}
window.ensureUserDoc = ensureUserDoc;

// ── Auth State Change ──────────────────────────────────────────
onAuthStateChanged(auth, user => {
  const navActions  = document.getElementById('nav-actions');
  const userSection = document.getElementById('user-section');
  const nameEl      = document.getElementById('user-display-name');
  const avatarEl    = document.getElementById('user-avatar');

  if (user) {
    if (navActions)  navActions.style.display  = 'none';
    if (userSection) userSection.style.display = 'flex';
    if (nameEl)  nameEl.textContent = (user.displayName || '').split(' ')[0] || 'Account';
    if (avatarEl) {
      avatarEl.src = user.photoURL ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || user.email)}`;
    }
    ensureUserDoc(user);
    
    // Autofill author name in submit-project.html
    const authorInput = document.getElementById('proj-author');
    if (authorInput && !authorInput.value) authorInput.value = user.displayName || '';
    
  } else {
    if (navActions)  navActions.style.display  = 'flex';
    if (userSection) userSection.style.display = 'none';
  }

  // Hook for page-specific initialization
  if (typeof window.onAuthReady === 'function') window.onAuthReady(user);
});

// ── Shared UI Effects ──────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    window.closeModal();
    document.getElementById('detail-overlay')?.classList.remove('open');
  }
});

// Close modal on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) window.closeModal();
    });
  }
});

// ── Auth Error Messages ────────────────────────────────────────
function friendlyAuthError(code) {
  const map = {
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/invalid-email':        'Please enter a valid email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/user-not-found':       'No account found with that email.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/operation-not-allowed': 'Email/Password sign-in is not enabled in Firebase Console.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

export { auth, db, googleProvider };

