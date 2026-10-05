function switchAdminView(view) {
  document.querySelectorAll('.dash-sidebar a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('.dash-view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  const loaders = { overview: loadAdminOverview, users: loadUsers, organizers: loadOrganizers, events: loadAdminEvents, categories: loadCategoriesAdmin, reports: loadReports, activity: loadActivity };
  loaders[view]?.();
}

async function loadAdminOverview() {
  const mount = document.getElementById('view-overview');
  mount.innerHTML = '<div class="loader">Loading dashboard…</div>';
  try {
    const data = await api.get('/admin/dashboard');
    mount.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Admin</span><h2>Platform Overview</h2></div></div>
      <div class="stat-grid">
        <div class="stat-card"><span class="eyebrow">Total Users</span><strong>${data.totalUsers}</strong></div>
        <div class="stat-card"><span class="eyebrow">Total Organizers</span><strong>${data.totalOrganizers}</strong></div>
        <div class="stat-card"><span class="eyebrow">Total Events</span><strong>${data.totalEvents}</strong></div>
        <div class="stat-card"><span class="eyebrow">Total Bookings</span><strong>${data.totalBookings}</strong></div>
        <div class="stat-card"><span class="eyebrow">Total Revenue</span><strong>₹${data.totalRevenue}</strong></div>
      </div>
    `;
  } catch (err) { mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`; }
}

async function loadUsers() {
  const mount = document.getElementById('view-users');
  mount.innerHTML = '<div class="loader">Loading users…</div>';
  try {
    const { users } = await api.get('/admin/users?role=user');
    mount.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Manage</span><h2>Users</h2></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.name}</td><td>${u.email}</td>
                <td><span class="badge ${u.isActive ? 'badge-approved' : 'badge-rejected'}">${u.isActive ? 'Active' : 'Deactivated'}</span></td>
                <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                <td class="flex gap-8">
                  <button class="btn btn-outline btn-sm" data-toggle="${u._id}" data-active="${u.isActive}">${u.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button class="btn btn-ghost btn-sm" data-delete-user="${u._id}" style="color:#B3261E;">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    mount.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', async () => {
      try {
        await api.put(`/admin/users/${b.dataset.toggle}/status`, { isActive: b.dataset.active !== 'true' });
        showToast('User status updated', 'success');
        loadUsers();
      } catch (err) { showToast(err.message, 'error'); }
    }));
    mount.querySelectorAll('[data-delete-user]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete this user permanently?')) return;
      try { await api.del(`/admin/users/${b.dataset.deleteUser}`); showToast('User deleted', 'success'); loadUsers(); }
      catch (err) { showToast(err.message, 'error'); }
    }));
  } catch (err) { mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`; }
}

async function loadOrganizers() {
  const mount = document.getElementById('view-organizers');
  mount.innerHTML = '<div class="loader">Loading organizers…</div>';
  try {
    const { users } = await api.get('/admin/users');
    const applicants = users.filter(u => u.organizerStatus && u.organizerStatus !== 'none');
    mount.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Manage</span><h2>Organizers</h2></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${applicants.length === 0 ? '<tr><td colspan="4" class="muted">No organizer applications</td></tr>' : applicants.map(u => `
              <tr>
                <td>${u.name}</td><td>${u.email}</td>
                <td><span class="badge badge-${u.organizerStatus}">${u.organizerStatus}</span></td>
                <td class="flex gap-8">
                  ${u.organizerStatus === 'pending' ? `
                    <button class="btn btn-outline btn-sm" data-approve="${u._id}">Approve</button>
                    <button class="btn btn-ghost btn-sm" data-reject="${u._id}" style="color:#B3261E;">Reject</button>
                  ` : `<span class="muted">Resolved</span>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    mount.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => setOrganizerStatus(b.dataset.approve, 'approved')));
    mount.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => setOrganizerStatus(b.dataset.reject, 'rejected')));
  } catch (err) { mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`; }
}

