let user = null;

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  if (tab === 'bookings') loadBookings();
  if (tab === 'favorites') loadFavorites();
  history.replaceState(null, '', `profile?tab=${tab}`);
}

function renderProfileTab() {
  document.getElementById('tab-profile').innerHTML = `
    <div class="card" style="max-width:520px;">
      <h3>Edit profile</h3>
      <div id="profile-msg"></div>
      <div class="form-group"><label>Name</label><input type="text" id="p-name" value="${user.name}" /></div>
      <div class="form-group"><label>Email</label><input type="email" value="${user.email}" disabled /></div>
      <div class="form-group"><label>Phone</label><input type="text" id="p-phone" value="${user.phone || ''}" /></div>
      <div class="form-group"><label>Bio</label><textarea id="p-bio">${user.bio || ''}</textarea></div>
      <button class="btn btn-primary" id="save-profile-btn">Save changes</button>
    </div>

    <div class="card" style="max-width:520px;margin-top:20px;">
      <h3>Change password</h3>
      <div id="pw-msg"></div>
      <div class="form-group"><label>Current password</label><input type="password" id="pw-current" /></div>
      <div class="form-group"><label>New password</label><input type="password" id="pw-new" minlength="6" /></div>
      <button class="btn btn-dark" id="change-pw-btn">Update password</button>
    </div>

    ${user.role === 'user' ? `
    <div class="card" style="max-width:520px;margin-top:20px;background:var(--paper-dim);border:none;">
      <h3>Want to host events?</h3>
      <p class="muted">Apply for organizer access to create and manage your own events.</p>
      <a href="become-organizer" class="btn btn-outline">Become an organizer</a>
    </div>` : ''}
  `;

  document.getElementById('save-profile-btn').addEventListener('click', async () => {
    try {
      const { user: updated } = await api.put('/users/profile', {
        name: document.getElementById('p-name').value,
        phone: document.getElementById('p-phone').value,
        bio: document.getElementById('p-bio').value,
      });
      setUser(updated);
      document.getElementById('profile-msg').innerHTML = `<div class="form-success">Profile updated</div>`;
      showToast('Profile updated', 'success');
    } catch (err) {
      document.getElementById('profile-msg').innerHTML = `<div class="form-error">${err.message}</div>`;
    }
  });

  document.getElementById('change-pw-btn').addEventListener('click', async () => {
    try {
      await api.put('/users/change-password', {
        currentPassword: document.getElementById('pw-current').value,
        newPassword: document.getElementById('pw-new').value,
      });
      document.getElementById('pw-msg').innerHTML = `<div class="form-success">Password updated</div>`;
      document.getElementById('pw-current').value = '';
      document.getElementById('pw-new').value = '';
    } catch (err) {
      document.getElementById('pw-msg').innerHTML = `<div class="form-error">${err.message}</div>`;
    }
  });
}

function bookingCardHTML(b) {
  const ev = b.event;
  const dateStr = ev ? new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return `
    <div class="card" style="display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;">
      <div style="width:64px;height:64px;border-radius:12px;background:var(--plum);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.6rem;">
        ${(ev?.category && ev.category.icon) || '🎫'}
      </div>
      <div>
        <div class="flex gap-8" style="align-items:center;">
          <strong>${ev ? ev.title : 'Event unavailable'}</strong>
          <span class="badge badge-${b.status}">${b.status}</span>
        </div>
        <p class="muted" style="margin:4px 0 0;">${dateStr} · ${b.ticketTypeName} × ${b.quantity} · ₹${b.totalAmount}</p>
        <p class="muted" style="font-family:var(--font-mono);font-size:.78rem;">${b.bookingCode}</p>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-outline btn-sm" data-view="${b._id}">View Ticket</button>
        ${b.status === 'confirmed' ? `<button class="btn btn-ghost btn-sm" data-cancel="${b._id}" style="color:#B3261E;">Cancel</button>` : ''}
      </div>
    </div>
  `;
}

async function loadBookings() {
  const mount = document.getElementById('tab-bookings');
  mount.innerHTML = '<div class="loader">Loading bookings…</div>';
  try {
    const { bookings } = await api.get('/bookings/my');
    if (bookings.length === 0) {
      mount.innerHTML = `<div class="empty-state"><div class="icon">🎫</div><h3>No bookings yet</h3><p>Browse events and book your first ticket!</p><a href="index" class="btn btn-primary" style="margin-top:12px;">Browse Events</a></div>`;
      return;
    }
    mount.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px;">${bookings.map(bookingCardHTML).join('')}</div>`;
    mount.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => showTicket(btn.dataset.view, bookings)));
    mount.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', () => cancelBooking(btn.dataset.cancel)));

    const highlightId = new URLSearchParams(window.location.search).get('booking');
    if (highlightId) showTicket(highlightId, bookings);
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
  }
}

