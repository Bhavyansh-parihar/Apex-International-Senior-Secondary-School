/* ============================================
   ADMIN DATA LAYER  v2 — Firebase Firestore
   All data is stored in Firestore.
   localStorage is only used for:
     • session (sessionStorage)
     • fast UI cache to avoid flicker
   ============================================ */

const AdminDB = {

    // ---- Firestore collection names ----
    COL: {
        USERS: 'admin_users',
        EVENTS: 'admin_events',
        NEWS: 'admin_news',
        GALLERY: 'admin_gallery',
        STAFF: 'admin_staff',
        INQUIRIES: 'admin_inquiries',
        CONTENT: 'admin_content',
        LOGS: 'admin_activity_logs',
        SETTINGS: 'admin_settings'
    },

    // Keep KEYS as alias so any code referencing AdminDB.KEYS still works
    get KEYS() {
        return {
            USERS: 'admin_users',
            EVENTS: 'admin_events',
            NEWS: 'admin_news',
            GALLERY: 'admin_gallery',
            STAFF: 'admin_staff',
            INQUIRIES: 'admin_inquiries',
            CONTENT: 'admin_content',
            LOGS: 'admin_activity_logs',
            SESSION: 'admin_session',
            SETTINGS: 'admin_settings'
        };
    },

    // =============================================
    // GENERIC ASYNC FIRESTORE CRUD
    // =============================================

    /** Returns all documents in a collection as an array */
    async getAll(collection) {
        try {
            const snap = await db.collection(collection).get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn('Firestore getAll failed, using localStorage cache:', e);
            try { return JSON.parse(localStorage.getItem(collection)) || []; }
            catch { return []; }
        }
    },


    /** Add — updates localStorage immediately, then persists to Firestore */
    add(collection, item) {
        item.id = this.generateId();
        item.createdAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        this._cachePush(collection, item);
        // Persist to Firestore, then refresh cache so IDs always match
        if (typeof db !== 'undefined') {
            const { id, ...data } = item;
            db.collection(collection).doc(id).set(data)
                .then(() => this._refreshCache(collection))
                .catch(e => console.warn('Firestore add failed (cache updated):', e));
        }
        return item;
    },

    /** Update — updates localStorage immediately, then persists to Firestore */
    update(collection, id, updates) {
        updates.updatedAt = new Date().toISOString();
        this._cacheUpdate(collection, id, updates);
        if (typeof db !== 'undefined') {
            db.collection(collection).doc(id).update(updates)
                .then(() => this._refreshCache(collection))
                .catch(e => {
                    // If doc doesn't exist, set it
                    const item = this.getByIdSync(collection, id);
                    if (item) db.collection(collection).doc(id).set({ ...item, ...updates });
                });
        }
        return { id, ...updates };
    },

    /** Delete — removes from localStorage immediately, then deletes from Firestore */
    remove(collection, id) {
        this._cacheRemove(collection, id);
        if (typeof db !== 'undefined') {
            db.collection(collection).doc(id).delete()
                .then(() => this._refreshCache(collection))
                .catch(e => console.warn('Firestore remove failed (cache updated):', e));
        }
        return true;
    },

    /** Refresh a collection's localStorage cache from Firestore — returns a Promise */
    _refreshCache(collection) {
        if (typeof db === 'undefined') return Promise.resolve([]);
        return db.collection(collection).get()
            .then(snap => {
                const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                localStorage.setItem(collection, JSON.stringify(items));
                return items;
            })
            .catch(e => { console.warn('Cache refresh failed:', e); return []; });
    },

    /** Count documents in a collection */
    async count(collection) {
        const items = await this.getAll(collection);
        return items.length;
    },

    // =============================================
    // SINGLE-OBJECT FIRESTORE HELPERS
    // (used for settings, content, etc.)
    // =============================================

    async getObject(collection) {
        try {
            const doc = await db.collection(collection).doc('_data').get();
            return doc.exists ? doc.data() : {};
        } catch (e) {
            console.warn('Firestore getObject failed:', e);
            try { return JSON.parse(localStorage.getItem(collection)) || {}; }
            catch { return {}; }
        }
    },

    async saveObject(collection, obj) {
        try {
            await db.collection(collection).doc('_data').set(obj, { merge: true });
            localStorage.setItem(collection, JSON.stringify(obj));
        } catch (e) {
            console.warn('Firestore saveObject failed, saving to localStorage only:', e);
            localStorage.setItem(collection, JSON.stringify(obj));
        }
    },

    // =============================================
    // SYNCHRONOUS FALLBACKS
    // These are kept so existing synchronous calls
    // don't throw. They read/write the local cache.
    // =============================================

    /** Sync read from localStorage cache */
    getAllSync(collection) {
        try { return JSON.parse(localStorage.getItem(collection)) || []; }
        catch { return []; }
    },

    /** Sync read of a single-object collection from localStorage cache */
    getObjectSync(collection) {
        try { return JSON.parse(localStorage.getItem(collection)) || {}; }
        catch { return {}; }
    },

    /** Sync read of a single item by ID from localStorage cache */
    getByIdSync(collection, id) {
        return this.getAllSync(collection).find(item => item.id === id) || null;
    },

    /** Alias: getById → getByIdSync for synchronous callers in admin-app.js */
    getById(collection, id) {
        return this.getByIdSync(collection, id);
    },

    /** Sync write to localStorage cache */
    save(collection, items) {
        localStorage.setItem(collection, JSON.stringify(items));
        // Also push each item to Firestore in background (fire-and-forget)
        if (typeof db !== 'undefined') {
            const batch = db.batch();
            items.forEach(item => {
                const { id, ...data } = item;
                if (id) {
                    batch.set(db.collection(collection).doc(String(id)), data, { merge: true });
                }
            });
            batch.commit().catch(e => console.warn('Background Firestore sync failed:', e));
        }
    },

    // =============================================
    // CACHE HELPERS (private)
    // =============================================

    _cacheSet(collection, item) {
        const items = this.getAllSync(collection);
        const idx = items.findIndex(i => i.id === item.id);
        if (idx >= 0) items[idx] = item; else items.unshift(item);
        localStorage.setItem(collection, JSON.stringify(items));
    },

    _cachePush(collection, item) {
        const items = this.getAllSync(collection);
        items.unshift(item);
        localStorage.setItem(collection, JSON.stringify(items));
    },

    _cacheUpdate(collection, id, updates) {
        const items = this.getAllSync(collection);
        const idx = items.findIndex(i => i.id === id);
        if (idx >= 0) items[idx] = { ...items[idx], ...updates };
        localStorage.setItem(collection, JSON.stringify(items));
    },

    _cacheRemove(collection, id) {
        const items = this.getAllSync(collection).filter(i => i.id !== id);
        localStorage.setItem(collection, JSON.stringify(items));
    },

    // =============================================
    // AUTH  (session stays in sessionStorage)
    // =============================================

    getCurrentUser() {
        try { return JSON.parse(sessionStorage.getItem('admin_session')); }
        catch { return null; }
    },

    setSession(user) {
        sessionStorage.setItem('admin_session', JSON.stringify(user));
    },

    clearSession() {
        sessionStorage.removeItem('admin_session');
    },

    /** Synchronous plaintext auth against localStorage cache */
    authenticate(email, password) {
        const users = this.getAllSync(this.KEYS.USERS);
        return users.find(u => u.email === email && u.password === password) || null;
    },

    /** Async Firestore-backed auth (preferred) */
    async authenticateAsync(email, password) {
        try {
            const snap = await db.collection(this.COL.USERS)
                .where('email', '==', email)
                .where('password', '==', password)
                .limit(1)
                .get();
            if (!snap.empty) {
                const doc = snap.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (e) {
            console.warn('Firestore auth failed, falling back to cache:', e);
            return this.authenticate(email, password);
        }
    },

    // =============================================
    // ACTIVITY LOGGING
    // =============================================

    logActivity(action, details, user = null) {
        const log = {
            action,
            details,
            user: user || this.getCurrentUser()?.name || 'System',
            timestamp: new Date().toISOString()
        };
        // Write to Firestore in background
        if (typeof db !== 'undefined') {
            db.collection(this.COL.LOGS).add(log)
                .catch(e => console.warn('Log write failed:', e));
        }
        // Also keep in localStorage cache (last 100)
        const logs = this.getAllSync(this.KEYS.LOGS);
        logs.unshift({ id: this.generateId(), ...log });
        if (logs.length > 100) logs.length = 100;
        localStorage.setItem(this.KEYS.LOGS, JSON.stringify(logs));
        return log;
    },

    /** PURGE ALL DATA from major collections */
    async purgeAllData() {
        const collections = [
            this.COL.EVENTS,
            this.COL.NEWS,
            this.COL.GALLERY,
            this.COL.STAFF,
            this.COL.INQUIRIES,
            this.COL.LOGS
        ];

        if (typeof db === 'undefined') {
            collections.forEach(c => localStorage.removeItem(c));
            return;
        }

        const batchSize = 20;
        for (const col of collections) {
            const snap = await db.collection(col).get();
            const docs = snap.docs;
            // Delete in batches of 20 to avoid Firestore limits
            for (let i = 0; i < docs.length; i += batchSize) {
                const batch = db.batch();
                docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
            localStorage.removeItem(col);
        }
        this.logActivity('System Wipe', 'All dynamic data was purged from the system.');
    },

    // =============================================
    // UTILITIES
    // =============================================

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // =============================================
    // SEED DEFAULT DATA (writes to Firestore once)
    // =============================================

    async seedDefaults() {
        await this._seedUsers();
        await this._seedCollection(this.COL.EVENTS, this._defaultEvents());
        await this._seedCollection(this.COL.NEWS, this._defaultNews());
        await this._seedCollection(this.COL.GALLERY, this._defaultGallery());
        await this._seedCollection(this.COL.STAFF, this._defaultStaff());
        await this._seedCollection(this.COL.INQUIRIES, this._defaultInquiries());
        await this._seedCollection(this.COL.LOGS, this._defaultLogs());
        await this._seedObject(this.COL.CONTENT, this._defaultContent());
        await this._seedObject(this.COL.SETTINGS, this._defaultSettings());
        console.log('✅ Seed data verified / applied');
    },

    async _seedUsers() {
        // Always fetch ALL users from Firestore to keep cache in sync
        const snap = await db.collection(this.COL.USERS).get().catch(() => null);
        if (snap && !snap.empty) {
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
            return;
        }
        // Firestore empty — write defaults
        const allPerms = ['dashboard', 'events', 'news', 'gallery', 'staff', 'content', 'inquiries', 'logs', 'accesslogs', 'settings', 'users'];
        const defaults = [
            { id: 'admin001', name: 'Super Admin', email: 'admin@apexschool.edu', role: 'Super Admin', avatar: 'SA', status: 'Active', permissions: allPerms, createdAt: new Date().toISOString() },
            { id: 'editor001', name: 'Content Editor', email: 'editor@apexschool.edu', role: 'Content Editor', avatar: 'CE', status: 'Active', permissions: ['dashboard', 'events', 'news', 'gallery', 'content'], createdAt: new Date().toISOString() }
        ];
        const batch = db.batch();
        defaults.forEach(({ id, ...data }) => batch.set(db.collection(this.COL.USERS).doc(id), data));
        await batch.commit().catch(e => console.warn('Seed users failed:', e));
        localStorage.setItem(this.KEYS.USERS, JSON.stringify(defaults));
    },

    async _seedCollection(col, defaults) {
        // Fetch ALL documents from Firestore to fully populate cache
        const snap = await db.collection(col).get().catch(() => null);
        if (snap && !snap.empty) {
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            localStorage.setItem(col, JSON.stringify(items));
            return;
        }
        // Firestore empty — write defaults
        const batch = db.batch();
        defaults.forEach(({ id, ...data }) => batch.set(db.collection(col).doc(id), data));
        await batch.commit().catch(e => console.warn(`Seed ${col} failed:`, e));
        localStorage.setItem(col, JSON.stringify(defaults));
    },

    async _seedObject(col, defaults) {
        const doc = await db.collection(col).doc('_data').get().catch(() => null);
        if (doc && doc.exists) {
            // Merge any missing default fields into the existing document
            const existing = doc.data();
            const missing = {};
            for (const key in defaults) {
                if (existing[key] === undefined) missing[key] = defaults[key];
            }
            if (Object.keys(missing).length > 0) {
                await db.collection(col).doc('_data').set(missing, { merge: true }).catch(e => console.warn(`Merge ${col} failed:`, e));
                Object.assign(existing, missing);
            }
            localStorage.setItem(col, JSON.stringify(existing));
            return;
        }
        await db.collection(col).doc('_data').set(defaults).catch(e => console.warn(`Seed ${col} failed:`, e));
        localStorage.setItem(col, JSON.stringify(defaults));
    },

    // =============================================
    // DEFAULT DATA SETS
    // =============================================

    _defaultEvents() {
        return [
            { id: 'evt001', title: 'Annual Day Celebration', description: 'Grand annual day with cultural programs, awards, and student performances.', date: '2026-03-15', endDate: '2026-03-15', category: 'Event', status: 'Upcoming', createdAt: '2026-02-15T10:00:00Z', updatedAt: '2026-02-15T10:00:00Z' },
            { id: 'evt002', title: 'Holi Holiday', description: 'School closed for Holi festival.', date: '2026-03-10', endDate: '2026-03-10', category: 'Holiday', status: 'Upcoming', createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z' },
            { id: 'evt003', title: 'Mid-Term Examinations', description: 'Mid-term exams for classes 6–12. Detailed schedule at the academic office.', date: '2026-03-20', endDate: '2026-03-28', category: 'Exam', status: 'Upcoming', createdAt: '2026-02-08T10:00:00Z', updatedAt: '2026-02-08T10:00:00Z' },
            { id: 'evt004', title: 'Science Exhibition', description: 'Inter-house science exhibition — students showcase innovative projects.', date: '2026-02-28', endDate: '2026-02-28', category: 'Event', status: 'Upcoming', createdAt: '2026-02-05T10:00:00Z', updatedAt: '2026-02-05T10:00:00Z' },
            { id: 'evt005', title: 'Republic Day', description: 'Flag hoisting and patriotic programs.', date: '2026-01-26', endDate: '2026-01-26', category: 'Holiday', status: 'Completed', createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z' }
        ];
    },

    _defaultNews() {
        return [
            { id: 'news001', title: 'Admissions Open for 2026-27', content: 'We are now accepting applications for 2026-27. Limited seats — apply early!', publishDate: '2026-02-05', status: 'Published', priority: 'High', createdAt: '2026-02-05T10:00:00Z', updatedAt: '2026-02-05T10:00:00Z' },
            { id: 'news002', title: 'National Science Olympiad Winners!', content: 'Our students secured 1st place at the National Science Olympiad, competing against 200+ schools nationwide.', publishDate: '2026-02-10', status: 'Published', priority: 'Normal', createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z' },
            { id: 'news003', title: 'New STEM Lab Inaugurated', content: 'Our state-of-the-art STEM lab with robotics kits, 3D printers, and AI tools was inaugurated by a guest from APJ Research.', publishDate: '2026-02-18', status: 'Published', priority: 'Normal', createdAt: '2026-02-18T10:00:00Z', updatedAt: '2026-02-18T10:00:00Z' },
            { id: 'news004', title: 'Parent-Teacher Meeting Scheduled', content: 'PTM for classes 1–12 on March 5, 2026. Collect appointment slots from the office.', publishDate: '2026-03-01', status: 'Scheduled', priority: 'Normal', createdAt: '2026-02-20T10:00:00Z', updatedAt: '2026-02-20T10:00:00Z' }
        ];
    },

    _defaultGallery() {
        return [
            { id: 'album001', title: 'Annual Day 2025', description: "Photos from last year's annual day celebration", images: [{ id: 'img001', name: 'Stage Performance', emoji: '🎭' }, { id: 'img002', name: 'Award Ceremony', emoji: '🏆' }, { id: 'img003', name: 'Cultural Dance', emoji: '💃' }], createdAt: '2025-12-20T10:00:00Z', updatedAt: '2025-12-20T10:00:00Z' },
            { id: 'album002', title: 'Sports Day 2025', description: 'Inter-house sports competition highlights', images: [{ id: 'img004', name: 'Track & Field', emoji: '🏃' }, { id: 'img005', name: 'Basketball Finals', emoji: '🏀' }], createdAt: '2025-11-15T10:00:00Z', updatedAt: '2025-11-15T10:00:00Z' },
            { id: 'album003', title: 'STEM Lab Opening', description: 'Inauguration of the new STEM laboratory', images: [{ id: 'img006', name: 'Ribbon Cutting', emoji: '✂️' }, { id: 'img007', name: 'Lab Equipment', emoji: '🔬' }, { id: 'img008', name: 'Student Demo', emoji: '🤖' }, { id: 'img009', name: '3D Printing', emoji: '🖨️' }], createdAt: '2026-02-18T10:00:00Z', updatedAt: '2026-02-18T10:00:00Z' }
        ];
    },

    _defaultStaff() {
        return [
            { id: 'staff001', name: 'Dr. Rajesh Kumar', subject: 'Mathematics', email: 'rajesh.k@apexschool.edu', phone: '+91 98765 43210', designation: 'HOD Mathematics', avatar: 'RK', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z' },
            { id: 'staff002', name: 'Mrs. Priya Sharma', subject: 'English', email: 'priya.s@apexschool.edu', phone: '+91 98765 43211', designation: 'Senior Teacher', avatar: 'PS', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z' },
            { id: 'staff003', name: 'Mr. Amit Verma', subject: 'Physics', email: 'amit.v@apexschool.edu', phone: '+91 98765 43212', designation: 'HOD Science', avatar: 'AV', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z' },
            { id: 'staff004', name: 'Ms. Sneha Gupta', subject: 'Computer Science', email: 'sneha.g@apexschool.edu', phone: '+91 98765 43213', designation: 'IT Coordinator', avatar: 'SG', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z' },
            { id: 'staff005', name: 'Dr. Meena Iyer', subject: 'Biology', email: 'meena.i@apexschool.edu', phone: '+91 98765 43214', designation: 'Senior Teacher', avatar: 'MI', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z' },
            { id: 'staff006', name: 'Mr. Sundar Rajan', subject: 'History', email: 'sundar.r@apexschool.edu', phone: '', designation: 'Teacher', avatar: 'SR', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z' }
        ];
    },

    _defaultInquiries() {
        return [
            { id: 'inq001', studentName: 'Aisha Khan', parentName: 'Mohammed Khan', email: 'khan.m@gmail.com', phone: '+91 99887 76655', class: 'Class 5', message: 'Interested in admission for 2026-27.', status: 'New', createdAt: '2026-02-20T09:30:00Z' },
            { id: 'inq002', studentName: 'Rohan Mehta', parentName: 'Sunil Mehta', email: 'sunil.m@gmail.com', phone: '+91 99887 76656', class: 'Class 8', message: 'Would like to know about scholarships.', status: 'Contacted', createdAt: '2026-02-19T14:20:00Z' },
            { id: 'inq003', studentName: 'Priya Nair', parentName: 'Lakshmi Nair', email: 'lakshmi.n@gmail.com', phone: '+91 99887 76657', class: 'Class 1', message: 'Details about the pre-primary program.', status: 'New', createdAt: '2026-02-18T11:45:00Z' },
            { id: 'inq004', studentName: 'Dev Patel', parentName: 'Hiren Patel', email: 'hiren.p@gmail.com', phone: '+91 99887 76658', class: 'Class 11', message: 'Interested in Science stream + STEM.', status: 'New', createdAt: '2026-02-17T16:10:00Z' }
        ];
    },

    _defaultLogs() {
        return [
            { id: 'log001', action: 'Login', details: 'Super Admin logged in', user: 'Super Admin', timestamp: '2026-02-21T06:30:00Z' },
            { id: 'log002', action: 'Event Created', details: 'Added "Annual Day Celebration"', user: 'Super Admin', timestamp: '2026-02-20T15:00:00Z' },
            { id: 'log003', action: 'News Published', details: 'Published "STEM Lab Opening"', user: 'Content Editor', timestamp: '2026-02-18T10:30:00Z' },
            { id: 'log004', action: 'Gallery Updated', details: 'Added 4 photos to "STEM Lab Opening"', user: 'Content Editor', timestamp: '2026-02-18T10:15:00Z' },
            { id: 'log005', action: 'Staff Added', details: 'Added "Ms. Sneha Gupta" to staff directory', user: 'Super Admin', timestamp: '2026-02-15T11:00:00Z' },
            { id: 'log006', action: 'Content Updated', details: "Updated Principal's message", user: 'Super Admin', timestamp: '2026-02-14T09:00:00Z' },
            { id: 'log007', action: 'Inquiry', details: 'New inquiry from Aisha Khan', user: 'System', timestamp: '2026-02-20T09:30:00Z' }
        ];
    },

    _defaultContent() {
        return {
            principalMessage: {
                title: 'Message from the Principal',
                content: "Dear Parents and Students,\n\nWelcome to Apex International School. Our mission is to empower future leaders through excellence in education, innovation, and character development.\n\nWith warmest regards,\nDr. Sarah Johnson\nPrincipal, Apex International School",
                lastUpdated: new Date().toISOString()
            },
            schoolPolicies: {
                title: 'School Rules & Regulations',
                content: `1. GENERAL CONDUCT & DISCIPLINE
- After the first bell rings, students must not be seen talking, playing, or loitering in the school premises.
- Students should move through corridors and change classrooms between periods quietly and in an orderly manner.
- Students must not quarrel with each other inside or outside the classroom.
- Students must remain in their own class or section at all times and are not allowed to visit other classes, even during breaks.
- Inattentiveness in class, lack of interest in studies, disrespect towards staff, or any behavior affecting school discipline will be treated seriously and may lead to suspension or dismissal.
- Students must follow all rules, and any violation will result in disciplinary action.

2. CAMPUS & PROPERTY
- Writing or scribbling on walls or desks, dirtying classrooms, or damaging school property is strictly prohibited. Defaulters will be fined.
- Students must ensure that their classrooms and the entire school premises remain clean and well maintained.
- Students are not permitted to bring two-wheelers or four-wheelers onto the school campus; bicycles are allowed.
- Students are not allowed to leave the school premises during school hours without permission from the Principal.

3. ACADEMIC REQUIREMENTS
- Each student should bring all required textbooks and notebooks for their classes.
- No books, newspapers, periodicals, or CDs other than prescribed school books are allowed.
- All students are required to participate in school games and other activities.

4. UNIFORM & GROOMING
- Students wearing improper or untidy uniforms will not be allowed to attend classes or appear for examinations.
- Students are not allowed to wear high-heeled footwear, canvas or sports shoes, slippers, or sandals.
- Girls should not wear tight jeans, pants, or skirts to school.
- Students should not use any kind of makeup.

5. HEALTH, SAFETY & HYGIENE
- Food must be brought only in tiffin boxes. Food packed in aluminium foil, plastic covers, banana leaves, or paper is not allowed.
- Students are discouraged from bringing or sharing sweets, toffees, or chocolates in school on birthdays or other occasions.
- Bringing razor blades or any sharp objects to school is strictly prohibited.

6. LANGUAGE POLICY
- Students must communicate only in English within the school campus, on the school bus, and in the hostel.`,
                lastUpdated: new Date().toISOString()
            },
            aboutGlance: {
                title: 'A Glance',
                content: `Apex International Senior Secondary School is a co-educational English-medium institution located on National Highway-68, Badsam Road, Sanchore, Jalore, Rajasthan. It has developed into a center known for quality education and training in the academic field.

The school was established in the academic year 2008 with due approval from the Department of Elementary Education, Government of Rajasthan, initially as a middle school. The institution follows all the minimum standards set by the Government of Rajasthan.

The school provides students with the benefits of a modern education system. It aims to undertake innovative work in the field of education and to develop skilled individuals who are committed to serving society. The institution’s progress is driven by the dedication of its management and the commitment and enthusiasm of its staff.`,
                lastUpdated: new Date().toISOString()
            },
            aboutMotto: {
                title: 'Our Motto',
                subtitle: 'Knowledge is the greatest wealth.',
                content: `A person can possess because it empowers individuals to think, grow, and make informed decisions in every aspect of life. Unlike material riches, knowledge cannot be stolen, lost, or diminished when shared; instead, it multiplies and benefits both the giver and the receiver. It opens doors to opportunities, helps overcome challenges, and builds confidence and independence. A knowledgeable person can adapt to changing circumstances and contribute meaningfully to society. In this way, knowledge not only enriches one’s own life but also has the power to uplift others, making it the most valuable and lasting form of wealth.`,
                lastUpdated: new Date().toISOString()
            },
            homepageHighlights: {
                ticker: [
                    '🎉 Admissions open for Academic Year 2026-27 — Apply Now!',
                    '🏆 Our students won 1st place at the National Science Olympiad!',
                    '📅 Annual Day Celebration on March 15, 2026 — All parents welcome!',
                    '📚 New STEM Lab inaugurated with cutting-edge equipment.'
                ],
                lastUpdated: new Date().toISOString()
            },
            schoolTimings: {
                summer: {
                    periods: [
                        { label: 'Assembly', time: '7:30 AM to 7:55 AM', duration: '25 min' },
                        { label: '1st Period', time: '7:55 AM to 8:40 AM', duration: '45 min' },
                        { label: '2nd Period', time: '8:40 AM to 9:20 AM', duration: '40 min' },
                        { label: '3rd Period', time: '9:20 AM to 10:00 AM', duration: '40 min' },
                        { label: 'Recess', time: '10:00 AM to 10:25 AM', duration: '25 min', isBreak: true },
                        { label: '4th Period', time: '10:25 AM to 11:05 AM', duration: '40 min' },
                        { label: '5th Period', time: '11:05 AM to 11:45 AM', duration: '40 min' },
                        { label: '6th Period', time: '11:45 AM to 12:25 PM', duration: '40 min' },
                        { label: '7th Period', time: '12:25 PM to 1:00 PM', duration: '35 min' }
                    ],
                    schoolHours: '7:30 AM to 1:00 PM'
                },
                winter: {
                    periods: [
                        { label: 'Assembly', time: '10:00 AM to 10:25 AM', duration: '25 min' },
                        { label: '1st Period', time: '10:25 AM to 11:05 AM', duration: '40 min' },
                        { label: '2nd Period', time: '11:05 AM to 11:45 AM', duration: '40 min' },
                        { label: '3rd Period', time: '11:45 AM to 12:25 PM', duration: '40 min' },
                        { label: 'Recess', time: '12:25 PM to 12:50 PM', duration: '25 min', isBreak: true },
                        { label: '4th Period', time: '12:50 PM to 1:30 PM', duration: '40 min' },
                        { label: '5th Period', time: '1:30 PM to 2:10 PM', duration: '40 min' },
                        { label: '6th Period', time: '2:10 PM to 2:50 PM', duration: '40 min' },
                        { label: '7th Period', time: '2:50 PM to 3:30 PM', duration: '40 min' },
                        { label: '8th Period', time: '3:30 PM to 4:00 PM', duration: '30 min' }
                    ],
                    schoolHours: '10:00 AM to 4:00 PM'
                },
                visitingHours: [
                    { label: 'Administrator', time: '8:00 AM to 2:00 PM' },
                    { label: 'Principal', time: '8:00 AM to 2:00 PM' },
                    { label: 'Office Hours', time: '8:00 AM to 3:00 PM' },
                    { label: 'Lunch Break', time: '10:20 AM to 10:45 AM', isBreak: true }
                ],
                lastUpdated: new Date().toISOString()
            }
        };
    },

    _defaultSettings() {
        return {
            schoolName: 'Apex International Senior Secondary School',
            schoolEmail: 'apexschoolsanchore2018@gmail.com',
            schoolPhone: '+91 925 615 1729',
            schoolAddress: 'NH68, Badsam Bypass Road, Sanchore, Rajasthan - 343041',
            enableNotifications: true,
            enableActivityLog: true,
            maintenanceMode: false,
            userMgmtPassword: '9694123477'
        };
    }
};

// ---- Boot: Manual seeding available via AdminApp ----
// Auto-seeding removed per user request to prevent "recovey" of deleted data.
