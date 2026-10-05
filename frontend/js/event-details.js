const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');
let currentEvent = null;

function starRow(rating) {
  return Array.from({ length: 5 }, (_, i) => `<span class="star">${i < Math.round(rating) ? '★' : '☆'}</span>`).join('');
}

async function loadEvent() {
  const mount = document.getElementById('event-content');
  if (!eventId) {
    mount.innerHTML = `<div class="empty-state"><div class="icon">❓</div><h3>Event not found</h3></div>`;
    return;
  }
  try {
    const { event, reviews } = await api.get(`/events/${eventId}`, { auth: false });
    currentEvent = event;
    renderEvent(event, reviews);
  } catch (err) {
    mount.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Could not load event</h3><p>${err.message}</p></div>`;
  }
}

function renderEvent(ev, reviews) {
  const mount = document.getElementById('event-content');
  const user = getUser();
  const isFav = user && user.favorites && user.favorites.includes(ev._id);
  const dateStr = new Date(ev.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const spotsLeft = ev.capacity - ev.registeredCount;

  const ticketOptions = (ev.ticketTypes && ev.ticketTypes.length > 0)
    ? ev.ticketTypes.map(t => `
        <option value="${t._id}" data-price="${t.price}" ${t.sold >= t.quantity ? 'disabled' : ''}>
          ${t.name} — ${t.price === 0 ? 'Free' : '₹' + t.price} ${t.sold >= t.quantity ? '(Sold out)' : `(${t.quantity - t.sold} left)`}
        </option>
      `).join('')
    : `<option value="" data-price="${ev.price}">General Admission — ${ev.price === 0 ? 'Free' : '₹' + ev.price}</option>`;

  mount.innerHTML = `
    <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:40px;align-items:start;">
      <div>
        <div class="thumb" style="height:320px;border-radius:20px;margin-bottom:24px;">
          ${ev.image ? `<img src="${imageUrl(ev.image)}" alt="${ev.title}" style="width:100%;height:100%;object-fit:cover;border-radius:20px;" />` : `<span style="font-size:4rem;">${(ev.category && ev.category.icon) || '🎫'}</span>`}
        </div>
        <span class="eyebrow">${(ev.category && ev.category.name) || 'Event'} · ${ev.city}</span>
        <h1 style="margin-top:8px;">${ev.title}</h1>
        <div class="flex gap-16" style="flex-wrap:wrap;margin-bottom:20px;">
          <span class="meta">📅 ${dateStr} · ${ev.time}</span>
          <span class="meta">📍 ${ev.venue}, ${ev.city}</span>
          ${ev.ratingCount > 0 ? `<span class="meta">${starRow(ev.ratingAvg)} (${ev.ratingCount} reviews)</span>` : ''}
        </div>
        <h3>About this event</h3>
        <p style="white-space:pre-line;">${ev.description}</p>
        <h3 style="margin-top:8px;">Organized by</h3>
        <p>${ev.organizer?.name || 'Eventify Organizer'}</p>

        <h3 style="margin-top:32px;">Reviews</h3>
        <div id="reviews-list" style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
          ${reviews.length === 0 ? '<p class="muted">No reviews yet. Be the first to review after attending!</p>' : reviews.map(r => `
            <div class="card" style="padding:16px;">
              <div class="flex-between">
                <strong>${r.user?.name || 'Anonymous'}</strong>
                <span>${starRow(r.rating)}</span>
              </div>
              ${r.comment ? `<p style="margin:8px 0 0;">${r.comment}</p>` : ''}
              <span class="muted" style="font-size:.75rem;">${new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
          `).join('')}
        </div>
        <div id="review-form-mount"></div>
      </div>

      <aside class="card" style="position:sticky;top:92px;">
        <div class="flex-between" style="margin-bottom:14px;">
          <span class="price" style="font-size:1.6rem;font-family:var(--font-display);font-weight:700;">${ev.price === 0 ? 'Free' : '₹' + ev.price + '+'}</span>
          <button class="fav-btn ${isFav ? 'active' : ''}" id="fav-toggle" style="position:static;">${isFav ? '❤️' : '🤍'}</button>
        </div>
        <p class="muted" style="margin-bottom:16px;">${spotsLeft > 0 ? `${spotsLeft} of ${ev.capacity} spots left` : 'Sold out'}</p>

        <div class="form-group">
          <label for="ticket-type">Ticket type</label>
          <select id="ticket-type">${ticketOptions}</select>
        </div>
        <div class="form-group">
          <label for="quantity">Quantity</label>
          <input type="number" id="quantity" value="1" min="1" max="10" />
        </div>
        <div class="flex-between" style="margin-bottom:16px;">
          <span class="muted">Total</span>
          <strong id="total-amount">₹${ev.price}</strong>
        </div>
        <button class="btn btn-primary btn-block" id="book-btn" ${spotsLeft <= 0 || ev.status !== 'approved' ? 'disabled' : ''}>
          ${spotsLeft <= 0 ? 'Sold Out' : 'Register / Book Ticket'}
        </button>
        <p class="form-hint center-text" style="margin-top:10px;">Payment is simulated for this demo — no real transaction occurs.</p>
      </aside>
    </div>
  `;

  const ticketSelect = document.getElementById('ticket-type');
  const qtyInput = document.getElementById('quantity');
  const updateTotal = () => {
    const price = Number(ticketSelect.selectedOptions[0]?.dataset.price || 0);
    document.getElementById('total-amount').textContent = `₹${price * Number(qtyInput.value || 1)}`;
  };
  ticketSelect.addEventListener('change', updateTotal);
  qtyInput.addEventListener('input', updateTotal);

  document.getElementById('book-btn').addEventListener('click', () => openBookingModal(ev, ticketSelect, qtyInput));

  document.getElementById('fav-toggle').addEventListener('click', async () => {
    if (!isLoggedIn()) { showToast('Log in to save favorites', 'error'); return; }
    try {
      const { favorited } = await api.post(`/users/favorites/${ev._id}`);
      document.getElementById('fav-toggle').textContent = favorited ? '❤️' : '🤍';
      document.getElementById('fav-toggle').classList.toggle('active', favorited);
    } catch (err) { showToast(err.message, 'error'); }
  });

  renderReviewForm(ev);
}

function renderReviewForm(ev) {
  const mount = document.getElementById('review-form-mount');
  if (!isLoggedIn()) {
    mount.innerHTML = `<p class="muted"><a href="login.html" style="color:var(--coral-dark);font-weight:700;">Log in</a> to leave a review after attending.</p>`;
    return;
  }
  mount.innerHTML = `
    <div class="card" style="padding:18px;">
      <h4 style="margin-bottom:10px;">Leave a review</h4>
      <div class="form-group">
        <label for="review-rating">Rating</label>
        <select id="review-rating">
          <option value="5">★★★★★ Excellent</option>
          <option value="4">★★★★☆ Good</option>
          <option value="3">★★★☆☆ Average</option>
          <option value="2">★★☆☆☆ Poor</option>
          <option value="1">★☆☆☆☆ Terrible</option>
        </select>
      </div>
      <div class="form-group">
        <label for="review-comment">Comment (optional)</label>
        <textarea id="review-comment" placeholder="Share your experience..."></textarea>
      </div>
      <button class="btn btn-dark" id="submit-review-btn">Submit review</button>
      <p class="form-hint">You must have a confirmed booking for this event to review it.</p>
    </div>
  `;
  document.getElementById('submit-review-btn').addEventListener('click', async () => {
    try {
      await api.post(`/reviews/${ev._id}`, {
        rating: Number(document.getElementById('review-rating').value),
        comment: document.getElementById('review-comment').value,
      });
      showToast('Review submitted!', 'success');
      loadEvent();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function openBookingModal(ev, ticketSelect, qtyInput) {
  if (!isLoggedIn()) {
    showToast('Please log in to book tickets', 'error');
    setTimeout(() => window.location.href = 'login.html', 900);
    return;
  }
  const user = getUser();
  const price = Number(ticketSelect.selectedOptions[0]?.dataset.price || 0);
  const qty = Number(qtyInput.value || 1);
  const ticketTypeId = ticketSelect.value;
  const ticketTypeName = ticketSelect.selectedOptions[0]?.text.split(' — ')[0] || 'General Admission';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" id="close-modal">&times;</button>
      <h3>Confirm your booking</h3>
      <p class="muted">${ev.title} · ${ticketTypeName} × ${qty}</p>
      <div class="form-group">
        <label for="att-name">Attendee name</label>
        <input type="text" id="att-name" value="${user.name}" />
      </div>
      <div class="form-group">
        <label for="att-email">Attendee email</label>
        <input type="email" id="att-email" value="${user.email}" />
      </div>
      <div class="card" style="background:var(--paper-dim);border:none;padding:16px;margin-bottom:18px;">
        <div class="flex-between"><span class="muted">Simulated payment</span><span class="badge badge-paid">Demo mode</span></div>
        <div class="flex-between" style="margin-top:8px;"><strong>Total</strong><strong>₹${price * qty}</strong></div>
      </div>
      <button class="btn btn-primary btn-block" id="confirm-book-btn">Confirm & "Pay" ₹${price * qty}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('close-modal').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  document.getElementById('confirm-book-btn').addEventListener('click', async () => {
    const btn = document.getElementById('confirm-book-btn');
    btn.disabled = true; btn.textContent = 'Processing payment...';
    try {
      const { booking } = await api.post('/bookings', {
        eventId: ev._id,
        ticketTypeId,
        ticketTypeName,
        quantity: qty,
        attendeeName: document.getElementById('att-name').value,
        attendeeEmail: document.getElementById('att-email').value,
      });
      overlay.remove();
      showToast('Booking confirmed! Check your profile for the ticket.', 'success');
      setTimeout(() => window.location.href = `profile.html?tab=bookings&booking=${booking._id}`, 700);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false; btn.textContent = `Confirm & "Pay" ₹${price * qty}`;
    }
  });
}

document.addEventListener('DOMContentLoaded', loadEvent);