function showTicket(bookingId, bookings) {
  const b = bookings.find(x => x._id === bookingId);
  if (!b) return;
  const ev = b.event;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:560px;">
      <button class="modal-close" id="close-ticket">&times;</button>
      <h3>Your Ticket</h3>
      <div class="ticket" id="ticket-print-area">
        <div>
          <span class="eyebrow" style="color:var(--gold);">Admit ${b.quantity}</span>
          <h3 style="color:var(--paper);margin:4px 0;">${ev ? ev.title : 'Event'}</h3>
          <p style="color:rgba(250,246,239,.7);margin:0 0 10px;">${ev ? new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + ev.time : ''}</p>
          <p style="color:rgba(250,246,239,.7);margin:0 0 10px;">${ev ? ev.venue + ', ' + ev.city : ''}</p>
          <p class="ticket-code">${b.bookingCode}</p>
          <p style="color:rgba(250,246,239,.6);font-size:.8rem;">${b.ticketTypeName} · Attendee: ${b.attendeeName}</p>
        </div>
        ${b.qrCode ? `<div class="qr-box"><img src="${b.qrCode}" alt="QR ticket code" /></div>` : ''}
      </div>
      <div class="flex gap-12" style="margin-top:18px;">
        <button class="btn btn-primary" id="download-ticket-btn">Download Ticket</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('close-ticket').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.getElementById('download-ticket-btn').addEventListener('click', () => downloadTicket(b, ev));
}

function downloadTicket(b, ev) {
  // Generates a simple printable HTML ticket as a downloadable file (no extra libs needed)
  const html = `
    <html><head><title>Ticket - ${b.bookingCode}</title>
    <style>body{font-family:sans-serif;background:#14121F;color:#FAF6EF;padding:40px;} .code{color:#FFC53D;font-size:1.2rem;letter-spacing:2px;} img{margin-top:20px;border-radius:8px;}</style>
    </head><body>
    <h1>${ev ? ev.title : 'Event'}</h1>
    <p>${ev ? new Date(ev.date).toDateString() + ' · ' + ev.time : ''}</p>
    <p>${ev ? ev.venue + ', ' + ev.city : ''}</p>
    <p class="code">${b.bookingCode}</p>
    <p>${b.ticketTypeName} × ${b.quantity} — Attendee: ${b.attendeeName}</p>
    ${b.qrCode ? `<img src="${b.qrCode}" width="180" />` : ''}
    </body></html>
  `;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket-${b.bookingCode}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Ticket downloaded', 'success');
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking? This cannot be undone.')) return;
  try {
    await api.put(`/bookings/${id}/cancel`);
    showToast('Booking cancelled', 'success');
    loadBookings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadFavorites() {
  const mount = document.getElementById('tab-favorites');
  mount.innerHTML = '<div class="loader">Loading favorites…</div>';
  try {
    const { favorites } = await api.get('/users/favorites');
    if (favorites.length === 0) {
      mount.innerHTML = `<div class="empty-state"><div class="icon">🤍</div><h3>No favorites yet</h3><p>Tap the heart icon on any event to save it here.</p></div>`;
      return;
    }
    mount.innerHTML = `<div class="event-grid">${favorites.map(eventCardHTMLSafe).join('')}</div>`;
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
  }
}

function eventCardHTMLSafe(ev) {
  const dateStr = new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `
    <a href="event-details?id=${ev.slug || ev._id}" class="event-card" style="text-decoration:none;">
      <div class="thumb">${ev.image ? `<img src="${imageUrl(ev.image)}" />` : `<span>${(ev.category && ev.category.icon) || '🎫'}</span>`}<span class="cat-chip">${(ev.category && ev.category.name) || 'Event'}</span></div>
      <div class="body">
        <span class="date-line">${dateStr}</span>
        <h3>${ev.title}</h3>
        <div class="meta">📍 ${ev.venue}, ${ev.city}</div>
        <div class="price-row"><span class="price">${ev.price === 0 ? 'Free' : '₹' + ev.price}</span></div>
      </div>
    </a>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  user = requireAuth();
  if (!user) return;
  renderProfileTab();
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  const initialTab = new URLSearchParams(window.location.search).get('tab') || 'profile';
  switchTab(initialTab);
});
