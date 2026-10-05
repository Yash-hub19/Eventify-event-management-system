let orgUser = null;
let myEvents = [];
let myCategories = [];

function switchView(view) {
  document.querySelectorAll('.dash-sidebar a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('.dash-view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  if (view === 'overview') loadOverview();
  if (view === 'events') loadEvents();
  if (view === 'create') renderEventForm();
}

async function loadOverview() {
  const mount = document.getElementById('view-overview');
  mount.innerHTML = '<div class="loader">Loading dashboard…</div>';
  try {
    const data = await api.get('/organizer/dashboard');
    mount.innerHTML = `
      <div class="section-head">
        <div><span class="eyebrow">Organizer</span><h2>Dashboard</h2></div>
        <button class="btn btn-primary" onclick="switchView('create')">+ Create Event</button>
      </div>
      <div class="stat-grid" style="margin-bottom:28px;">
        <div class="stat-card"><span class="eyebrow">Total Events</span><strong>${data.totalEvents}</strong></div>
        <div class="stat-card"><span class="eyebrow">Total Registrations</span><strong>${data.totalRegistrations}</strong></div>
        <div class="stat-card"><span class="eyebrow">Revenue</span><strong>₹${data.revenue}</strong></div>
        <div class="stat-card"><span class="eyebrow">Upcoming Events</span><strong>${data.upcomingEvents}</strong></div>
      </div>
      <h3>Recent Bookings</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Attendee</th><th>Qty</th><th>Amount</th><th>Code</th><th>Date</th></tr></thead>
          <tbody>
            ${data.recentBookings.length === 0 ? '<tr><td colspan="6" class="muted">No bookings yet</td></tr>' : data.recentBookings.map(b => `
              <tr><td>${b.eventTitle || '—'}</td><td>${b.attendee}</td><td>${b.quantity}</td><td>₹${b.amount}</td><td style="font-family:var(--font-mono);">${b.code}</td><td>${new Date(b.date).toLocaleDateString()}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
  }
}

async function loadEvents() {
  const mount = document.getElementById('view-events');
  mount.innerHTML = '<div class="loader">Loading your events…</div>';
  try {
    const { events } = await api.get('/organizer/events');
    myEvents = events;
    if (events.length === 0) {
      mount.innerHTML = `<div class="empty-state"><div class="icon">🎟️</div><h3>No events yet</h3><p>Create your first event to get started.</p><button class="btn btn-primary" style="margin-top:12px;" onclick="switchView('create')">+ Create Event</button></div>`;
      return;
    }
    mount.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Manage</span><h2>My Events</h2></div></div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${events.map(ev => `
          <div class="card" style="display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center;">
            <div style="width:56px;height:56px;border-radius:10px;background:var(--plum);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">${(ev.category && ev.category.icon) || '🎫'}</div>
            <div>
              <div class="flex gap-8" style="align-items:center;">
                <strong>${ev.title}</strong>
                <span class="badge badge-${ev.status}">${ev.status}</span>
              </div>
              <p class="muted" style="margin:4px 0 0;">${new Date(ev.date).toLocaleDateString()} · ${ev.city} · ${ev.registeredCount}/${ev.capacity} booked</p>
            </div>
            <div class="flex gap-8" style="flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" data-edit="${ev._id}">Edit</button>
              <button class="btn btn-outline btn-sm" data-bookings="${ev._id}">Registrations</button>
              <button class="btn btn-outline btn-sm" data-analytics="${ev._id}">Analytics</button>
              <button class="btn btn-outline btn-sm" data-notify="${ev._id}">Notify</button>
              ${ev.status !== 'cancelled' ? `<button class="btn btn-ghost btn-sm" data-delete="${ev._id}" style="color:#B3261E;">Cancel</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    mount.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => { switchView('create'); renderEventForm(b.dataset.edit); }));
    mount.querySelectorAll('[data-bookings]').forEach(b => b.addEventListener('click', () => showEventBookings(b.dataset.bookings)));
    mount.querySelectorAll('[data-analytics]').forEach(b => b.addEventListener('click', () => showEventAnalytics(b.dataset.analytics)));
    mount.querySelectorAll('[data-notify]').forEach(b => b.addEventListener('click', () => showNotifyModal(b.dataset.notify)));
    mount.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => cancelEvent(b.dataset.delete)));
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
  }
}

async function cancelEvent(id) {
  if (!confirm('Cancel this event? Attendees will be notified.')) return;
  try {
    await api.del(`/organizer/events/${id}`);
    showToast('Event cancelled', 'success');
    loadEvents();
  } catch (err) { showToast(err.message, 'error'); }
}

