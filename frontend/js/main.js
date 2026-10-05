// Homepage logic: category chips, filters, event grid, favoriting

let currentPage = 1;
let currentFilters = {};
let allCategories = [];

const CATEGORY_EMOJI_FALLBACK = '🎫';

function eventCardHTML(ev) {
  const dateStr = new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const isFree = !ev.price || ev.price === 0;
  const user = getUser();
  const isFav = user && user.favorites && user.favorites.includes(ev._id);
  return `
    <div class="event-card">
      <a href="event-details?id=${ev.slug || ev._id}">
        <div class="thumb">
          ${ev.image ? `<img src="${imageUrl(ev.image)}" alt="${ev.title}" />` : `<span>${(ev.category && ev.category.icon) || CATEGORY_EMOJI_FALLBACK}</span>`}
          <span class="cat-chip">${(ev.category && ev.category.name) || 'Event'}</span>
        </div>
      </a>
      <button class="fav-btn" data-id="${ev._id}" title="Save to favorites">🤍</button>
      <div class="body">
        <span class="date-line">${dateStr} · ${ev.time}</span>
        <a href="event-details?id=${ev.slug || ev._id}"><h3>${ev.title}</h3></a>
        <div class="meta">📍 ${ev.venue}, ${ev.city}</div>
        ${ev.ratingCount > 0 ? `<div class="meta"><span class="star">★</span> ${ev.ratingAvg} (${ev.ratingCount})</div>` : ''}
        <div class="stub-notch"></div>
        <div class="price-row">
          <span class="price ${isFree ? 'free' : ''}">${isFree ? 'Free' : '₹' + ev.price}</span>
          <a href="event-details?id=${ev.slug || ev._id}" class="btn btn-primary btn-sm">View</a>
        </div>
      </div>
    </div>
  `;
}

async function loadCategories() {
  try {
    const { categories } = await api.get('/categories', { auth: false });
    allCategories = categories;
    const select = document.getElementById('f-category');
    categories.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c._id;
      opt.textContent = `${c.icon} ${c.name}`;
      select.appendChild(opt);
    });
    const chips = document.getElementById('category-chips');
    if (chips) {
      chips.innerHTML = categories.map(c => `
        <button class="btn btn-outline btn-sm cat-chip-btn" data-id="${c._id}">${c.icon} ${c.name}</button>
      `).join('');
      chips.querySelectorAll('.cat-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('f-category').value = btn.dataset.id;
          currentFilters.category = btn.dataset.id;
          currentPage = 1;
          fetchEvents(true);
          document.getElementById('browse').scrollIntoView({ behavior: 'smooth' });
        });
      });
    }
  } catch (e) { console.error(e); }
}

async function fetchEvents(reset = false) {
  const grid = document.getElementById('event-grid');
  if (reset) {
    grid.innerHTML = '<div class="loader">Loading events…</div>';
    currentPage = 1;
  }
  const params = new URLSearchParams({ page: currentPage, limit: 8, ...currentFilters });
  try {
    const { events, total, pages } = await api.get(`/events?${params.toString()}`, { auth: false });
    document.getElementById('results-count').textContent = `${total} event${total !== 1 ? 's' : ''} found`;

    if (reset) grid.innerHTML = '';
    if (events.length === 0 && currentPage === 1) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🔍</div><h3>No events found</h3><p>Try adjusting your search or filters.</p></div>`;
    } else {
      grid.insertAdjacentHTML('beforeend', events.map(eventCardHTML).join(''));
    }
    attachFavHandlers();

    document.getElementById('stat-events').textContent = total;
    const cities = new Set(events.map(e => e.city));
    document.getElementById('stat-cities').textContent = cities.size || '—';

    const loadMoreBtn = document.getElementById('load-more-btn');
    loadMoreBtn.classList.toggle('hidden', currentPage >= pages);
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">⚠️ ${e.message}</div>`;
  }
}

function attachFavHandlers() {
  document.querySelectorAll('.fav-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!isLoggedIn()) {
        showToast('Please log in to save favorites', 'error');
        return;
      }
      try {
        const { favorited } = await api.post(`/users/favorites/${btn.dataset.id}`);
        btn.textContent = favorited ? '❤️' : '🤍';
        btn.classList.toggle('active', favorited);
        showToast(favorited ? 'Added to favorites' : 'Removed from favorites', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  fetchEvents(true);

  document.getElementById('search-btn').addEventListener('click', () => {
    currentFilters.search = document.getElementById('search-input').value.trim();
    fetchEvents(true);
  });
  document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('search-btn').click();
  });

  document.getElementById('apply-filters').addEventListener('click', () => {
    currentFilters = {
      ...(document.getElementById('search-input').value.trim() && { search: document.getElementById('search-input').value.trim() }),
      ...(document.getElementById('f-category').value && { category: document.getElementById('f-category').value }),
      ...(document.getElementById('f-city').value.trim() && { city: document.getElementById('f-city').value.trim() }),
      ...(document.getElementById('f-date').value && { dateFrom: document.getElementById('f-date').value }),
      ...(document.getElementById('f-price').value && { maxPrice: document.getElementById('f-price').value }),
      ...(document.getElementById('f-sort').value && { sort: document.getElementById('f-sort').value }),
    };
    fetchEvents(true);
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    document.querySelectorAll('#filter-panel input, #filter-panel select').forEach(el => el.value = '');
    document.getElementById('search-input').value = '';
    currentFilters = {};
    fetchEvents(true);
  });

  document.getElementById('load-more-btn').addEventListener('click', () => {
    currentPage += 1;
    fetchEvents(false);
  });
});
