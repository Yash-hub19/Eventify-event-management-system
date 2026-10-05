// Renders shared navbar + footer into #app-navbar / #app-footer placeholders on every page.

const CATEGORY_ICONS = {};

function renderNavbar() {
  const mount = document.getElementById('app-navbar');
  if (!mount) return;
  const user = getUser();

  const navLinks = `
    <a href="index">Browse Events</a>
    <a href="index#categories">Categories</a>
    ${user && (user.role === 'organizer') ? '<a href="organizer-dashboard">Organizer Dashboard</a>' : ''}
    ${user && user.role === 'admin' ? '<a href="admin-dashboard">Admin Panel</a>' : ''}
    ${!user || user.role === 'user' ? '<a href="become-organizer">Become an Organizer</a>' : ''}
  `;

  const rightSide = user
    ? `
      <button class="avatar-btn" id="notif-btn" title="Notifications" style="background:var(--coral);">
        🔔<span class="notif-dot hidden" id="notif-dot"></span>
      </button>
      <div class="dropdown">
        <button class="avatar-btn" id="user-menu-btn">${user.name.charAt(0).toUpperCase()}</button>
        <div class="dropdown-menu hidden" id="user-dropdown">
          <div style="padding:10px 14px;"><strong>${user.name}</strong><br/><span class="muted">${user.email}</span></div>
          <hr/>
          <a href="profile">My Profile</a>
          <a href="profile?tab=bookings">My Bookings</a>
          <a href="profile?tab=favorites">Favorites</a>
          ${user.role === 'organizer' ? '<a href="organizer-dashboard">Organizer Dashboard</a>' : ''}
          ${user.role === 'admin' ? '<a href="admin-dashboard">Admin Panel</a>' : ''}
          <hr/>
          <button id="logout-btn">Log out</button>
        </div>
      </div>
    `
    : `
      <a href="login" class="btn btn-outline btn-sm">Log in</a>
      <a href="register" class="btn btn-primary btn-sm">Sign up</a>
    `;

  mount.innerHTML = `
    <div class="nav-inner">
      <a href="index" class="logo">Eventify<span class="dot">.</span></a>
      <nav class="nav-links">${navLinks}</nav>
      <div class="nav-actions">${rightSide}</div>
    </div>
  `;

  const menuBtn = document.getElementById('user-menu-btn');
  const dropdown = document.getElementById('user-dropdown');
  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => dropdown.classList.add('hidden'));
  }
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearToken();
      showToast('Logged out successfully', 'success');
      setTimeout(() => (window.location.href = 'index'), 500);
    });
  }
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', openNotificationsPanel);
    refreshNotifBadge();
  }
}

async function refreshNotifBadge() {
  if (!isLoggedIn()) return;
  try {
    const { unreadCount } = await api.get('/notifications');
    const dot = document.getElementById('notif-dot');
    if (dot) dot.classList.toggle('hidden', unreadCount === 0);
  } catch (e) { /* silent */ }
}

async function openNotificationsPanel() {
  try {
    const { notifications } = await api.get('/notifications');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" id="close-notif">&times;</button>
        <h3>Notifications</h3>
        ${notifications.length === 0 ? '<p class="muted">No notifications yet.</p>' : ''}
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
          ${notifications.map(n => `
            <div class="card" style="padding:14px;${n.isRead ? '' : 'border-color:var(--coral);'}">
              <strong style="font-size:.9rem;">${n.title}</strong>
              <p class="muted" style="margin:4px 0 0;">${n.message}</p>
              <span class="muted" style="font-size:.72rem;">${new Date(n.createdAt).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('close-notif').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    await api.put('/notifications/read', {});
    refreshNotifBadge();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function renderFooter() {
  const mount = document.getElementById('app-footer');
  if (!mount) return;
  mount.innerHTML = `
    <footer>
      <div class="container">
        <div class="foot-grid">
          <div>
            <a href="index" class="logo" style="color:var(--paper);">Eventify<span class="dot">.</span></a>
            <p style="color:rgba(250,246,239,.7); max-width: 32ch; margin-top:12px;">Discover, book, and manage events of every kind — from weddings to workshops to weekend concerts.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <a href="index">Browse Events</a>
            <a href="index#categories">Categories</a>
            <a href="become-organizer">Become an Organizer</a>
          </div>
          <div>
            <h4>Account</h4>
            <a href="login">Log in</a>
            <a href="register">Sign up</a>
            <a href="profile">My Profile</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Contact</a>
            <a href="#">Help Center</a>
          </div>
        </div>
        <div class="foot-bottom">
          <span>© ${new Date().getFullYear()} Eventify. Built as a MERN-stack demo project.</span>
          <span>Payments are simulated for demo purposes.</span>
        </div>
      </div>
    </footer>
  `;
}

function requireAuth(roles = null) {
  const user = getUser();
  if (!isLoggedIn() || !user) {
    window.location.href = 'login';
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    window.location.href = 'index';
    return null;
  }
  return user;
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();
});
