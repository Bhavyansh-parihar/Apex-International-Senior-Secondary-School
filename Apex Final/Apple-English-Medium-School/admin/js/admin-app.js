/* ============================================
   ADMIN PORTAL - MAIN APPLICATION LOGIC
   ============================================ */

const AdminApp = {
    currentSection: 'dashboard',
    currentModal: null,
    editingItem: null,
    _principalDataUrl: null,
    _logoDataUrl: null,
    _heroDataUrls: [null, null, null, null, null],
    _aboutDataUrl: null,
    _staffPhotoDataUrl: null,

    // ---- Initialize ----
    init() {
        this.bindNavigation();
        this.bindMenuToggle();
        this.enforcePermissions();
        this.navigate('dashboard');
        this.updateUserInfo();
        this.updateNotificationCount();
    },

    // ---- Navigation ----
    bindNavigation() {
        document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.navigate(section);
                // Close mobile sidebar
                document.querySelector('.sidebar')?.classList.remove('open');
                document.querySelector('.sidebar-overlay')?.classList.remove('active');
            });
        });
    },

    navigate(section) {
        // Check permissions before navigating
        if (!this._hasPermission(section)) {
            this._showPermissionDenied(section);
            return;
        }

        this.currentSection = section;

        // Update active link
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`.sidebar-link[data-section="${section}"]`)?.classList.add('active');

        // Show section
        document.querySelectorAll('.section-page').forEach(s => s.classList.remove('active'));
        const sectionEl = document.getElementById(`section-${section}`);
        if (sectionEl) {
            sectionEl.classList.add('active');
        }

        // Update page title
        const titles = {
            dashboard: { h1: 'Dashboard', p: 'Welcome back! Here\'s your school overview.' },
            events: { h1: 'Events & Holidays', p: 'Manage school events, holidays, and examinations.' },
            news: { h1: 'News & Announcements', p: 'Create and manage school news and notices.' },
            gallery: { h1: 'Gallery Management', p: 'Upload and organize school photos and albums.' },
            staff: { h1: 'Staff Directory', p: 'Manage faculty and staff information.' },
            content: { h1: 'Content Management', p: 'Update website content and pages.' },
            inquiries: { h1: 'Admission Inquiries', p: 'View and manage admission inquiries.' },
            logs: { h1: 'Activity Logs', p: 'Track all portal activities and changes.' },
            users: { h1: 'User Management', p: 'Create, edit, and manage portal users and their permissions.' },
            accesslogs: { h1: 'Access Logs', p: 'Security audit trail â€” every login attempt with IP, location, and photo.' },
            settings: { h1: 'Settings', p: 'Configure portal preferences and account.' }
        };

        const title = titles[section] || { h1: section, p: '' };
        document.getElementById('pageTitle').textContent = title.h1;
        document.getElementById('pageSubtitle').textContent = title.p;

        // Load section data
        this.loadSection(section);
    },

    loadSection(section) {
        switch (section) {
            case 'dashboard': this.loadDashboard(); break;
            case 'events': this.loadEvents(); break;
            case 'news': this.loadNews(); break;
            case 'gallery': this.loadGallery(); break;
            case 'staff': this.loadStaff(); break;
            case 'content': this.loadContent(); break;
            case 'inquiries': this.loadInquiries(); break;
            case 'logs': this.loadLogs(); break;
            case 'accesslogs': this.loadAccessLogs(); break;
            case 'users': this.loadUsersSection(); break;
            case 'settings': this.loadSettings(); break;
        }
    },

    /** Check if current user has permission for a section */
    _hasPermission(section) {
        const user = AdminDB.getCurrentUser();
        if (!user) return true;
        if (user.role === 'Super Admin') return true;
        const perms = user.permissions || [];
        if (perms.length === 0) return true;
        return perms.includes(section);
    },

    /** Show permission denied overlay instead of section content */
    _showPermissionDenied(section) {
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.section-page').forEach(s => s.classList.remove('active'));
        const sectionEl = document.getElementById(`section-${section}`);
        if (sectionEl) {
            sectionEl.classList.add('active');
            sectionEl.innerHTML = `
                <div class="permission-denied-overlay">
                    <div class="permission-denied-card">
                        <div class="denied-icon">&#128683;</div>
                        <h3>Access Denied</h3>
                        <p>You do not have permission to access the <strong>${section}</strong> section. Please contact your administrator to request access.</p>
                        <button class="btn btn-primary" onclick="AdminApp.navigate('dashboard')">&#8592; Back to Dashboard</button>
                    </div>
                </div>
            `;
        }
        const titles = {
            dashboard: 'Dashboard', events: 'Events & Holidays', news: 'News & Announcements',
            gallery: 'Gallery Management', staff: 'Staff Directory', content: 'Content Management',
            inquiries: 'Admission Inquiries', logs: 'Activity Logs', users: 'User Management',
            accesslogs: 'Access Logs', settings: 'Settings'
        };
        document.getElementById('pageTitle').textContent = titles[section] || section;
        document.getElementById('pageSubtitle').textContent = 'You do not have access to this section.';
        this.showToast('You do not have permission to access this section.', 'error');
    },

    // ---- Mobile Menu ----
    bindMenuToggle() {
        const menuBtn = document.getElementById('menuBtn');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }
    },



    // ---- User Info ----
    updateUserInfo() {
        const user = AdminDB.getCurrentUser();
        if (user) {
            const nameEl = document.getElementById('sidebarUserName');
            const roleEl = document.getElementById('sidebarUserRole');
            const avatarEl = document.getElementById('sidebarUserAvatar');
            const headerNameEl = document.getElementById('headerUserName');
            if (nameEl) nameEl.textContent = user.name;
            if (roleEl) roleEl.textContent = user.role;
            if (avatarEl) avatarEl.textContent = user.avatar || user.name.split(' ').map(n => n[0]).join('');
            if (headerNameEl) headerNameEl.textContent = user.name || 'Admin';
        }
    },

    updateNotificationCount() {
        const newInquiries = AdminDB.getAllSync(AdminDB.KEYS.INQUIRIES).filter(i => i.status === 'New').length;
        const badge = document.getElementById('inquiryBadge');
        if (badge) {
            badge.textContent = newInquiries;
            badge.style.display = newInquiries > 0 ? 'inline' : 'none';
        }
        const notifDot = document.querySelector('.notification-dot');
        if (notifDot) {
            notifDot.style.display = newInquiries > 0 ? 'block' : 'none';
        }
    },

    // =======================================
    // DASHBOARD
    // =======================================
    loadDashboard() {
        const events = AdminDB.getAllSync(AdminDB.KEYS.EVENTS);
        const news = AdminDB.getAllSync(AdminDB.KEYS.NEWS);
        const gallery = AdminDB.getAllSync(AdminDB.KEYS.GALLERY);
        const staff = AdminDB.getAllSync(AdminDB.KEYS.STAFF);
        const inquiries = AdminDB.getAllSync(AdminDB.KEYS.INQUIRIES);

        const totalImages = gallery.reduce((sum, album) => sum + (album.images?.length || 0), 0);
        const newInquiries = inquiries.filter(i => i.status === 'New').length;

        // Update stat cards
        document.getElementById('statEvents').textContent = events.length;
        document.getElementById('statNews').textContent = news.length;
        document.getElementById('statGallery').textContent = totalImages;
        document.getElementById('statStaff').textContent = staff.length;
        document.getElementById('statInquiries').textContent = inquiries.length;
        document.getElementById('statNewInquiries').textContent = newInquiries;

        // Load recent activity
        this.loadRecentActivity();

        // Load upcoming events
        this.loadUpcomingEvents();

        // Load calendar mini
        this.loadMiniCalendar();
    },

    loadRecentActivity() {
        const logs = AdminDB.getAllSync(AdminDB.KEYS.LOGS).slice(0, 8);
        const container = document.getElementById('recentActivity');
        if (!container) return;

        const dotColors = ['dot-primary', 'dot-emerald', 'dot-amber', 'dot-rose', 'dot-cyan'];

        container.innerHTML = logs.map((log, i) => `
            <div class="activity-item">
                <div class="activity-dot ${dotColors[i % dotColors.length]}"></div>
                <div class="activity-content">
                    <p><strong>${log.user}</strong> &mdash; ${log.details}</p>
                    <div class="activity-time">${this.formatTimeAgo(log.timestamp)}</div>
                </div>
            </div>
        `).join('');
    },

    loadUpcomingEvents() {
        const events = AdminDB.getAllSync(AdminDB.KEYS.EVENTS)
            .filter(e => new Date(e.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5);

        const container = document.getElementById('upcomingEvents');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No upcoming events</p></div>';
            return;
        }

        const categoryColors = { Event: 'var(--primary)', Holiday: 'var(--accent-rose)', Exam: 'var(--accent-amber)' };

        container.innerHTML = events.map(evt => `
            <div class="activity-item" style="cursor: pointer;" onclick="AdminApp.navigate('events')">
                <div class="activity-dot" style="background: ${categoryColors[evt.category] || 'var(--primary)'}"></div>
                <div class="activity-content">
                    <p><strong>${evt.title}</strong></p>
                    <div class="activity-time">${this.formatDate(evt.date)} &bull; ${evt.category}</div>
                </div>
                <span class="badge badge-${evt.category === 'Holiday' ? 'danger' : evt.category === 'Exam' ? 'warning' : 'info'}">${evt.category}</span>
            </div>
        `).join('');
    },

    // =======================================
    // EVENTS
    // =======================================
    loadEvents() {
        const events = AdminDB.getAllSync(AdminDB.KEYS.EVENTS);
        const container = document.getElementById('eventsTableBody');
        if (!container) return;

        const filteredEvents = this.filterItems(events, 'eventSearch', 'eventCategoryFilter');

        if (filteredEvents.length === 0) {
            container.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">&#128197;</div><h3>No Events Found</h3><p>Create your first event to get started.</p></div></td></tr>`;
            return;
        }

        const categoryColors = { Event: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', Holiday: 'linear-gradient(135deg, var(--accent-rose), #f43f5e)', Exam: 'linear-gradient(135deg, var(--accent-amber), #f59e0b)' };
        const categoryIcons = { Event: '&#127881;', Holiday: '&#127983;', Exam: '&#128221;' };

        container.innerHTML = filteredEvents.map(evt => `
            <tr>
                <td>
                    <div class="item-info">
                        <div class="item-avatar" style="background: ${categoryColors[evt.category] || categoryColors.Event}">${categoryIcons[evt.category] || '&#128197;'}</div>
                        <div>
                            <div class="item-name">${this._escapeHtml(evt.title)}</div>
                            <div class="item-sub">${this._escapeHtml(evt.description?.substring(0, 50))}${evt.description?.length > 50 ? '...' : ''}</div>
                        </div>
                    </div>
                </td>
                <td>${this.formatDate(evt.date)}</td>
                <td><span class="badge badge-${evt.category === 'Holiday' ? 'danger' : evt.category === 'Exam' ? 'warning' : 'info'}">${evt.category}</span></td>
                <td><span class="badge badge-${evt.status === 'Completed' ? 'success' : 'primary'}">${evt.status}</span></td>
                <td>${this.formatTimeAgo(evt.updatedAt)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-info btn-icon" onclick="AdminApp.viewEvent('${evt.id}')" title="View Event">&#128065;</button>
                        <button class="btn btn-secondary btn-icon" onclick="AdminApp.editEvent('${evt.id}')" title="Edit Event">&#9999;</button>
                        <button class="btn btn-danger btn-icon" onclick="AdminApp.deleteEvent('${evt.id}')" title="Delete Event">&#128465;</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    viewEvent(id) {
        const event = AdminDB.getById(AdminDB.KEYS.EVENTS, id);
        if (!event) return;

        const categoryColors = { Event: 'linear-gradient(135deg,#6366f1,#4f46e5)', Holiday: 'linear-gradient(135deg,#fb7185,#f43f5e)', Exam: 'linear-gradient(135deg,#fbbf24,#f59e0b)' };
        const categoryIcons = { Event: '&#127881;', Holiday: '&#127983;', Exam: '&#128221;' };
        const badgeClass = { Upcoming: 'badge-primary', Ongoing: 'badge-info', Completed: 'badge-success', Cancelled: 'badge-danger' };
        const catBadge = { Event: 'badge-info', Holiday: 'badge-danger', Exam: 'badge-warning' };

        const container = document.getElementById('viewEventContent');
        if (!container) return;

        container.innerHTML = `
            <div class="view-detail-header">
                <div class="view-detail-avatar" style="background:${categoryColors[event.category] || categoryColors.Event}">${categoryIcons[event.category] || '&#128197;'}</div>
                <div class="view-detail-title">
                    <h3>${event.title}</h3>
                    <p>Created ${this.formatDate(event.createdAt || event.updatedAt)}</p>
                    <div class="event-view-badge-row">
                        <span class="badge ${catBadge[event.category] || 'badge-info'}">${event.category}</span>
                        <span class="badge ${badgeClass[event.status] || 'badge-primary'}">${event.status}</span>
                    </div>
                </div>
            </div>
            <div class="view-detail-grid">
                <div class="view-detail-item">
                    <label>&#128197; Start Date</label>
                    <span>${this.formatDate(event.date) || '\u2014'}</span>
                </div>
                <div class="view-detail-item">
                    <label>&#128197; End Date</label>
                    <span>${event.endDate ? this.formatDate(event.endDate) : '\u2014'}</span>
                </div>
                <div class="view-detail-item">
                    <label>&#128204; Category</label>
                    <span>${event.category}</span>
                </div>
                <div class="view-detail-item">
                    <label>&#128336; Last Updated</label>
                    <span>${this.formatTimeAgo(event.updatedAt)}</span>
                </div>
            </div>
            ${event.description ? `
            <div class="view-detail-item" style="margin-bottom:0;">
                <label>&#128196; Description</label>
                <div class="event-description-box">${event.description}</div>
            </div>` : ''}
        `;

        // Wire Edit button in footer
        const editBtn = document.getElementById('viewEventEditBtn');
        if (editBtn) editBtn.onclick = () => { this.closeModal('viewEventModal'); this.editEvent(id); };

        this.openModal('viewEventModal');
    },

    showEventModal(event = null) {
        this.editingItem = event;
        const modal = document.getElementById('eventModal');
        document.getElementById('eventModalTitle').textContent = event ? 'Edit Event' : 'Add New Event';
        document.getElementById('eventTitle').value = event?.title || '';
        document.getElementById('eventDescription').value = event?.description || '';
        document.getElementById('eventDate').value = event?.date || '';
        document.getElementById('eventEndDate').value = event?.endDate || '';
        document.getElementById('eventCategory').value = event?.category || 'Event';
        document.getElementById('eventStatus').value = event?.status || 'Upcoming';
        this.openModal('eventModal');
    },

    saveEvent() {
        const data = {
            title: document.getElementById('eventTitle').value.trim(),
            description: document.getElementById('eventDescription').value.trim(),
            date: document.getElementById('eventDate').value,
            endDate: document.getElementById('eventEndDate').value,
            category: document.getElementById('eventCategory').value,
            status: document.getElementById('eventStatus').value
        };

        if (!data.title || !data.date) {
            this.showToast('Please fill in Title and Date.', 'error');
            return;
        }

        if (this.editingItem) {
            AdminDB.update(AdminDB.KEYS.EVENTS, this.editingItem.id, data);
            AdminDB.logActivity('Event Updated', `Updated event "${data.title}"`);
            this.showToast('Event updated successfully!', 'success');
        } else {
            AdminDB.add(AdminDB.KEYS.EVENTS, data);
            AdminDB.logActivity('Event Created', `Created event "${data.title}"`);
            this.showToast('Event created successfully!', 'success');
        }

        this.closeModal('eventModal');
        this.loadEvents();
        this.editingItem = null;
    },

    editEvent(id) {
        const event = AdminDB.getById(AdminDB.KEYS.EVENTS, id);
        if (event) this.showEventModal(event);
    },

    deleteEvent(id) {
        if (confirm('Are you sure you want to delete this event?')) {
            const event = AdminDB.getById(AdminDB.KEYS.EVENTS, id);
            AdminDB.remove(AdminDB.KEYS.EVENTS, id);
            AdminDB.logActivity('Event Deleted', `Deleted event "${event?.title}"`);
            this.showToast('Event deleted.', 'warning');
            this.loadEvents();
        }
    },

    // =======================================
    // NEWS
    // =======================================
    loadNews() {
        const news = AdminDB.getAllSync(AdminDB.KEYS.NEWS);
        const container = document.getElementById('newsTableBody');
        if (!container) return;

        const filteredNews = this.filterItems(news, 'newsSearch', 'newsStatusFilter');

        if (filteredNews.length === 0) {
            container.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">&#128240;</div><h3>No News Found</h3><p>Create your first announcement to get started.</p></div></td></tr>`;
            return;
        }

        container.innerHTML = filteredNews.map(item => `
            <tr>
                <td>
                    <div class="item-info">
                        <div class="item-avatar" style="background: linear-gradient(135deg, var(--accent-cyan), #06b6d4)">&#128240;</div>
                        <div>
                            <div class="item-name">${this._escapeHtml(item.title)}</div>
                            <div class="item-sub">${this._escapeHtml(item.content?.substring(0, 60))}...</div>
                        </div>
                    </div>
                </td>
                <td>${this.formatDate(item.publishDate)}</td>
                <td><span class="badge badge-${item.status === 'Published' ? 'success' : item.status === 'Draft' ? 'warning' : 'info'}">${item.status}</span></td>
                <td><span class="badge badge-${item.priority === 'High' ? 'danger' : 'primary'}">${item.priority}</span></td>
                <td>${this.formatTimeAgo(item.updatedAt)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-secondary btn-icon" onclick="AdminApp.editNews('${item.id}')" title="Edit">&#9999;</button>
                        <button class="btn btn-danger btn-icon" onclick="AdminApp.deleteNews('${item.id}')" title="Delete">&#128465;</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    showNewsModal(item = null) {
        this.editingItem = item;
        document.getElementById('newsModalTitle').textContent = item ? 'Edit Announcement' : 'Add Announcement';
        document.getElementById('newsTitle').value = item?.title || '';
        document.getElementById('newsContent').value = item?.content || '';
        document.getElementById('newsPublishDate').value = item?.publishDate || new Date().toISOString().split('T')[0];
        document.getElementById('newsStatus').value = item?.status || 'Draft';
        document.getElementById('newsPriority').value = item?.priority || 'Normal';
        this.openModal('newsModal');
    },

    saveNews() {
        const data = {
            title: document.getElementById('newsTitle').value.trim(),
            content: document.getElementById('newsContent').value.trim(),
            publishDate: document.getElementById('newsPublishDate').value,
            status: document.getElementById('newsStatus').value,
            priority: document.getElementById('newsPriority').value
        };

        if (!data.title || !data.content) {
            this.showToast('Please fill in Title and Content.', 'error');
            return;
        }

        if (this.editingItem) {
            AdminDB.update(AdminDB.KEYS.NEWS, this.editingItem.id, data);
            AdminDB.logActivity('News Updated', `Updated announcement "${data.title}"`);
            this.showToast('Announcement updated!', 'success');
        } else {
            AdminDB.add(AdminDB.KEYS.NEWS, data);
            AdminDB.logActivity('News Published', `Created announcement "${data.title}"`);
            this.showToast('Announcement created!', 'success');
        }

        this.closeModal('newsModal');
        this.loadNews();
        this.editingItem = null;
    },

    editNews(id) {
        const item = AdminDB.getById(AdminDB.KEYS.NEWS, id);
        if (item) this.showNewsModal(item);
    },

    deleteNews(id) {
        if (confirm('Delete this announcement?')) {
            const item = AdminDB.getById(AdminDB.KEYS.NEWS, id);
            AdminDB.remove(AdminDB.KEYS.NEWS, id);
            AdminDB.logActivity('News Deleted', `Deleted "${item?.title}"`);
            this.showToast('Announcement deleted.', 'warning');
            this.loadNews();
        }
    },

    // =======================================
    // GALLERY
    // =======================================
    _galleryImageDataUrl: null,

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    loadGallery() {
        const albums = AdminDB.getAllSync(AdminDB.KEYS.GALLERY);
        const container = document.getElementById('galleryAlbums');
        if (!container) return;

        if (albums.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">&#128444;</div><h3>No Albums Yet</h3><p>Create your first album to start organizing photos.</p></div>';
            return;
        }

        container.innerHTML = albums.map(album => `
            <div class="content-card animate-in">
                <div class="card-header">
                    <h2><span class="icon">&#128444;</span>${this._escapeHtml(album.title)} <span class="badge badge-info" style="margin-left:8px;">${album.images?.length || 0} photos</span></h2>
                    <div class="btn-group">
                        <button class="btn btn-secondary btn-sm" onclick="AdminApp.showAddImageModal('${album.id}')">+ Add Photos</button>
                        <button class="btn btn-secondary btn-icon btn-sm" onclick="AdminApp.editAlbum('${album.id}')" title="Edit Album">&#9999;</button>
                        <button class="btn btn-danger btn-icon btn-sm" onclick="AdminApp.deleteAlbum('${album.id}')" title="Delete Album">&#128465;</button>
                    </div>
                </div>
                <div class="card-body">
                    <p style="font-size:0.8125rem; color:var(--text-muted); margin-bottom:16px;">${this._escapeHtml(album.description)}</p>
                    <div class="gallery-grid">
                        ${(album.images || []).map(img => {
            const hasImage = img.url && (img.url.startsWith('data:') || img.url.startsWith('http'));
            const imgContent = hasImage
                ? `<img src="${img.url}" alt="${this._escapeHtml(img.name)}" style="width:100%;height:100%;object-fit:cover;display:block;">`
                : `<div class="gallery-placeholder">${img.emoji || '&#128444;'}</div>`;
            return `
                            <div class="gallery-item">
                                ${imgContent}
                                <div class="gallery-item-overlay">
                                    <span>${this._escapeHtml(img.name)}</span>
                                    <div class="gallery-actions">
                                        <button class="btn btn-danger btn-icon btn-sm" onclick="AdminApp.deleteImage('${album.id}', '${img.id}')" title="Delete">&#128465;</button>
                                    </div>
                                </div>
                            </div>
                        `;
        }).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    },

    showAlbumModal(album = null) {
        this.editingItem = album;
        document.getElementById('albumModalTitle').textContent = album ? 'Edit Album' : 'Create New Album';
        document.getElementById('albumTitle').value = album?.title || '';
        document.getElementById('albumDescription').value = album?.description || '';
        this.openModal('albumModal');
    },

    saveAlbum() {
        const data = {
            title: document.getElementById('albumTitle').value.trim(),
            description: document.getElementById('albumDescription').value.trim()
        };

        if (!data.title) {
            this.showToast('Please enter an album title.', 'error');
            return;
        }

        if (this.editingItem) {
            AdminDB.update(AdminDB.KEYS.GALLERY, this.editingItem.id, data);
            AdminDB.logActivity('Album Updated', `Updated album "${data.title}"`);
            this.showToast('Album updated!', 'success');
        } else {
            data.images = [];
            AdminDB.add(AdminDB.KEYS.GALLERY, data);
            AdminDB.logActivity('Album Created', `Created album "${data.title}"`);
            this.showToast('Album created!', 'success');
        }

        this.closeModal('albumModal');
        this.loadGallery();
        this.editingItem = null;
    },

    editAlbum(id) {
        const album = AdminDB.getById(AdminDB.KEYS.GALLERY, id);
        if (album) this.showAlbumModal(album);
    },

    deleteAlbum(id) {
        if (confirm('Delete this entire album and all its photos?')) {
            const album = AdminDB.getById(AdminDB.KEYS.GALLERY, id);
            AdminDB.remove(AdminDB.KEYS.GALLERY, id);
            AdminDB.logActivity('Album Deleted', `Deleted album "${album?.title}"`);
            this.showToast('Album deleted.', 'warning');
            this.loadGallery();
        }
    },

    showAddImageModal(albumId) {
        this.editingItem = { albumId };
        this._galleryImageDataUrl = null;
        document.getElementById('imageName').value = '';
        document.getElementById('imageEmoji').value = '\ud83d\uddbc\ufe0f';
        const fileInput = document.getElementById('imageFileInput');
        if (fileInput) fileInput.value = '';
        const preview = document.getElementById('galleryImagePreview');
        if (preview) preview.style.display = 'none';
        const placeholder = document.getElementById('galleryUploadPlaceholder');
        if (placeholder) placeholder.style.display = 'flex';
        this.openModal('imageModal');
    },

    handleGalleryImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('Image must be under 5MB.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            this._galleryImageDataUrl = e.target.result;
            const previewImg = document.getElementById('galleryPreviewImg');
            const previewEl = document.getElementById('galleryImagePreview');
            const placeholderEl = document.getElementById('galleryUploadPlaceholder');
            if (previewImg) previewImg.src = e.target.result;
            if (previewEl) previewEl.style.display = 'block';
            if (placeholderEl) placeholderEl.style.display = 'none';
            const nameInput = document.getElementById('imageName');
            if (nameInput && !nameInput.value.trim()) {
                nameInput.value = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
            }
        };
        reader.readAsDataURL(file);
    },

    removeGalleryImage() {
        this._galleryImageDataUrl = null;
        const previewImg = document.getElementById('galleryPreviewImg');
        const previewEl = document.getElementById('galleryImagePreview');
        const placeholderEl = document.getElementById('galleryUploadPlaceholder');
        const fileInput = document.getElementById('imageFileInput');
        if (previewImg) previewImg.src = '';
        if (previewEl) previewEl.style.display = 'none';
        if (placeholderEl) placeholderEl.style.display = 'flex';
        if (fileInput) fileInput.value = '';
    },

    // Compress an image data URL by re-drawing on a canvas at reduced quality
    _compressImage(dataUrl, maxWidth = 1200, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) {
                    h = Math.round(h * maxWidth / w);
                    w = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    },

    async saveImage() {
        const albumId = this.editingItem?.albumId;
        const name = document.getElementById('imageName').value.trim();
        const emoji = document.getElementById('imageEmoji').value.trim() || '\ud83d\uddbc\ufe0f';

        if (!name) {
            this.showToast('Please enter an image name.', 'error');
            return;
        }

        const saveBtn = document.querySelector('#imageModal .btn-primary');
        const originalBtnText = saveBtn ? saveBtn.textContent : 'Add Photo';

        // Progress bar elements
        const progressWrap = document.getElementById('galleryUploadProgress');
        const progressFill = document.getElementById('galleryUploadProgressFill');
        const progressText = document.getElementById('galleryUploadProgressText');
        const progressPct = document.getElementById('galleryUploadProgressPct');

        const setProgress = (pct, label) => {
            if (progressFill) progressFill.style.width = pct + '%';
            if (progressPct) progressPct.textContent = pct + '%';
            if (progressText && label) progressText.textContent = label;
        };

        const resetUploadUI = () => {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalBtnText; }
            if (progressWrap) progressWrap.style.display = 'none';
            setProgress(0, 'Uploading...');
        };

        let imageUrl = '';
        let cloudinaryId = '';

        if (this._galleryImageDataUrl) {
            if (this._galleryImageDataUrl.startsWith('data:')) {
                // ── New file selected: upload to Cloudinary ──
                if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Uploading...'; }
                if (progressWrap) progressWrap.style.display = 'block';
                setProgress(0, 'Compressing...');

                try {
                    // 1. Compress locally first (saves Cloudinary bandwidth)
                    const compressed = await this._compressImage(this._galleryImageDataUrl, 1400, 0.82);
                    setProgress(5, 'Uploading to Cloudinary...');

                    // 2. Upload to Cloudinary via unsigned preset
                    const result = await CloudinaryConfig.upload(
                        compressed,
                        'apex_school/gallery',
                        (pct) => setProgress(5 + Math.round(pct * 0.9), `Uploading... ${pct}%`)
                    );

                    imageUrl = result.secure_url;
                    cloudinaryId = result.public_id;
                    setProgress(100, 'Done!');

                } catch (e) {
                    console.error('Gallery upload failed:', e);
                    this.showToast('Upload failed: ' + (e.message || 'Unknown error'), 'error');
                    resetUploadUI();
                    return;
                }
            } else {
                // Existing Cloudinary/http URL — no re-upload needed
                imageUrl = this._galleryImageDataUrl;
            }
        }

        // Save to Firestore
        const album = AdminDB.getById(AdminDB.KEYS.GALLERY, albumId);
        if (album) {
            if (!album.images) album.images = [];
            album.images.push({
                id: AdminDB.generateId(),
                name,
                emoji,
                url: imageUrl,
                cloudinaryId,
                uploadedAt: new Date().toISOString()
            });
            AdminDB.update(AdminDB.KEYS.GALLERY, albumId, { images: album.images });
            AdminDB.logActivity('Image Added', `Added "${name}" to "${album.title}"`);
            this.showToast('Image added!', 'success');
        }

        setTimeout(resetUploadUI, 800);
        this.closeModal('imageModal');
        this.loadGallery();
        this.editingItem = null;
        this._galleryImageDataUrl = null;
    },

    deleteImage(albumId, imageId) {
        if (confirm('Delete this image?')) {
            const album = AdminDB.getById(AdminDB.KEYS.GALLERY, albumId);
            if (album) {
                album.images = (album.images || []).filter(img => img.id !== imageId);
                AdminDB.update(AdminDB.KEYS.GALLERY, albumId, { images: album.images });
                AdminDB.logActivity('Image Deleted', `Removed an image from "${album.title}"`);
                this.showToast('Image deleted.', 'warning');
                this.loadGallery();
            }
        }
    },

    // =======================================
    // STAFF
    // =======================================
    _staffPhotoDataUrl: null,
    _logoDataUrl: null,
    _heroDataUrl: null,
    _aboutDataUrl: null,

    loadStaff() {
        const staff = AdminDB.getAllSync(AdminDB.KEYS.STAFF);
        const container = document.getElementById('staffTableBody');
        if (!container) return;

        const searchEl = document.getElementById('staffSearch');
        const searchQuery = searchEl?.value?.trim().toLowerCase() || '';

        let filtered = staff;
        if (searchQuery) {
            filtered = staff.filter(s =>
                s.name.toLowerCase().includes(searchQuery) ||
                s.subject.toLowerCase().includes(searchQuery) ||
                s.email.toLowerCase().includes(searchQuery)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">&#128100;</div><h3>No Staff Found</h3><p>Add faculty members to the directory.</p></div></td></tr>`;
            return;
        }

        const avatarColors = [
            'linear-gradient(135deg, #6366f1, #4f46e5)',
            'linear-gradient(135deg, #22d3ee, #06b6d4)',
            'linear-gradient(135deg, #34d399, #10b981)',
            'linear-gradient(135deg, #fbbf24, #f59e0b)',
            'linear-gradient(135deg, #fb7185, #f43f5e)',
            'linear-gradient(135deg, #a78bfa, #8b5cf6)'
        ];

        container.innerHTML = filtered.map((member, i) => {
            const avatarHtml = member.photoUrl
                ? `<img src="${member.photoUrl}" class="staff-table-photo" alt="${member.name}">`
                : `<div class="item-avatar" style="background: ${avatarColors[i % avatarColors.length]}">${member.avatar || member.name.split(' ').map(n => n[0]).join('')}</div>`;

            return `
            <tr>
                <td>
                    <div class="item-info">
                        ${avatarHtml}
                        <div>
                            <div class="item-name">${member.name}</div>
                            <div class="item-sub">${member.designation || 'Teacher'}</div>
                        </div>
                    </div>
                </td>
                <td>${member.subject}</td>
                <td>${member.email}</td>
                <td>${member.phone || '\u2014'}</td>
                <td>${this.formatTimeAgo(member.updatedAt)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-secondary btn-icon" onclick="AdminApp.editStaff('${member.id}')" title="Edit">&#9999;</button>
                        <button class="btn btn-danger btn-icon" onclick="AdminApp.deleteStaff('${member.id}')" title="Delete">&#128465;</button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    },

    showStaffModal(member = null) {
        this.editingItem = member;
        this._staffPhotoDataUrl = null;
        document.getElementById('staffModalTitle').textContent = member ? 'Edit Staff Member' : 'Add Staff Member';
        document.getElementById('staffName').value = member?.name || '';
        document.getElementById('staffSubject').value = member?.subject || '';
        document.getElementById('staffEmail').value = member?.email || '';
        document.getElementById('staffPhone').value = member?.phone || '';
        document.getElementById('staffDesignation').value = member?.designation || '';

        // Reset photo upload
        const preview = document.getElementById('staffPhotoPreview');
        const placeholder = document.getElementById('staffPhotoPlaceholder');
        const photoInput = document.getElementById('staffPhotoInput');
        if (photoInput) photoInput.value = '';

        if (member?.photoUrl) {
            // Show existing photo
            document.getElementById('staffPhotoImg').src = member.photoUrl;
            preview.style.display = 'inline-block';
            placeholder.style.display = 'none';
            this._staffPhotoDataUrl = member.photoUrl; // keep existing
        } else {
            preview.style.display = 'none';
            placeholder.style.display = 'flex';
        }

        this.openModal('staffModal');
    },

    handleStaffPhotoSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            this.showToast('Photo must be under 2MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this._staffPhotoDataUrl = e.target.result;
            document.getElementById('staffPhotoImg').src = e.target.result;
            document.getElementById('staffPhotoPreview').style.display = 'inline-block';
            document.getElementById('staffPhotoPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    },

    removeStaffPhoto() {
        this._staffPhotoDataUrl = null;
        document.getElementById('staffPhotoImg').src = '';
        document.getElementById('staffPhotoPreview').style.display = 'none';
        document.getElementById('staffPhotoPlaceholder').style.display = 'flex';
        document.getElementById('staffPhotoInput').value = '';
    },

    async saveStaff() {
        const data = {
            name: document.getElementById('staffName').value.trim(),
            subject: document.getElementById('staffSubject').value.trim(),
            email: document.getElementById('staffEmail').value.trim(),
            phone: document.getElementById('staffPhone').value.trim(),
            designation: document.getElementById('staffDesignation').value.trim(),
            avatar: document.getElementById('staffName').value.trim().split(' ').map(n => n[0]).join('').toUpperCase()
        };

        if (!data.name) {
            this.showToast('Please fill in Name.', 'error');
            return;
        }

        const saveBtn = document.querySelector('#staffModal .btn-primary');
        const originalBtnText = saveBtn ? saveBtn.textContent : 'Save';

        // Progress bar elements
        const progressWrap = document.getElementById('staffUploadProgress');
        const progressFill = document.getElementById('staffUploadProgressFill');
        const progressText = document.getElementById('staffUploadProgressText');
        const progressPct = document.getElementById('staffUploadProgressPct');

        const setProgress = (pct, label) => {
            if (progressFill) progressFill.style.width = pct + '%';
            if (progressPct) progressPct.textContent = pct + '%';
            if (progressText && label) progressText.textContent = label;
        };

        const resetUploadUI = () => {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalBtnText; }
            if (progressWrap) progressWrap.style.display = 'none';
            setProgress(0, 'Uploading...');
        };

        // ── Handle photo upload ──
        if (this._staffPhotoDataUrl) {
            if (this._staffPhotoDataUrl.startsWith('data:')) {
                // New photo selected: upload to Cloudinary
                if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Uploading...'; }
                if (progressWrap) progressWrap.style.display = 'block';
                setProgress(0, 'Compressing photo...');

                try {
                    // Compress to 800px wide, 80% quality
                    const compressed = await this._compressImage(this._staffPhotoDataUrl, 800, 0.80);
                    setProgress(5, 'Uploading photo...');

                    const result = await CloudinaryConfig.upload(
                        compressed,
                        'apex_school/staff',
                        (pct) => setProgress(5 + Math.round(pct * 0.9), `Uploading... ${pct}%`)
                    );

                    data.photoUrl = result.secure_url;
                    data.cloudinaryId = result.public_id;
                    setProgress(100, 'Done!');

                } catch (e) {
                    console.error('Staff photo upload failed:', e);
                    this.showToast('Photo upload failed: ' + (e.message || 'Unknown error'), 'error');
                    resetUploadUI();
                    return;
                }
            } else {
                // Existing Cloudinary/http URL — keep as-is
                data.photoUrl = this._staffPhotoDataUrl;
            }
        } else if (this.editingItem?.photoUrl) {
            // Photo explicitly removed by user
            data.photoUrl = '';
            data.cloudinaryId = '';
        }

        if (this.editingItem) {
            AdminDB.update(AdminDB.KEYS.STAFF, this.editingItem.id, data);
            AdminDB.logActivity('Staff Updated', `Updated "${data.name}"`);
            this.showToast('Staff member updated!', 'success');
        } else {
            AdminDB.add(AdminDB.KEYS.STAFF, data);
            AdminDB.logActivity('Staff Added', `Added "${data.name}" to staff directory`);
            this.showToast('Staff member added!', 'success');
        }

        setTimeout(resetUploadUI, 800);
        this.closeModal('staffModal');
        this.loadStaff();
        this.editingItem = null;
        this._staffPhotoDataUrl = null;
    },


    editStaff(id) {
        const member = AdminDB.getById(AdminDB.KEYS.STAFF, id);
        if (member) this.showStaffModal(member);
    },


    deleteStaff(id) {
        if (confirm('Remove this staff member?')) {
            const member = AdminDB.getById(AdminDB.KEYS.STAFF, id);
            AdminDB.remove(AdminDB.KEYS.STAFF, id);
            AdminDB.logActivity('Staff Removed', `Removed "${member?.name}"`);
            this.showToast('Staff member removed.', 'warning');
            this.loadStaff();
        }
    },

    // =======================================
    // CONTENT MANAGEMENT
    // =======================================
    loadContent() {
        const content = AdminDB.getObjectSync(AdminDB.KEYS.CONTENT);

        // Leadership messages
        ['founder', 'director', 'administrator'].forEach(role => {
            const roleKey = role + 'Message';
            const titleEl = document.getElementById(role + 'MsgTitle');
            const contentEl = document.getElementById(role + 'MsgContent');
            if (titleEl) titleEl.value = content[roleKey]?.title || '';
            if (contentEl) contentEl.value = content[roleKey]?.content || '';
        });

        // School policies
        const spTitle = document.getElementById('policiesTitle');
        const spContent = document.getElementById('policiesContent');
        if (spTitle) spTitle.value = content.schoolPolicies?.title || '';
        if (spContent) spContent.value = content.schoolPolicies?.content || '';

        // Homepage highlights / ticker
        const tickerEl = document.getElementById('tickerItems');
        if (tickerEl && content.homepageHighlights?.ticker) {
            tickerEl.value = content.homepageHighlights.ticker.join('\n');
        }

        // Website Media Previews
        this._updateMediaPreview('logo', content.websiteMedia?.logoUrl);
        this._updateMediaPreview('about', content.websiteMedia?.aboutUrl);
        this._updateMediaPreview('founder', content.founderMessage?.photoUrl);
        this._updateMediaPreview('director', content.directorMessage?.photoUrl);
        this._updateMediaPreview('administrator', content.administratorMessage?.photoUrl);

        // Hero Slideshow Previews
        for (let i = 0; i < 5; i++) {
            const prev = document.getElementById(`heroPreview${i}`);
            if (prev) prev.innerHTML = `<span>No image set</span>`;
        }

        if (content.websiteMedia?.heroSlides) {
            content.websiteMedia.heroSlides.forEach((slide, i) => {
                if (slide && slide.url && i < 5) {
                    const prev = document.getElementById(`heroPreview${i}`);
                    if (prev) {
                        prev.innerHTML = `<img src="${slide.url}" alt="hero ${i}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
                    }
                }
            });
        }
        if (content.websiteMedia?.staticHeroIndex !== undefined) {
            const radio = document.querySelector(`input[name="staticHero"][value="${content.websiteMedia.staticHeroIndex}"]`);
            if (radio) radio.checked = true;
        }
    },

    _updateMediaPreview(type, url) {
        let previewId = `${type}Preview`;
        if (type === 'about') previewId = 'aboutPrev';
        const previewEl = document.getElementById(previewId);
        if (!previewEl) return;

        if (url) {
            previewEl.innerHTML = `<img src="${url}" alt="${type} preview" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
        } else {
            previewEl.innerHTML = `<span>No image set</span>`;
        }
    },

    handleMediaSelect(input, type, index = null) {
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('File too large. Max 5MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            let previewId = type === 'about' ? 'aboutPrev' : `${type}Preview`;
            if (index !== null) previewId = `${type}Preview${index}`;

            const previewEl = document.getElementById(previewId);
            if (previewEl) {
                previewEl.innerHTML = `<img src="${dataUrl}" alt="${type} preview" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
            }

            if (type === 'logo') this._logoDataUrl = dataUrl;
            if (type === 'about') this._aboutDataUrl = dataUrl;
            if (type === 'founder') this._founderDataUrl = dataUrl;
            if (type === 'director') this._directorDataUrl = dataUrl;
            if (type === 'administrator') this._administratorDataUrl = dataUrl;
            if (type === 'staffPhoto') this._staffPhotoDataUrl = dataUrl;
            if (type === 'hero') {
                if (index !== null) this._heroDataUrls[index] = dataUrl;
                else this._heroDataUrls[0] = dataUrl;
            }
        };
        reader.readAsDataURL(file);
    },

    removeMedia(type, index = null) {
        let previewId = type === 'about' ? 'aboutPrev' : `${type}Preview`;
        if (index !== null) previewId = `${type}Preview${index}`;
        
        const previewEl = document.getElementById(previewId);
        if (previewEl) previewEl.innerHTML = `<span>No image set</span>`;

        if (type === 'logo') this._logoDataUrl = 'REMOVE';
        if (type === 'about') this._aboutDataUrl = 'REMOVE';
        if (type === 'founder') { this._founderDataUrl = 'REMOVE'; }
        if (type === 'director') { this._directorDataUrl = 'REMOVE'; }
        if (type === 'administrator') { this._administratorDataUrl = 'REMOVE'; }
        if (type === 'staffPhoto') this._staffPhotoDataUrl = 'REMOVE';
        if (type === 'hero') {
            if (index !== null) this._heroDataUrls[index] = 'REMOVE';
            else this._heroDataUrls[0] = 'REMOVE';
        }
    },

    async saveContent(sectionKey) {
        const content = AdminDB.getObjectSync(AdminDB.KEYS.CONTENT);

        switch (sectionKey) {
            case 'leadershipMessages':
                const uploadLeaderMedia = async (role) => {
                    const roleKey = role + 'Message';
                    if (!content[roleKey]) content[roleKey] = {};
                    const dataUrlKey = '_' + role + 'DataUrl';
                    
                    if (this[dataUrlKey]) {
                        if (this[dataUrlKey] === 'REMOVE') {
                            content[roleKey].photoUrl = '';
                            content[roleKey].cloudinaryId = '';
                        } else {
                            const compressed = await this._compressImage(this[dataUrlKey], 800, 0.85);
                            const result = await CloudinaryConfig.upload(compressed, 'apex_school/leadership');
                            content[roleKey].photoUrl = result.secure_url;
                            content[roleKey].cloudinaryId = result.public_id;
                        }
                        this[dataUrlKey] = null;
                    }
                    
                    content[roleKey].title = document.getElementById(role + 'MsgTitle').value.trim();
                    content[roleKey].content = document.getElementById(role + 'MsgContent').value.trim();
                    content[roleKey].lastUpdated = new Date().toISOString();
                };

                this.showLoading('Setting up leadership messages...');
                try {
                    await uploadLeaderMedia('founder');
                    await uploadLeaderMedia('director');
                    await uploadLeaderMedia('administrator');
                    this.hideLoading();
                } catch (e) {
                    console.error('Leadership photo upload failed:', e);
                    this.showToast('Photo upload failed.', 'error');
                    this.hideLoading();
                    return;
                }
                break;
            case 'schoolPolicies':
                content.schoolPolicies = {
                    title: document.getElementById('policiesTitle').value.trim(),
                    content: document.getElementById('policiesContent').value.trim(),
                    lastUpdated: new Date().toISOString()
                };
                break;
            case 'homepageHighlights':
                const tickerText = document.getElementById('tickerItems').value.trim();
                content.homepageHighlights = {
                    ticker: tickerText.split('\n').filter(t => t.trim()),
                    lastUpdated: new Date().toISOString()
                };
                break;
            case 'websiteMedia':
                this._saveMediaContent(content);
                return; // Logic continued in _saveMediaContent
        }

        AdminDB.saveObject(AdminDB.KEYS.CONTENT, content);
        AdminDB.logActivity('Content Updated', `Updated ${sectionKey.replace(/([A-Z])/g, ' $1').trim()}`);
        this.showToast('Content saved successfully!', 'success');
    },

    async _saveMediaContent(content) {
        this.showLoading('Uploading media...');
        try {
            if (!content.websiteMedia) content.websiteMedia = {};

            // Handle Logo
            if (this._logoDataUrl === 'REMOVE') {
                content.websiteMedia.logoUrl = '';
                this._logoDataUrl = null;
            } else if (this._logoDataUrl) {
                const res = await CloudinaryConfig.upload(this._logoDataUrl, 'apex_school/brand');
                content.websiteMedia.logoUrl = res.secure_url;
                this._logoDataUrl = null;
            }

            // Handle Hero Slideshow
            if (!content.websiteMedia.heroSlides) content.websiteMedia.heroSlides = [null, null, null, null, null];
            
            // Ensure it has 5 slots
            while (content.websiteMedia.heroSlides.length < 5) content.websiteMedia.heroSlides.push(null);

            for (let i = 0; i < 5; i++) {
                if (this._heroDataUrls[i] === 'REMOVE') {
                    content.websiteMedia.heroSlides[i] = null;
                    this._heroDataUrls[i] = null;
                } else if (this._heroDataUrls[i]) {
                    const res = await CloudinaryConfig.upload(this._heroDataUrls[i], 'apex_school/homepage');
                    content.websiteMedia.heroSlides[i] = { url: res.secure_url, public_id: res.public_id };
                    this._heroDataUrls[i] = null;
                }
            }
            // We no longer filter out nulls here to preserve index positions for the 5 slots.
            // Shifting was causing confusion for the user and breaking the static hero selection.
            
            // Handle Static Hero Index
            const staticRadio = document.querySelector('input[name="staticHero"]:checked');
            if (staticRadio) {
                content.websiteMedia.staticHeroIndex = parseInt(staticRadio.value);
            }

            // Handle About Image
            if (this._aboutDataUrl === 'REMOVE') {
                content.websiteMedia.aboutUrl = '';
                this._aboutDataUrl = null;
            } else if (this._aboutDataUrl) {
                const res = await CloudinaryConfig.upload(this._aboutDataUrl, 'apex_school/homepage');
                content.websiteMedia.aboutUrl = res.secure_url;
                this._aboutDataUrl = null;
            }

            content.websiteMedia.lastUpdated = new Date().toISOString();
            AdminDB.saveObject(AdminDB.KEYS.CONTENT, content);
            AdminDB.logActivity('Branding Updated', 'Website logo/images updated');
            this.showToast('Website media updated successfully!', 'success');
        } catch (err) {
            console.error('Media upload failed:', err);
            this.showToast('Failed to upload media: ' + err.message, 'error');
        } finally {
            this.hideLoading();
        }
    },

    // =======================================
    // INQUIRIES
    // =======================================
    loadInquiries() {
        const container = document.getElementById('inquiriesTableBody');
        if (!container) return;

        // Always fetch LIVE from Firestore so newly submitted inquiries appear instantly
        if (typeof db !== 'undefined') {
            container.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">&#128260; Loading inquiries...</td></tr>`;
            db.collection(AdminDB.KEYS.INQUIRIES)
                .orderBy('createdAt', 'desc')
                .get()
                .then(snap => {
                    const inquiries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    // Update cache for other sync operations (mark, delete, view)
                    localStorage.setItem(AdminDB.KEYS.INQUIRIES, JSON.stringify(inquiries));
                    this._renderInquiriesTable(inquiries);
                })
                .catch(() => {
                    // Fallback to cache if Firestore fails
                    this._renderInquiriesTable(AdminDB.getAllSync(AdminDB.KEYS.INQUIRIES));
                });
        } else {
            this._renderInquiriesTable(AdminDB.getAllSync(AdminDB.KEYS.INQUIRIES));
        }
    },

    _renderInquiriesTable(inquiries) {
        const container = document.getElementById('inquiriesTableBody');
        if (!container) return;

        const searchEl = document.getElementById('inquirySearch');
        const filterEl = document.getElementById('inquiryStatusFilter');
        const searchQuery = searchEl?.value?.trim().toLowerCase() || '';
        const statusFilter = filterEl?.value || '';

        let filtered = inquiries;
        if (searchQuery) {
            filtered = filtered.filter(i =>
                (i.studentName || '').toLowerCase().includes(searchQuery) ||
                (i.parentName || '').toLowerCase().includes(searchQuery) ||
                (i.email || '').toLowerCase().includes(searchQuery)
            );
        }
        if (statusFilter) {
            filtered = filtered.filter(i => i.status === statusFilter);
        }

        // Update notification badge
        const newCount = inquiries.filter(i => i.status === 'New').length;
        const badge = document.querySelector('.sidebar-link[data-section="inquiries"] .sidebar-badge');
        if (badge) badge.textContent = newCount || '';

        if (filtered.length === 0) {
            container.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">&#128231;</div><h3>No Inquiries Found</h3><p>Admission inquiries submitted from the website will appear here.</p></div></td></tr>`;
            return;
        }

        container.innerHTML = filtered.map(inq => `
            <tr>
                <td>
                    <div class="item-info">
                        <div class="item-avatar" style="background: linear-gradient(135deg, var(--accent-violet), #8b5cf6)">${(inq.studentName || '?').split(' ').map(n => n[0]).join('')}</div>
                        <div>
                            <div class="item-name">${inq.studentName || 'â€”'}</div>
                            <div class="item-sub">${inq.class || ''}</div>
                        </div>
                    </div>
                </td>
                <td>${inq.parentName || 'â€”'}</td>
                <td>${inq.email || 'â€”'}</td>
                <td>${inq.phone || 'â€”'}</td>
                <td><span class="badge badge-${inq.status === 'New' ? 'danger' : inq.status === 'Contacted' ? 'success' : 'warning'}">${inq.status || 'New'}</span></td>
                <td>${this.formatDate(inq.createdAt)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-success btn-sm" onclick="AdminApp.markInquiry('${inq.id}', 'Contacted')" title="Mark Contacted" ${inq.status === 'Contacted' ? 'disabled' : ''}>&#9989; Contacted</button>
                        <button class="btn btn-secondary btn-icon btn-sm" onclick="AdminApp.viewInquiry('${inq.id}')" title="View Details">&#128065;</button>
                        <button class="btn btn-danger btn-icon btn-sm" onclick="AdminApp.deleteInquiry('${inq.id}')" title="Delete">&#128465;</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    markInquiry(id, status) {
        AdminDB.update(AdminDB.KEYS.INQUIRIES, id, { status });
        AdminDB.logActivity('Inquiry Updated', `Marked inquiry as "${status}"`);
        this.showToast(`Inquiry marked as ${status}`, 'success');
        this.loadInquiries();
        this.updateNotificationCount();
    },

    viewInquiry(id) {
        const inq = AdminDB.getById(AdminDB.KEYS.INQUIRIES, id);
        if (!inq) return;
        document.getElementById('inquiryDetailContent').innerHTML = `
            <div style="display:grid; gap:16px;">
                <div class="form-row">
                    <div class="form-group"><label>Student Name</label><p style="color:var(--text-primary); font-weight:600;">${inq.studentName}</p></div>
                    <div class="form-group"><label>Applied for</label><p style="color:var(--text-primary); font-weight:600;">${inq.class}</p></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Parent / Guardian</label><p style="color:var(--text-primary); font-weight:600;">${inq.parentName}</p></div>
                    <div class="form-group"><label>Status</label><p><span class="badge badge-${inq.status === 'New' ? 'danger' : 'success'}">${inq.status}</span></p></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Email</label><p style="color:var(--text-primary);">${inq.email}</p></div>
                    <div class="form-group"><label>Phone</label><p style="color:var(--text-primary);">${inq.phone}</p></div>
                </div>
                <div class="form-group"><label>Message</label><p style="color:var(--text-secondary); line-height:1.7; padding:12px; background:var(--bg-glass); border-radius:var(--radius-sm);">${inq.message}</p></div>
                <div class="form-group"><label>Submitted</label><p style="color:var(--text-muted);">${this.formatDate(inq.createdAt)} (${this.formatTimeAgo(inq.createdAt)})</p></div>
            </div>
        `;
        this.openModal('inquiryModal');
    },

    deleteInquiry(id) {
        if (confirm('Delete this inquiry?')) {
            AdminDB.remove(AdminDB.KEYS.INQUIRIES, id);
            AdminDB.logActivity('Inquiry Deleted', 'Deleted an admission inquiry');
            this.showToast('Inquiry deleted.', 'warning');
            this.loadInquiries();
            this.updateNotificationCount();
        }
    },

    exportInquiries() {
        const inquiries = AdminDB.getAllSync(AdminDB.KEYS.INQUIRIES);
        if (inquiries.length === 0) {
            this.showToast('No inquiries to export.', 'warning');
            return;
        }

        const headers = ['Student Name', 'Parent Name', 'Email', 'Phone', 'Class', 'Message', 'Status', 'Date'];
        const rows = inquiries.map(i => [i.studentName, i.parentName, i.email, i.phone, i.class, `"${i.message}"`, i.status, i.createdAt]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inquiries_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Inquiries exported as CSV!', 'success');
    },

    // =======================================
    // LOGS
    // =======================================
    loadLogs() {
        const container = document.getElementById('logsTableBody');
        if (!container) return;

        const renderLogs = (logs) => {
            const searchEl = document.getElementById('logSearch');
            const searchQuery = searchEl?.value?.trim().toLowerCase() || '';
            let filtered = logs;
            if (searchQuery) {
                filtered = logs.filter(l =>
                    (l.action || '').toLowerCase().includes(searchQuery) ||
                    (l.details || '').toLowerCase().includes(searchQuery) ||
                    (l.user || '').toLowerCase().includes(searchQuery)
                );
            }
            if (filtered.length === 0) {
                container.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="icon">&#128203;</div><h3>No Logs Found</h3></div></td></tr>`;
                return;
            }
            const actionIcons = {
                'Login': '&#128272;', 'Logout': '&#128682;',
                'Event Created': '&#128197;', 'Event Updated': '&#128197;', 'Event Deleted': '&#128197;',
                'News Published': '&#128240;', 'News Updated': '&#128240;', 'News Deleted': '&#128240;',
                'Gallery Updated': '&#128444;', 'Album Created': '&#128444;', 'Album Deleted': '&#128444;',
                'Image Added': '&#128247;', 'Image Deleted': '&#128247;',
                'Staff Added': '&#128100;', 'Staff Updated': '&#128100;', 'Staff Removed': '&#128100;',
                'Content Updated': '&#128221;',
                'Inquiry Updated': '&#128231;', 'Inquiry Deleted': '&#128231;', 'Inquiry Received': '&#128231;',
                'Settings Updated': '&#9881;'
            };
            container.innerHTML = filtered.map(log => `
                <tr>
                    <td>
                        <div class="item-info">
                            <div class="item-avatar" style="background: var(--bg-glass); font-size: 1.2rem;">${actionIcons[log.action] || '&#128203;'}</div>
                            <div>
                                <div class="item-name">${log.action || 'â€”'}</div>
                                <div class="item-sub">${log.details || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>${log.user || 'â€”'}</td>
                    <td>${this.formatDate(log.timestamp)}</td>
                    <td>${this.formatTimeAgo(log.timestamp)}</td>
                </tr>
            `).join('');
        };

        // Always fetch live from Firestore
        if (typeof db !== 'undefined') {
            container.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted);">&#128260; Loading logs...</td></tr>`;
            db.collection(AdminDB.KEYS.LOGS).orderBy('timestamp', 'desc').limit(200).get()
                .then(snap => {
                    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    localStorage.setItem(AdminDB.KEYS.LOGS, JSON.stringify(logs));
                    renderLogs(logs);
                })
                .catch(() => renderLogs(AdminDB.getAllSync(AdminDB.KEYS.LOGS)));
        } else {
            renderLogs(AdminDB.getAllSync(AdminDB.KEYS.LOGS));
        }
    },

    // =======================================
    // SETTINGS
    // =======================================
    loadSettings() {
        const settings = AdminDB.getObjectSync(AdminDB.KEYS.SETTINGS);
        const fields = ['schoolName', 'schoolEmail', 'schoolPhone', 'schoolAddress'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = settings[f] || '';
        });

        const toggles = ['enableNotifications', 'enableActivityLog', 'maintenanceMode'];
        toggles.forEach(t => {
            const el = document.getElementById(t);
            if (el) el.checked = settings[t] || false;
        });
    },

    saveSettings() {
        const settings = {
            schoolName: document.getElementById('schoolName')?.value?.trim(),
            schoolEmail: document.getElementById('schoolEmail')?.value?.trim(),
            schoolPhone: document.getElementById('schoolPhone')?.value?.trim(),
            schoolAddress: document.getElementById('schoolAddress')?.value?.trim(),
            enableNotifications: document.getElementById('enableNotifications')?.checked,
            enableActivityLog: document.getElementById('enableActivityLog')?.checked,
            maintenanceMode: document.getElementById('maintenanceMode')?.checked
        };

        AdminDB.saveObject(AdminDB.KEYS.SETTINGS, settings);
        AdminDB.logActivity('Settings Updated', 'Portal settings were updated');
        this.showToast('Settings saved successfully!', 'success');
    },

    changePassword() {
        const current = document.getElementById('currentPassword')?.value;
        const newPass = document.getElementById('newPassword')?.value;
        const confirm = document.getElementById('confirmPassword')?.value;

        if (!current || !newPass || !confirm) {
            this.showToast('Please fill all password fields.', 'error');
            return;
        }

        if (newPass.length < 6) {
            this.showToast('Password must be at least 6 characters.', 'error');
            return;
        }

        if (newPass !== confirm) {
            this.showToast('New passwords do not match.', 'error');
            return;
        }

        const user = AdminDB.getCurrentUser();
        if (!user || user.password !== current) {
            this.showToast('Current password is incorrect.', 'error');
            return;
        }

        AdminDB.update(AdminDB.KEYS.USERS, user.id, { password: newPass });
        user.password = newPass;
        AdminDB.setSession(user);
        AdminDB.logActivity('Password Changed', 'Admin changed their password');
        this.showToast('Password changed successfully!', 'success');

        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    },

    // =======================================
    // MINI CALENDAR
    // =======================================
    calendarDate: new Date(),

    loadMiniCalendar() {
        const container = document.getElementById('miniCalendar');
        if (!container) return;

        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();
        const today = new Date();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Get events for this month
        const events = AdminDB.getAllSync(AdminDB.KEYS.EVENTS);
        const eventDates = events.map(e => e.date);
        const holidayDates = events.filter(e => e.category === 'Holiday').map(e => e.date);

        let html = `
            <div class="calendar-header">
                <button onclick="AdminApp.changeMonth(-1)" class="btn btn-secondary btn-icon btn-sm"></button>
                <h3>${monthNames[month]} ${year}</h3>
                <button onclick="AdminApp.changeMonth(1)" class="btn btn-secondary btn-icon btn-sm"></button>
            </div>
            <div class="calendar-grid">
        `;

        dayNames.forEach(d => { html += `<div class="calendar-day-header">${d}</div>`; });

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day other-month"></div>';
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const hasEvent = eventDates.includes(dateStr);
            const isHoliday = holidayDates.includes(dateStr);

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (hasEvent) classes += ' has-event';
            if (isHoliday) classes += ' holiday';

            html += `<div class="${classes}" title="${hasEvent ? 'Has events' : ''}">${day}</div>`;
        }

        html += '</div>';
        container.innerHTML = html;
    },

    changeMonth(delta) {
        this.calendarDate.setMonth(this.calendarDate.getMonth() + delta);
        this.loadMiniCalendar();
    },

    // =======================================
    // UTILITY
    // =======================================
    filterItems(items, searchId, filterId) {
        const searchEl = document.getElementById(searchId);
        const filterEl = document.getElementById(filterId);
        const searchQuery = searchEl?.value?.trim().toLowerCase() || '';
        const filterValue = filterEl?.value || '';

        let filtered = items;
        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.title?.toLowerCase().includes(searchQuery) ||
                item.name?.toLowerCase().includes(searchQuery)
            );
        }
        if (filterValue) {
            filtered = filtered.filter(item =>
                item.category === filterValue || item.status === filterValue
            );
        }
        return filtered;
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return dateStr; }
    },

    formatTimeAgo(dateStr) {
        if (!dateStr) return '';
        const now = new Date();
        const date = new Date(dateStr);
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return this.formatDate(dateStr);
    },

    // ---- Modal ----
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            this.currentModal = modalId;
            document.body.style.overflow = 'hidden';
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId || this.currentModal);
        if (modal) {
            modal.classList.remove('active');
            this.currentModal = null;
            document.body.style.overflow = '';
        }
    },

    // ---- Toast ----
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = { success: 'S', error: 'R', warning: 'W', info: 'I' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">X</button>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    },

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        if (overlay) overlay.classList.add('active');
        if (text) text.textContent = message;
        document.body.style.overflow = 'hidden';
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    },

    // ---- Logout ----
    logout() {
        if (confirm('Are you sure you want to log out?')) {
            AdminDB.logActivity('Logout', `${AdminDB.getCurrentUser()?.name || 'Admin'} logged out`);
            AdminDB.clearSession();
            if (typeof auth !== 'undefined') {
                auth.signOut().catch(e => console.warn('Firebase sign-out error:', e));
            }
            window.location.href = 'login.html';
        }
    },

    // =======================================
    // PERMISSION ENFORCEMENT
    // =======================================
    enforcePermissions() {
        const user = AdminDB.getCurrentUser();
        if (!user) return;
        const perms = user.permissions || [];
        if (user.role === 'Super Admin' || perms.length === 0) return;

        // Hide sidebar links the user doesn't have access to
        document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
            const section = link.dataset.section;
            if (section && !perms.includes(section)) {
                link.style.display = 'none';
            }
        });
    },

    // =======================================
    // USER MANAGEMENT
    // =======================================
    _userMgmtUnlocked: false,

    loadUsersSection() {
        const gate = document.getElementById('userMgmtGate');
        const content = document.getElementById('userMgmtContent');
        if (!gate || !content) return;

        if (this._userMgmtUnlocked) {
            gate.style.display = 'none';
            content.style.display = 'block';
            this.loadUsers();
        } else {
            gate.style.display = 'flex';
            content.style.display = 'none';
            const input = document.getElementById('userMgmtPasswordInput');
            if (input) {
                input.value = '';
                input.focus();
                input.onkeydown = (e) => { if (e.key === 'Enter') this.verifyUserMgmtPassword(); };
            }
            document.getElementById('userMgmtGateError').style.display = 'none';
        }
    },

    async verifyUserMgmtPassword() {
        const input = document.getElementById('userMgmtPasswordInput');
        const errorEl = document.getElementById('userMgmtGateError');
        const entered = input?.value?.trim();

        if (!entered) {
            errorEl.textContent = '\u274c Please enter the password.';
            errorEl.style.display = 'block';
            return;
        }

        const DEFAULT_PASSWORD = '9694123477';
        let correctPassword = '';
        try {
            const doc = await db.collection('admin_settings').doc('_data').get();
            if (doc.exists && doc.data().userMgmtPassword) {
                correctPassword = doc.data().userMgmtPassword;
            } else {
                // Password field missing from Firestore — write the default now
                correctPassword = DEFAULT_PASSWORD;
                await db.collection('admin_settings').doc('_data').set(
                    { userMgmtPassword: DEFAULT_PASSWORD },
                    { merge: true }
                ).catch(e => console.warn('Failed to write default userMgmtPassword:', e));
                console.log('Wrote default userMgmtPassword to Firestore.');
            }
        } catch (e) {
            console.warn('Could not fetch user mgmt password from Firestore, using default:', e);
            correctPassword = DEFAULT_PASSWORD;
        }

        if (entered === correctPassword) {
            this._userMgmtUnlocked = true;
            document.getElementById('userMgmtGate').style.display = 'none';
            document.getElementById('userMgmtContent').style.display = 'block';
            this.loadUsers();
        } else {
            errorEl.textContent = '\u274c Incorrect password. Try again.';
            errorEl.style.display = 'block';
            input.value = '';
            input.focus();
        }
    },

    async loadUsers() {
        const container = document.getElementById('usersTableBody');
        if (!container) return;

        container.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">&#128260; Loading users...</td></tr>';

        let users = [];
        try {
            const snap = await db.collection('admin_users').get();
            users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            localStorage.setItem(AdminDB.KEYS.USERS, JSON.stringify(users));
        } catch (e) {
            users = AdminDB.getAllSync(AdminDB.KEYS.USERS);
        }

        const searchQ = document.getElementById('userSearch')?.value?.trim().toLowerCase() || '';
        const roleF = document.getElementById('userRoleFilter')?.value || '';
        let filtered = users;
        if (searchQ) {
            filtered = filtered.filter(u =>
                (u.name || '').toLowerCase().includes(searchQ) ||
                (u.email || '').toLowerCase().includes(searchQ) ||
                (u.role || '').toLowerCase().includes(searchQ)
            );
        }
        if (roleF) filtered = filtered.filter(u => u.role === roleF);

        const allPermsList = ['dashboard', 'events', 'news', 'gallery', 'staff', 'content', 'inquiries', 'logs', 'accesslogs', 'settings', 'users'];
        const permLabels = { dashboard: '\ud83d\udcca', events: '\ud83d\udcc5', news: '\ud83d\udcf0', gallery: '\ud83d\udcf8', staff: '\ud83d\udc69\u200d\ud83c\udfeb', content: '\u270f\ufe0f', inquiries: '\ud83d\udce9', logs: '\ud83d\udccb', accesslogs: '\ud83d\udee1\ufe0f', settings: '\u2699\ufe0f', users: '\ud83d\udc65' };

        if (filtered.length === 0) {
            container.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">&#128100;</div><h3>No Users Found</h3><p>Create users to grant portal access.</p></div></td></tr>';
            return;
        }

        const avatarColors = [
            'linear-gradient(135deg, #6366f1, #4f46e5)',
            'linear-gradient(135deg, #22d3ee, #06b6d4)',
            'linear-gradient(135deg, #34d399, #10b981)',
            'linear-gradient(135deg, #fbbf24, #f59e0b)',
            'linear-gradient(135deg, #fb7185, #f43f5e)',
            'linear-gradient(135deg, #a78bfa, #8b5cf6)'
        ];

        container.innerHTML = filtered.map((user, i) => {
            const perms = user.permissions || [];
            const isAll = perms.length >= allPermsList.length;
            let permHtml;
            if (isAll) {
                permHtml = '<span class="perm-chip perm-all">\u2705 All Permissions</span>';
            } else if (perms.length === 0) {
                permHtml = '<span class="perm-chip">None</span>';
            } else {
                permHtml = perms.slice(0, 5).map(p => '<span class="perm-chip">' + (permLabels[p] || '') + ' ' + p + '</span>').join('');
                if (perms.length > 5) permHtml += '<span class="perm-chip">+' + (perms.length - 5) + ' more</span>';
            }

            const statusClass = user.status === 'Inactive' ? 'user-status-inactive' : 'user-status-active';
            const statusText = user.status || 'Active';
            const avatar = user.avatar || (user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?');

            return '<tr>' +
                '<td><div class="item-info"><div class="item-avatar" style="background: ' + avatarColors[i % avatarColors.length] + '">' + avatar + '</div><div><div class="item-name">' + (user.name || '\u2014') + '</div><div class="item-sub">' + (user.email || '') + '</div></div></div></td>' +
                '<td><span class="badge badge-' + (user.role === 'Super Admin' ? 'danger' : user.role === 'Admin' ? 'warning' : 'success') + '">' + (user.role || '\u2014') + '</span></td>' +
                '<td><div class="perm-chips">' + permHtml + '</div></td>' +
                '<td><span class="user-status ' + statusClass + '">' + statusText + '</span></td>' +
                '<td>' + this.formatDate(user.createdAt) + '</td>' +
                '<td><div class="btn-group"><button class="btn btn-info btn-icon btn-sm" onclick="AdminApp.viewUser(\'' + user.id + '\')" title="View User">&#128065;</button><button class="btn btn-secondary btn-icon btn-sm" onclick="AdminApp.editUser(\'' + user.id + '\')" title="Edit User">&#9999;</button><button class="btn btn-danger btn-icon btn-sm" onclick="AdminApp.deleteUser(\'' + user.id + '\')" title="Delete User">&#128465;</button></div></td>' +
                '</tr>';
        }).join('');
    },

    showUserModal(user) {
        user = user || null;
        this.editingItem = user;
        document.getElementById('userModalTitle').textContent = user ? 'Edit User' : 'Add New User';
        document.getElementById('userName').value = user ? (user.name || '') : '';
        document.getElementById('userEmail').value = user ? (user.email || '') : '';
        document.getElementById('userEmail').disabled = !!user;
        document.getElementById('userRole').value = user ? (user.role || 'Content Editor') : 'Content Editor';
        document.getElementById('userStatus').value = user ? (user.status || 'Active') : 'Active';
        document.getElementById('userPassword').value = '';
        document.getElementById('userPasswordGroup').style.display = user ? 'none' : 'block';

        const perms = user ? (user.permissions || ['dashboard']) : ['dashboard'];
        document.querySelectorAll('#permissionsGrid input[type="checkbox"]').forEach(cb => {
            cb.checked = perms.includes(cb.value);
        });

        this.openModal('userModal');
    },

    onRoleChange() {
        const role = document.getElementById('userRole').value;
        const allPerms = ['dashboard', 'events', 'news', 'gallery', 'staff', 'content', 'inquiries', 'logs', 'accesslogs', 'settings', 'users'];
        const presets = {
            'Super Admin': allPerms,
            'Admin': ['dashboard', 'events', 'news', 'gallery', 'staff', 'content', 'inquiries', 'logs', 'accesslogs', 'settings'],
            'Content Editor': ['dashboard', 'events', 'news', 'gallery', 'content'],
            'Viewer': ['dashboard']
        };
        const preset = presets[role] || ['dashboard'];
        document.querySelectorAll('#permissionsGrid input[type="checkbox"]').forEach(cb => {
            cb.checked = preset.includes(cb.value);
        });
    },

    selectAllPerms(selectAll) {
        document.querySelectorAll('#permissionsGrid input[type="checkbox"]').forEach(cb => {
            cb.checked = selectAll;
        });
    },

    async saveUser() {
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const role = document.getElementById('userRole').value;
        const status = document.getElementById('userStatus').value;
        const password = document.getElementById('userPassword').value;

        const permissions = [];
        document.querySelectorAll('#permissionsGrid input[type="checkbox"]:checked').forEach(cb => {
            permissions.push(cb.value);
        });

        if (!name || !email) {
            this.showToast('Please fill in Name and Email.', 'error');
            return;
        }
        if (!this.editingItem && (!password || password.length < 6)) {
            this.showToast('Password must be at least 6 characters.', 'error');
            return;
        }
        if (permissions.length === 0) {
            this.showToast('Please select at least one permission.', 'error');
            return;
        }

        const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase();

        if (this.editingItem) {
            // EDIT existing user
            const updates = { name: name, role: role, status: status, permissions: permissions, avatar: avatar, updatedAt: new Date().toISOString() };
            try {
                await db.collection('admin_users').doc(this.editingItem.id).update(updates);
                AdminDB.logActivity('User Updated', 'Updated user "' + name + '" with role: ' + role);
                this.showToast('User updated successfully!', 'success');
            } catch (e) {
                this.showToast('Failed to update user. ' + e.message, 'error');
                return;
            }
        } else {
            // CREATE new user
            try {
                const apiKey = firebaseConfig.apiKey;
                const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: password, returnSecureToken: false })
                });
                const data = await res.json();
                if (data.error) {
                    let msg = data.error.message || 'Failed to create user.';
                    if (msg === 'EMAIL_EXISTS') msg = 'This email is already registered in Firebase Auth.';
                    this.showToast(msg, 'error');
                    return;
                }

                const userData = {
                    name: name, email: email, role: role, status: status, permissions: permissions, avatar: avatar,
                    uid: data.localId || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await db.collection('admin_users').add(userData);
                AdminDB.logActivity('User Created', 'Created new user "' + name + '" (' + email + ') with role: ' + role);
                this.showToast('User created successfully! They can now log in.', 'success');
            } catch (e) {
                this.showToast('Failed to create user. ' + e.message, 'error');
                return;
            }
        }

        this.closeModal('userModal');
        this.loadUsers();
        this.editingItem = null;
    },

    viewUser(id) {
        const users = AdminDB.getAllSync(AdminDB.KEYS.USERS);
        const user = users.find(u => u.id === id);
        if (!user) return;

        const avatarColors = [
            'linear-gradient(135deg,#6366f1,#4f46e5)',
            'linear-gradient(135deg,#22d3ee,#06b6d4)',
            'linear-gradient(135deg,#34d399,#10b981)',
            'linear-gradient(135deg,#fbbf24,#f59e0b)',
            'linear-gradient(135deg,#fb7185,#f43f5e)',
            'linear-gradient(135deg,#a78bfa,#8b5cf6)'
        ];
        const allPermsList = [
            { key: 'dashboard', label: '\ud83d\udcca Dashboard' },
            { key: 'events', label: '\ud83d\udcc5 Events' },
            { key: 'events_edit', label: '\u270f\ufe0f Events (Edit)' },
            { key: 'events_delete', label: '\ud83d\uddd1\ufe0f Events (Delete)' },
            { key: 'news', label: '\ud83d\udcf0 News' },
            { key: 'news_edit', label: '\u270f\ufe0f News (Edit)' },
            { key: 'news_delete', label: '\ud83d\uddd1\ufe0f News (Delete)' },
            { key: 'gallery', label: '\ud83d\udcf8 Gallery' },
            { key: 'gallery_edit', label: '\u270f\ufe0f Gallery (Edit)' },
            { key: 'gallery_delete', label: '\ud83d\uddd1\ufe0f Gallery (Delete)' },
            { key: 'staff', label: '\ud83d\udc69\u200d\ud83c\udfeb Staff' },
            { key: 'staff_edit', label: '\u270f\ufe0f Staff (Edit)' },
            { key: 'staff_delete', label: '\ud83d\uddd1\ufe0f Staff (Delete)' },
            { key: 'content', label: '\u270f\ufe0f Page Content' },
            { key: 'content_edit', label: '\u270f\ufe0f Content (Edit)' },
            { key: 'inquiries', label: '\ud83d\udce9 Inquiries' },
            { key: 'inquiries_manage', label: '\ud83d\udce9 Inquiries (Manage)' },
            { key: 'inquiries_delete', label: '\ud83d\uddd1\ufe0f Inquiries (Delete)' },
            { key: 'logs', label: '\ud83d\udccb Activity Logs' },
            { key: 'accesslogs', label: '\ud83d\udee1\ufe0f Access Logs' },
            { key: 'accesslogs_clear', label: '\ud83d\uddd1\ufe0f Logs (Clear)' },
            { key: 'settings', label: '\u2699\ufe0f Settings' },
            { key: 'settings_edit', label: '\u270f\ufe0f Settings (Edit)' },
            { key: 'users', label: '\ud83d\udc65 Users' },
            { key: 'users_edit', label: '\u270f\ufe0f Users (Edit)' },
            { key: 'users_delete', label: '\ud83d\uddd1\ufe0f Users (Delete)' }
        ];

        const perms = user.permissions || [];
        const isSuperAdmin = user.role === 'Super Admin';
        const avatar = user.avatar || (user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?');
        const avatarBg = avatarColors[Math.abs((user.name || '').length % avatarColors.length)];
        const statusClass = user.status === 'Inactive' ? 'user-status-inactive' : 'user-status-active';
        const roleClass = user.role === 'Super Admin' ? 'badge-danger' : user.role === 'Admin' ? 'badge-warning' : 'badge-success';

        const permHtml = allPermsList.map(p => {
            const hasIt = isSuperAdmin || perms.includes(p.key);
            return `<div class="view-perm-item ${hasIt ? 'has-perm' : 'no-perm'}">
                ${hasIt ? '\u2705' : '\u274c'} ${p.label}
            </div>`;
        }).join('');

        const container = document.getElementById('viewUserContent');
        if (!container) return;

        container.innerHTML = `
            <div class="view-detail-header">
                <div class="view-detail-avatar" style="background:${avatarBg}">${avatar}</div>
                <div class="view-detail-title">
                    <h3>${user.name || '\u2014'}</h3>
                    <p>${user.email || ''}</p>
                    <div class="event-view-badge-row">
                        <span class="badge ${roleClass}">${user.role}</span>
                        <span class="user-status ${statusClass}">${user.status || 'Active'}</span>
                    </div>
                </div>
            </div>
            <div class="view-detail-grid">
                <div class="view-detail-item">
                    <label>&#128332; Created</label>
                    <span>${this.formatDate(user.createdAt) || '\u2014'}</span>
                </div>
                <div class="view-detail-item">
                    <label>&#128336; Last Updated</label>
                    <span>${this.formatTimeAgo(user.updatedAt) || '\u2014'}</span>
                </div>
            </div>
            <div class="view-detail-perms-title">&#128203; Permissions ${isSuperAdmin ? '(All — Super Admin)' : '(' + perms.length + ' granted)'}</div>
            <div class="view-perm-grid">${permHtml}</div>
        `;

        // Wire footer buttons
        const editBtn = document.getElementById('viewUserEditBtn');
        const deleteBtn = document.getElementById('viewUserDeleteBtn');
        const currentUser = AdminDB.getCurrentUser();
        if (editBtn) editBtn.onclick = () => { this.closeModal('viewUserModal'); this.editUser(id); };
        if (deleteBtn) {
            const isSelf = currentUser && currentUser.email === user.email;
            deleteBtn.disabled = isSelf;
            deleteBtn.title = isSelf ? 'Cannot delete your own account' : 'Delete this user';
            deleteBtn.onclick = isSelf ? null : () => { this.closeModal('viewUserModal'); this.deleteUser(id); };
        }

        this.openModal('viewUserModal');
    },

    editUser(id) {
        const users = AdminDB.getAllSync(AdminDB.KEYS.USERS);
        const user = users.find(u => u.id === id);
        if (user) this.showUserModal(user);
    },

    async deleteUser(id) {
        const users = AdminDB.getAllSync(AdminDB.KEYS.USERS);
        const user = users.find(u => u.id === id);
        if (!user) return;

        const currentUser = AdminDB.getCurrentUser();
        if (currentUser && currentUser.email === user.email) {
            this.showToast('You cannot delete your own account.', 'error');
            return;
        }

        if (!confirm('Are you sure you want to remove "' + user.name + '" (' + user.email + ')? This will remove their admin profile.')) return;

        try {
            await db.collection('admin_users').doc(id).delete();
            AdminDB.logActivity('User Deleted', 'Removed user "' + user.name + '" (' + user.email + ')');
            this.showToast('User removed from portal.', 'warning');
            this.loadUsers();
        } catch (e) {
            this.showToast('Failed to delete user. ' + e.message, 'error');
        }
    },


    // =======================================
    // ACCESS LOGS
    // =======================================
    loadAccessLogs() {
        const container = document.getElementById('accessLogsTableBody');
        if (!container) return;

        const renderAccessLogs = (logs) => {
            const searchEl = document.getElementById('accessLogSearch');
            const filterEl = document.getElementById('accessLogFilter');
            const searchQuery = searchEl?.value?.trim().toLowerCase() || '';
            const filterValue = filterEl?.value || '';

            let filtered = logs;
            if (searchQuery) {
                filtered = filtered.filter(log =>
                    (log.email || '').toLowerCase().includes(searchQuery) ||
                    (log.ipAddress || '').toLowerCase().includes(searchQuery) ||
                    (log.geolocation || '').toLowerCase().includes(searchQuery) ||
                    (log.userName || '').toLowerCase().includes(searchQuery)
                );
            }
            if (filterValue === 'success') filtered = filtered.filter(log => log.success === true);
            else if (filterValue === 'failed') filtered = filtered.filter(log => log.success === false);

            if (filtered.length === 0) {
                container.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">&#128272;</div><h3>No Access Logs</h3><p>Login attempts will be recorded here with IP, location, and camera photos.</p></div></td></tr>`;
                return;
            }

            container.innerHTML = filtered.map((log, i) => {
                const photoHtml = log.photo
                    ? `<img src="${log.photo}" class="access-photo-thumb" onclick="AdminApp.viewAccessPhoto('${log.id || i}')" title="Click to view full photo" alt="Login photo">`
                    : `<div class="access-no-photo" title="No photo captured">&#128247;</div>`;
                const statusClass = log.success ? 'access-status-success' : 'access-status-failed';
                const statusText = log.success === true ? '&#9989; Success' : (log.success === false ? '&#10060; Failed' : log.success);
                const ua = log.userAgent || '';
                const shortUA = ua.length > 40 ? ua.substring(0, 40) + '...' : ua;
                return `
                    <tr>
                        <td>${photoHtml}</td>
                        <td>
                            <div class="item-info">
                                <div>
                                    <div class="item-name">${log.userName || 'Unknown'}</div>
                                    <div class="item-sub">${log.email || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td><code style="font-size:0.78rem; background:rgba(99,102,241,0.1); padding:3px 8px; border-radius:4px;">${log.ipAddress || 'N/A'}</code></td>
                        <td><span title="Lat: ${log.geoLat || 'N/A'}, Lon: ${log.geoLon || 'N/A'}">&#128205; ${log.geolocation || 'N/A'}</span></td>
                        <td><span class="${statusClass}">${statusText}</span></td>
                        <td>${this.formatDate(log.timestamp)}<br><span style="font-size:0.7rem;color:var(--text-muted);">${log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span></td>
                        <td><span title="${ua}" style="font-size:0.72rem; color:var(--text-muted);">${shortUA}</span></td>
                    </tr>
                `;
            }).join('');
        };

        // Always fetch live from Firestore
        if (typeof db !== 'undefined') {
            container.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">&#128260; Loading access logs...</td></tr>`;
            db.collection('admin_access_logs').orderBy('timestamp', 'desc').limit(100).get()
                .then(snap => {
                    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    localStorage.setItem('admin_access_logs', JSON.stringify(logs));
                    renderAccessLogs(logs);
                })
                .catch(() => {
                    let cached = [];
                    try { cached = JSON.parse(localStorage.getItem('admin_access_logs')) || []; } catch { }
                    renderAccessLogs(cached);
                });
        } else {
            let cached = [];
            try { cached = JSON.parse(localStorage.getItem('admin_access_logs')) || []; } catch { }
            renderAccessLogs(cached);
        }
    },

    viewAccessPhoto(idOrIndex) {
        // Fetch the log from Firestore-refreshed localStorage cache
        let logs = [];
        try { logs = JSON.parse(localStorage.getItem('admin_access_logs')) || []; } catch { return; }

        // Support lookup by doc ID or by numeric index
        let log = logs.find(l => l.id === idOrIndex);
        if (!log && typeof idOrIndex === 'number') log = logs[idOrIndex];
        if (!log || !log.photo) return;

        document.getElementById('photoViewerImg').src = log.photo;
        document.getElementById('photoViewerInfo').innerHTML = `
            <p><strong>&#128100; User:</strong> ${log.userName || 'Unknown'} (${log.email || 'N/A'})</p>
            <p><strong>&#127760; IP Address:</strong> ${log.ipAddress || 'N/A'}</p>
            <p><strong>&#128205; Location:</strong> ${log.geolocation || 'N/A'}</p>
            <p><strong>&#128336; Timestamp:</strong> ${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</p>
            <p><strong>&#128272; Status:</strong> ${log.success === true ? '&#9989; Successful Login' : '&#10060; Failed Attempt'}</p>
        `;
        this.openModal('photoViewerModal');
    },

    async clearAccessLogs() {
        if (!confirm('Are you sure you want to clear all access logs? This cannot be undone.')) return;

        // Delete all documents from Firestore collection
        if (typeof db !== 'undefined') {
            try {
                const snap = await db.collection('admin_access_logs').get();
                if (!snap.empty) {
                    // Firestore batches support max 500 operations
                    const batchSize = 400;
                    const docs = snap.docs;
                    for (let i = 0; i < docs.length; i += batchSize) {
                        const batch = db.batch();
                        docs.slice(i, i + batchSize).forEach(doc => batch.delete(doc.ref));
                        await batch.commit();
                    }
                }
            } catch (e) {
                console.warn('Failed to delete access logs from Firestore:', e);
                this.showToast('Failed to clear logs from server. Try again.', 'error');
                return;
            }
        }

        localStorage.removeItem('admin_access_logs');
        this.loadAccessLogs();
        this.showToast('Access logs cleared.', 'warning');
        AdminDB.logActivity('Access Logs Cleared', 'All access logs were permanently deleted');
    },

    // =======================================
    // CHANGE PASSWORD
    // =======================================
    changePassword() {
        const currentPw = document.getElementById('currentPassword').value;
        const newPw = document.getElementById('newPassword').value;
        const confirmPw = document.getElementById('confirmPassword').value;

        if (!currentPw || !newPw || !confirmPw) {
            this.showToast('Please fill in all password fields.', 'error');
            return;
        }
        if (newPw.length < 6) {
            this.showToast('New password must be at least 6 characters.', 'error');
            return;
        }
        if (newPw !== confirmPw) {
            this.showToast('New passwords do not match.', 'error');
            return;
        }

        const currentUser = AdminDB.getCurrentUser();
        const users = AdminDB.getAllSync(AdminDB.KEYS.USERS);
        const user = users.find(u => u.email === currentUser?.email);

        if (!user) { this.showToast('User not found.', 'error'); return; }
        if (user.password !== currentPw) { this.showToast('Current password is incorrect.', 'error'); return; }

        user.password = newPw;
        AdminDB.save(AdminDB.KEYS.USERS, users);
        AdminDB.logActivity('Password Changed', `${user.name} changed their password`);
        this.showToast('Password changed successfully!', 'success');

        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    }
};