async function setOrganizerStatus(id, status) {
  try {
    await api.put(`/admin/organizers/${id}/status`, { status });
    showToast(`Organizer ${status}`, 'success');
    loadOrganizers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadAdminEvents() {
  const mount = document.getElementById('view-events');
  mount.innerHTML = '<div class="loader">Loading events…</div>';
  try {
    const { events } = await api.get('/admin/events');
    mount.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Moderate</span><h2>Events</h2></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Organizer</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>
            ${events.map(ev => `
              <tr>
                <td>${ev.title}</td><td>${ev.organizer?.name || '—'}</td>
                <td><span class="badge badge-${ev.status}">${ev.status}</span></td>
                <td>${new Date(ev.date).toLocaleDateString()}</td>
                <td class="flex gap-8">
                  ${ev.status !== 'approved' ? `<button class="btn btn-outline btn-sm" data-approve-ev="${ev._id}">Approve</button>` : ''}
                  ${ev.status !== 'rejected' ? `<button class="btn btn-outline btn-sm" data-reject-ev="${ev._id}">Reject</button>` : ''}
                  <button class="btn btn-ghost btn-sm" data-delete-ev="${ev._id}" style="color:#B3261E;">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    mount.querySelectorAll('[data-approve-ev]').forEach(b => b.addEventListener('click', () => setEventStatus(b.dataset.approveEv, 'approved')));
    mount.querySelectorAll('[data-reject-ev]').forEach(b => b.addEventListener('click', () => setEventStatus(b.dataset.rejectEv, 'rejected')));
    mount.querySelectorAll('[data-delete-ev]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete this event permanently?')) return;
      try { await api.del(`/admin/events/${b.dataset.deleteEv}`); showToast('Event deleted', 'success'); loadAdminEvents(); }
      catch (err) { showToast(err.message, 'error'); }
    }));
  } catch (err) { mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`; }
}

async function setEventStatus(id, status) {
  try {
    await api.put(`/admin/events/${id}/status`, { status });
    showToast(`Event ${status}`, 'success');
    loadAdminEvents();
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadCategoriesAdmin() {
  const mount = document.getElementById('view-categories');
  mount.innerHTML = '<div class="loader">Loading categories…</div>';
  try {
    const { categories } = await api.get('/categories', { auth: false });
    mount.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Manage</span><h2>Categories</h2></div></div>
      <div class="card" style="max-width:420px;margin-bottom:24px;">
        <div class="form-row">
          <div class="form-group"><label>Name</label><input type="text" id="new-cat-name" placeholder="e.g. Comedy" /></div>
          <div class="form-group"><label>Icon (emoji)</label><input type="text" id="new-cat-icon" placeholder="😂" /></div>
        </div>
        <button class="btn btn-primary" id="add-cat-btn">Add category</button>
      </div>
      <div class="flex gap-12" style="flex-wrap:wrap;">
        ${categories.map(c => `
          <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:10px;">
            <span>${c.icon} ${c.name}</span>
            <button class="btn btn-ghost btn-sm" data-del-cat="${c._id}" style="color:#B3261E;">✕</button>
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('add-cat-btn').addEventListener('click', async () => {
      try {
        await api.post('/admin/categories', {
          name: document.getElementById('new-cat-name').value,
          icon: document.getElementById('new-cat-icon').value || '🎫',
        });
        showToast('Category added', 'success');
        loadCategoriesAdmin();
      } catch (err) { showToast(err.message, 'error'); }
    });
    mount.querySelectorAll('[data-del-cat]').forEach(b => b.addEventListener('click', async () => {
      try { await api.del(`/admin/categories/${b.dataset.delCat}`); showToast('Category removed', 'success'); loadCategoriesAdmin(); }
      catch (err) { showToast(err.message, 'error'); }
    }));
  } catch (err) { mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`; }
}

async function loadReports() {
  const mount = document.getElementById('view-reports');
  mount.innerHTML = '<div class="loader">Loading reports…</div>';
  try {
    const data = await api.get('/admin/reports');
    mount.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Insights</span><h2>Reports</h2></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="card">
          <h4>Revenue by category</h4>
          <ul>${Object.entries(data.byCategory).map(([k, v]) => `<li>${k}: ₹${v}</li>`).join('') || '<li class="muted">No data yet</li>'}</ul>
        </div>
        <div class="card">
          <h4>Revenue by month</h4>
          <ul>${Object.entries(data.byMonth).map(([k, v]) => `<li>${k}: ₹${v}</li>`).join('') || '<li class="muted">No data yet</li>'}</ul>
        </div>
      </div>
      <h3 style="margin-top:24px;">Top events by registrations</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>City</th><th>Price</th><th>Registrations</th></tr></thead>
          <tbody>${data.topEvents.map(e => `<tr><td>${e.title}</td><td>${e.city}</td><td>₹${e.price}</td><td>${e.registeredCount}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    `;
  } catch (err) { mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`; }
}

async function loadActivity() {
  const mount = document.getElementById('view-activity');
  mount.innerHTML = '<div class="loader">Loading activity…</div>';
  try {
    const data = await api.get('/admin/activity');
    mount.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Live feed</span><h2>System Activity</h2></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;">
        <div class="card"><h4>New signups</h4>${data.recentUsers.map(u => `<p class="muted">${u.name} (${u.role}) — ${new Date(u.createdAt).toLocaleDateString()}</p>`).join('') || '<p class="muted">None</p>'}</div>
        <div class="card"><h4>New events</h4>${data.recentEvents.map(e => `<p class="muted">${e.title} by ${e.organizer?.name || '—'} — ${e.status}</p>`).join('') || '<p class="muted">None</p>'}</div>
        <div class="card"><h4>Recent bookings</h4>${data.recentBookings.map(b => `<p class="muted">${b.user?.name || '—'} booked ${b.event?.title || '—'}</p>`).join('') || '<p class="muted">None</p>'}</div>
      </div>
    `;
  } catch (err) { mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`; }
}

document.addEventListener('DOMContentLoaded', () => {
  const admin = requireAuth(['admin']);
  if (!admin) return;
  document.querySelectorAll('.dash-sidebar a').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); switchAdminView(a.dataset.view); });
  });
  switchAdminView('overview');
});