async function showEventBookings(id) {
  try {
    const { bookings } = await api.get(`/organizer/events/${id}/bookings`);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:700px;">
        <button class="modal-close" id="close-modal">&times;</button>
        <h3>Registrations</h3>
        <div class="table-wrap" style="margin-top:14px;">
          <table>
            <thead><tr><th>Attendee</th><th>Email</th><th>Ticket</th><th>Qty</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              ${bookings.length === 0 ? '<tr><td colspan="6" class="muted">No registrations yet</td></tr>' : bookings.map(b => `
                <tr><td>${b.attendeeName}</td><td>${b.attendeeEmail}</td><td>${b.ticketTypeName}</td><td>${b.quantity}</td><td>₹${b.totalAmount}</td><td><span class="badge badge-${b.status}">${b.status}</span></td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('close-modal').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  } catch (err) { showToast(err.message, 'error'); }
}

async function showEventAnalytics(id) {
  try {
    const data = await api.get(`/organizer/events/${id}/analytics`);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" id="close-modal">&times;</button>
        <h3>Event Analytics</h3>
        <div class="stat-grid" style="margin-top:14px;">
          <div class="stat-card"><span class="eyebrow">Revenue</span><strong>₹${data.totalRevenue}</strong></div>
          <div class="stat-card"><span class="eyebrow">Tickets Sold</span><strong>${data.totalTicketsSold}</strong></div>
          <div class="stat-card"><span class="eyebrow">Capacity Filled</span><strong>${data.percentFilled}%</strong></div>
          <div class="stat-card"><span class="eyebrow">Rating</span><strong>${data.ratingAvg || '—'} (${data.ratingCount})</strong></div>
        </div>
        <h4 style="margin-top:20px;">By ticket type</h4>
        <ul>${Object.entries(data.byTicketType).map(([k, v]) => `<li>${k}: ${v} sold</li>`).join('') || '<li class="muted">No sales yet</li>'}</ul>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('close-modal').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  } catch (err) { showToast(err.message, 'error'); }
}

function showNotifyModal(id) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" id="close-modal">&times;</button>
      <h3>Notify attendees</h3>
      <div class="form-group"><label>Title</label><input type="text" id="notif-title" placeholder="Important update" /></div>
      <div class="form-group"><label>Message</label><textarea id="notif-message" placeholder="Let attendees know what's changed..."></textarea></div>
      <button class="btn btn-primary" id="send-notif-btn">Send notification</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('close-modal').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.getElementById('send-notif-btn').addEventListener('click', async () => {
    try {
      const data = await api.post(`/organizer/events/${id}/notify`, {
        title: document.getElementById('notif-title').value,
        message: document.getElementById('notif-message').value,
      });
      showToast(data.message, 'success');
      overlay.remove();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// ---------------- Create / Edit Event Form ----------------

let ticketTypeRows = [];

async function renderEventForm(editId = null) {
  const mount = document.getElementById('view-create');
  mount.innerHTML = '<div class="loader">Loading form…</div>';

  if (myCategories.length === 0) {
    const { categories } = await api.get('/categories', { auth: false });
    myCategories = categories;
  }

  let ev = null;
  if (editId) {
    ev = myEvents.find(e => e._id === editId);
  }
  ticketTypeRows = ev && ev.ticketTypes && ev.ticketTypes.length > 0
    ? ev.ticketTypes.map(t => ({ name: t.name, price: t.price, quantity: t.quantity }))
    : [{ name: 'General', price: ev ? ev.price : 0, quantity: ev ? ev.capacity : 100 }];

  const dateVal = ev ? new Date(ev.date).toISOString().slice(0, 10) : '';

  mount.innerHTML = `
    <div class="section-head"><div><span class="eyebrow">${editId ? 'Edit' : 'New'}</span><h2>${editId ? 'Edit Event' : 'Create Event'}</h2></div></div>
    <div class="card" style="max-width:720px;">
      <div id="event-form-msg"></div>
      <div class="form-group"><label>Event title</label><input type="text" id="ev-title" value="${ev ? ev.title : ''}" placeholder="e.g. Sunset Jazz Night" /></div>
      <div class="form-group"><label>Description</label><textarea id="ev-desc" placeholder="What's this event about?">${ev ? ev.description : ''}</textarea></div>

      <div class="form-row">
        <div class="form-group"><label>Category</label>
          <select id="ev-category">${myCategories.map(c => `<option value="${c._id}" ${ev && ev.category && ev.category._id === c._id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>City</label><input type="text" id="ev-city" value="${ev ? ev.city : ''}" placeholder="e.g. Pune" /></div>
      </div>

      <div class="form-group"><label>Venue</label><input type="text" id="ev-venue" value="${ev ? ev.venue : ''}" placeholder="e.g. Grand Convention Center" /></div>

      <div class="form-row">
        <div class="form-group"><label>Date</label><input type="date" id="ev-date" value="${dateVal}" /></div>
        <div class="form-group"><label>Time</label><input type="text" id="ev-time" value="${ev ? ev.time : ''}" placeholder="e.g. 06:00 PM" /></div>
      </div>

      <div class="form-group"><label>Max capacity</label><input type="number" id="ev-capacity" value="${ev ? ev.capacity : 100}" min="1" /></div>

      <div class="form-group">
        <label>Event image</label>
        <input type="file" id="ev-image" accept="image/*" />
        ${ev && ev.image ? `<div style="margin-top:8px;"><img src="${imageUrl(ev.image)}" style="width:120px;border-radius:10px;" /></div>` : `<p class="form-hint">Upload a banner image, or leave blank to show a category icon placeholder.</p>`}
      </div>

      <div class="form-group">
        <label>Ticket types</label>
        <div id="ticket-rows"></div>
        <button type="button" class="btn btn-outline btn-sm" id="add-ticket-row" style="margin-top:8px;">+ Add ticket type</button>
      </div>

      <div class="form-group"><label>Tags (comma separated)</label><input type="text" id="ev-tags" value="${ev && ev.tags ? ev.tags.join(', ') : ''}" placeholder="music, live, outdoor" /></div>

      <button class="btn btn-primary" id="save-event-btn">${editId ? 'Save changes' : 'Create event'}</button>
    </div>
  `;

  renderTicketRows();
  document.getElementById('add-ticket-row').addEventListener('click', () => {
    ticketTypeRows.push({ name: '', price: 0, quantity: 50 });
    renderTicketRows();
  });

  document.getElementById('save-event-btn').addEventListener('click', () => saveEvent(editId));
}

function renderTicketRows() {
  const mount = document.getElementById('ticket-rows');
  mount.innerHTML = ticketTypeRows.map((t, i) => `
    <div class="flex gap-8" style="margin-bottom:8px;">
      <input type="text" placeholder="Name (e.g. VIP)" value="${t.name}" data-tt-field="name" data-tt-idx="${i}" style="flex:2;padding:9px 12px;border-radius:10px;border:1.5px solid var(--line);" />
      <input type="number" placeholder="Price ₹" value="${t.price}" data-tt-field="price" data-tt-idx="${i}" style="flex:1;padding:9px 12px;border-radius:10px;border:1.5px solid var(--line);" />
      <input type="number" placeholder="Quantity" value="${t.quantity}" data-tt-field="quantity" data-tt-idx="${i}" style="flex:1;padding:9px 12px;border-radius:10px;border:1.5px solid var(--line);" />
      ${ticketTypeRows.length > 1 ? `<button type="button" class="btn btn-ghost btn-sm" data-remove-tt="${i}">✕</button>` : ''}
    </div>
  `).join('');
  mount.querySelectorAll('[data-tt-field]').forEach(input => {
    input.addEventListener('input', () => {
      const idx = Number(input.dataset.ttIdx);
      const field = input.dataset.ttField;
      ticketTypeRows[idx][field] = field === 'name' ? input.value : Number(input.value);
    });
  });
  mount.querySelectorAll('[data-remove-tt]').forEach(btn => {
    btn.addEventListener('click', () => {
      ticketTypeRows.splice(Number(btn.dataset.removeTt), 1);
      renderTicketRows();
    });
  });
}

async function saveEvent(editId) {
  const msg = document.getElementById('event-form-msg');
  msg.innerHTML = '';
  const btn = document.getElementById('save-event-btn');
  btn.disabled = true; btn.textContent = 'Saving...';

  const formData = new FormData();
  formData.append('title', document.getElementById('ev-title').value);
  formData.append('description', document.getElementById('ev-desc').value);
  formData.append('category', document.getElementById('ev-category').value);
  formData.append('city', document.getElementById('ev-city').value);
  formData.append('venue', document.getElementById('ev-venue').value);
  formData.append('date', document.getElementById('ev-date').value);
  formData.append('time', document.getElementById('ev-time').value);
  formData.append('capacity', document.getElementById('ev-capacity').value);
  formData.append('price', ticketTypeRows[0]?.price || 0);
  formData.append('ticketTypes', JSON.stringify(ticketTypeRows.filter(t => t.name)));
  formData.append('tags', document.getElementById('ev-tags').value);
  const imageFile = document.getElementById('ev-image').files[0];
  if (imageFile) formData.append('image', imageFile);

  try {
    if (editId) {
      await api.put(`/organizer/events/${editId}`, formData, { isForm: true });
      showToast('Event updated', 'success');
    } else {
      await api.post('/organizer/events', formData, { isForm: true });
      showToast('Event created! It now appears alongside other events.', 'success');
    }
    switchView('events');
  } catch (err) {
    msg.innerHTML = `<div class="form-error">${err.message}</div>`;
    btn.disabled = false; btn.textContent = editId ? 'Save changes' : 'Create event';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  orgUser = requireAuth(['organizer', 'admin']);
  if (!orgUser) return;

  if (orgUser.role === 'organizer' && orgUser.organizerStatus === 'pending') {
    document.getElementById('pending-banner').innerHTML = `<div class="form-error" style="margin-bottom:20px;">Your organizer application is pending admin approval. You can preview the dashboard, but new events may be held for review.</div>`;
  }

  document.querySelectorAll('.dash-sidebar a').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); switchView(a.dataset.view); });
  });
  switchView('overview');
});
