/* 
   The Honourable – Part 3 JavaScript

   Sections
   1. Helpers
   2. Opening hours + "open now" status      (contactus.html, enquiry reply)
   3. Scroll-reveal animation                (all pages)
   4. Accordion                              (enquiry.html FAQ)
   5. Gallery lightbox                       (about.html)
   6. Interactive map (Leaflet)              (contactus.html)
   7. Blog search / filter / sort            (blog.html)
   8. Form validation + submission           (enquiry, contactus, signup, blog)
   Every feature only runs if its elements exist on the current page.
    */
(function () {
    'use strict';

    // Lets the CSS know JavaScript is running 
    document.documentElement.classList.add('js');

    /* 
    HELPERS
    */

    function $(selector, context) {
        return (context || document).querySelector(selector);
    }

    function $$(selector, context) {
        return Array.prototype.slice.call((context || document).querySelectorAll(selector));
    }

    // Create an element with an optional class and text (text is inserted safely)
    function make(tag, className, text) {
        var node = document.createElement(tag);
        if (className) { node.className = className; }
        if (text) { node.textContent = text; }
        return node;
    }

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    // Date
    function toISO(date) {
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    function parseISO(value) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!m) { return null; }
        var d = new Date(+m[1], +m[2] - 1, +m[3]);
        if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) { return null; }
        return d;
    }

    /*
     OPENING HOURS
     */
    var HOURS = {
        0: [7 * 60, 15 * 60],   // Sunday     07:00-15:00
        1: [5 * 60, 21 * 60],   // Monday     05:00-21:00
        2: [5 * 60, 21 * 60],
        3: [5 * 60, 21 * 60],
        4: [5 * 60, 21 * 60],
        5: [5 * 60, 21 * 60],   // Friday
        6: [6 * 60, 19 * 60]    // Saturday   06:00-19:00
    };

    function fmtTime(minutes) {
        return pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60);
    }

    // Current day + time in South Africa, whatever the visitor's own time zone is
    function gymNow() {
        var parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Africa/Johannesburg',
            weekday: 'short',
            hour: 'numeric',
            minute: 'numeric',
            hourCycle: 'h23'
        }).formatToParts(new Date());
        var p = {};
        parts.forEach(function (part) { p[part.type] = part.value; });
        return {
            day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday),
            minutes: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10)
        };
    }

    function gymStatus() {
        var now = gymNow();
        var today = HOURS[now.day];
        if (now.minutes >= today[0] && now.minutes < today[1]) {
            return { open: true, text: 'We are open now and close at ' + fmtTime(today[1]) + ' today.' };
        }
        if (now.minutes < today[0]) {
            return { open: false, text: 'We are closed right now and open at ' + fmtTime(today[0]) + ' today.' };
        }
        return { open: false, text: 'We are closed right now and open tomorrow at ' + fmtTime(HOURS[(now.day + 1) % 7][0]) + '.' };
    }

    function hoursSummary() {
        return 'Monday to Friday ' + fmtTime(HOURS[1][0]) + '–' + fmtTime(HOURS[1][1]) +
            ', Saturday ' + fmtTime(HOURS[6][0]) + '–' + fmtTime(HOURS[6][1]) +
            ', Sunday ' + fmtTime(HOURS[0][0]) + '–' + fmtTime(HOURS[0][1]) + '.';
    }

    function initOpenStatus() {
        var badge = $('#open-status');
        var rows = $$('#opening-hours li[data-days]');
        if (!badge && !rows.length) { return; }

        function update() {
            var status = gymStatus();
            if (badge) {
                badge.textContent = status.text;
                badge.className = 'open-status ' + (status.open ? 'is-open-now' : 'is-closed');
            }
            var today = String(gymNow().day);
            rows.forEach(function (row) {
                row.classList.toggle('today', row.getAttribute('data-days').split(',').indexOf(today) > -1);
            });
        }

        update();
        setInterval(update, 60000); // keeps the status correct if the page stays open
    }

    /*
    SCROLL ANIMATION
    */
    function initReveal() {
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!('IntersectionObserver' in window) || reduceMotion) { return; }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        $$('section').forEach(function (section) {
            section.classList.add('reveal');
            observer.observe(section);
        });
    }

    /* 
    ACCORDION the FAQ
    */
    function initAccordion() {
        $$('.accordion').forEach(function (accordion) {
            var triggers = $$('.accordion-trigger', accordion);

            function setOpen(trigger, open) {
                var panel = document.getElementById(trigger.getAttribute('aria-controls'));
                trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
                if (panel) { panel.classList.toggle('is-open', open); }
            }

            triggers.forEach(function (trigger) {
                trigger.addEventListener('click', function () {
                    var wasOpen = trigger.getAttribute('aria-expanded') === 'true';
                    triggers.forEach(function (t) { setOpen(t, false); });
                    setOpen(trigger, !wasOpen);
                });
            });
        });
    }

    /*
    GALLERY LIGHTBOX 
     */
    function initLightbox() {
        var links = $$('a[data-lightbox]');
        if (!links.length) { return; }

        var current = 0;
        var opener = null;

        var box = make('div', 'lightbox');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-label', 'Image viewer');
        box.setAttribute('aria-hidden', 'true');

        function button(className, symbol, label) {
            var b = make('button', 'lb-btn ' + className, symbol);
            b.type = 'button';
            b.setAttribute('aria-label', label);
            return b;
        }

        var closeBtn = button('lb-close', '\u00D7', 'Close image viewer');
        var prevBtn = button('lb-prev', '\u2039', 'Previous image');
        var nextBtn = button('lb-next', '\u203A', 'Next image');
        var figure = make('figure', 'lb-figure');
        var image = document.createElement('img');
        var caption = make('figcaption', 'lb-caption');

        figure.appendChild(image);
        figure.appendChild(caption);
        box.appendChild(closeBtn);
        box.appendChild(prevBtn);
        box.appendChild(figure);
        box.appendChild(nextBtn);
        document.body.appendChild(box);

        if (links.length < 2) {
            prevBtn.hidden = true;
            nextBtn.hidden = true;
        }

        function show(index) {
            current = (index + links.length) % links.length;
            var link = links[current];
            var thumb = $('img', link);
            image.src = link.getAttribute('href');
            image.alt = thumb ? thumb.alt : '';
            caption.textContent = (link.getAttribute('data-caption') || '') +
                ' (' + (current + 1) + ' of ' + links.length + ')';
        }

        function isOpen() {
            return box.classList.contains('is-open');
        }

        function open(index) {
            opener = links[index];
            show(index);
            box.classList.add('is-open');
            box.setAttribute('aria-hidden', 'false');
            document.body.classList.add('lb-open');
            void box.offsetWidth; // apply the new visibility first, otherwise focus is ignored
            closeBtn.focus();
        }

        function close() {
            box.classList.remove('is-open');
            box.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('lb-open');
            if (opener) { opener.focus(); }
        }

        links.forEach(function (link, index) {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                open(index);
            });
        });

        closeBtn.addEventListener('click', close);
        prevBtn.addEventListener('click', function () { show(current - 1); });
        nextBtn.addEventListener('click', function () { show(current + 1); });

        // Click on the dark area closes the viewer
        box.addEventListener('click', function (event) {
            if (event.target === box || event.target === figure) { close(); }
        });

        document.addEventListener('keydown', function (event) {
            if (!isOpen()) { return; }
            if (event.key === 'Escape') {
                close();
            } else if (event.key === 'ArrowLeft') {
                show(current - 1);
            } else if (event.key === 'ArrowRight') {
                show(current + 1);
            } else if (event.key === 'Tab') {
                // keep keyboard focus inside the viewer while it is open
                var focusable = [closeBtn, prevBtn, nextBtn].filter(function (b) { return !b.hidden; });
                var first = focusable[0];
                var last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });

        // Swipe left and right on touch screens
        var touchStartX = null;
        box.addEventListener('touchstart', function (event) {
            touchStartX = event.changedTouches[0].clientX;
        }, { passive: true });
        box.addEventListener('touchend', function (event) {
            if (touchStartX === null) { return; }
            var dx = event.changedTouches[0].clientX - touchStartX;
            touchStartX = null;
            if (Math.abs(dx) > 50) { show(dx < 0 ? current + 1 : current - 1); }
        }, { passive: true });
    }

    /*
    INTERACTIVE MAP using Leaflet and OpenStreetMap
     */
    function initMap() {
        var container = document.getElementById('map');
        if (!container) { return; }

        var lat = -33.95114;
        var lng = 25.57487;
        var address = 'Mercantile Bank Plaza, Ring Rd, Greenacres, Gqeberha, 6001';
        var directionsUrl = 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;

        // If the Leaflet library could not load (e.g. offline), show a plain link instead
        if (typeof L === 'undefined') {
            var fallback = make('p', 'map-fallback', 'The interactive map could not be loaded. ');
            var link = make('a', null, 'Open our location in Google Maps');
            link.href = directionsUrl;
            fallback.appendChild(link);
            container.appendChild(fallback);
            return;
        }

        var map = L.map(container).setView([lat, lng], 15);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        var popup = make('div');
        popup.appendChild(make('strong', null, 'The Honourable'));
        popup.appendChild(document.createElement('br'));
        popup.appendChild(document.createTextNode(address));
        popup.appendChild(document.createElement('br'));
        var directions = make('a', null, 'Get directions');
        directions.href = directionsUrl;
        directions.target = '_blank';
        directions.rel = 'noopener';
        popup.appendChild(directions);

        L.marker([lat, lng], { title: 'The Honourable' }).addTo(map).bindPopup(popup).openPopup();

        // Scrolling the page should not zoom the map by accident: wheel-zoom only after a click
        map.scrollWheelZoom.disable();
        map.on('click', function () { map.scrollWheelZoom.enable(); });
        map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
    }

    /*
    BLOG SEARCH, FILTER, SORT
     */
    function initBlogFilter() {
        var section = document.getElementById('latest-articles');
        if (!section) { return; }
        var articles = $$('article', section);
        var heading = $('h2', section);
        if (articles.length < 2 || !heading) { return; }

        var categories = [];
        articles.forEach(function (article, index) {
            var categoryLine = $$('p', article).filter(function (p) {
                return /^category:/i.test(p.textContent.trim());
            })[0];
            var category = categoryLine ? categoryLine.textContent.replace(/^\s*category:\s*/i, '').trim() : 'Other';
            var title = $('h3', article).textContent.trim();
            var summary = ($$('p', article)[0] || article).textContent;

            article.setAttribute('data-category', category);
            article.setAttribute('data-title', title);
            article.setAttribute('data-order', index);
            article.setAttribute('data-search', (title + ' ' + summary + ' ' + category).replace(/\s+/g, ' ').toLowerCase());
            if (categories.indexOf(category) === -1) { categories.push(category); }
        });
        categories.sort();

        var controls = make('div', 'blog-controls');
        controls.setAttribute('role', 'search');
        controls.setAttribute('aria-label', 'Search and filter articles');
        controls.innerHTML =
            '<div class="control"><label for="blog-search">Search articles</label>' +
            '<input type="search" id="blog-search" placeholder="e.g. strength, rest, goals" autocomplete="off"></div>' +
            '<div class="control"><label for="blog-category">Category</label>' +
            '<select id="blog-category"><option value="all">All categories</option></select></div>' +
            '<div class="control"><label for="blog-sort">Sort by</label>' +
            '<select id="blog-sort"><option value="default">Default order</option>' +
            '<option value="az">Title A–Z</option><option value="za">Title Z–A</option>' +
            '<option value="category">Category</option></select></div>';

        var count = make('p', 'blog-count');
        count.setAttribute('aria-live', 'polite');

        var empty = make('p', 'blog-empty');
        empty.hidden = true;
        var emptyText = make('span');
        var clearBtn = make('button', 'blog-clear', 'Clear search and filters');
        clearBtn.type = 'button';
        empty.appendChild(emptyText);
        empty.appendChild(document.createTextNode(' '));
        empty.appendChild(clearBtn);

        heading.insertAdjacentElement('afterend', controls);
        controls.insertAdjacentElement('afterend', count);
        count.insertAdjacentElement('afterend', empty);

        var searchInput = $('#blog-search', controls);
        var categorySelect = $('#blog-category', controls);
        var sortSelect = $('#blog-sort', controls);

        categories.forEach(function (category) {
            var option = make('option', null, category);
            option.value = category;
            categorySelect.appendChild(option);
        });

        function apply() {
            var query = searchInput.value.trim();
            var q = query.toLowerCase();
            var category = categorySelect.value;
            var mode = sortSelect.value;

            var sorted = articles.slice().sort(function (a, b) {
                var titleA = a.getAttribute('data-title');
                var titleB = b.getAttribute('data-title');
                if (mode === 'az') { return titleA.localeCompare(titleB); }
                if (mode === 'za') { return titleB.localeCompare(titleA); }
                if (mode === 'category') {
                    return a.getAttribute('data-category').localeCompare(b.getAttribute('data-category')) ||
                        titleA.localeCompare(titleB);
                }
                return a.getAttribute('data-order') - b.getAttribute('data-order');
            });

            var shown = 0;
            sorted.forEach(function (article) {
                section.appendChild(article); // re-appending moves the article into its new position
                var matches = (category === 'all' || article.getAttribute('data-category') === category) &&
                    (!q || article.getAttribute('data-search').indexOf(q) > -1);
                article.hidden = !matches;
                if (matches) { shown++; }
            });

            count.textContent = 'Showing ' + shown + ' of ' + articles.length + ' articles';
            empty.hidden = shown !== 0;
            if (shown === 0) {
                emptyText.textContent = query
                    ? 'No articles match \u201C' + query + '\u201D in this category.'
                    : 'No articles in this category.';
            }
        }

        searchInput.addEventListener('input', apply);
        categorySelect.addEventListener('change', apply);
        sortSelect.addEventListener('change', apply);
        clearBtn.addEventListener('click', function () {
            searchInput.value = '';
            categorySelect.value = 'all';
            sortSelect.value = 'default';
            apply();
            searchInput.focus();
        });

        apply();
    }

    /*
    FORMS 
     */
    var MIN_AGE = 16;          // minimum age to create an account
    var MAX_VISIT_DAYS = 90;   // how far ahead a visit can be requested

    var REQUIRED_MESSAGES = {
        name: 'Please enter your name.',
        firstName: 'Please enter your first name.',
        lastName: 'Please enter your last name.',
        email: 'Please enter your email address.',
        tel: 'Please enter your phone number.',
        topic: 'Please choose what your enquiry is about.',
        messageType: 'Please choose a message type.',
        message: 'Please enter your message.',
        dob: 'Please enter your date of birth.',
        password: 'Please create a password.',
        confirmPassword: 'Please confirm your password.',
        membership: 'Please choose a membership type.',
        agree: 'You must agree before creating an account.'
    };

    // What each enquiry type costs (taken from the Products page)
    var ENQUIRY_INFO = {
        membership: 'Basic membership is R299/month (equipment, locker room and cardio room). Premium is R499/month and adds full facility access, fitness classes and a personal training consultation.',
        'personal-training': 'Personal training is R200 per session and includes one-on-one training, personal fitness goals and workout guidance.',
        classes: 'Fitness classes are included with Premium membership at R499/month.',
        products: 'Our Fitness Programme is R499 and includes a structured workout plan, progress tracking and weekly goals. We will confirm clothing sizes and prices when we reply.',
        facilities: 'Our facilities include a locker room, a cardio room and modern equipment for strength and cardio training.',
        other: 'A member of our team will read your question and reply by email.'
    };

    function validateField(field) {
        var name = field.name;
        var value = field.value.trim();

        if (field.type === 'checkbox') {
            return (field.required && !field.checked) ? (REQUIRED_MESSAGES[name] || 'This box must be ticked.') : '';
        }
        if (!value) {
            return field.required ? (REQUIRED_MESSAGES[name] || 'This field is required.') : '';
        }

        switch (name) {
            case 'name':
            case 'firstName':
            case 'lastName':
                if (value.length < 2) { return 'Please enter at least 2 characters.'; }
                if (value.length > 60) { return 'Please keep this to 60 characters or fewer.'; }
                if (!/^[A-Za-z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF' .\-]*$/.test(value)) {
                    return 'Use letters only (spaces, hyphens and apostrophes are fine).';
                }
                return '';

            case 'email':
                if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
                    return 'Enter a valid email address, for example name@example.com.';
                }
                return '';

            case 'tel':
                // allow spaces, brackets and dashes, then check the South African format
                if (!/^(\+27|0)[1-9]\d{8}$/.test(value.replace(/[\s()\-]/g, ''))) {
                    return 'Enter a valid South African number, for example 076 029 5178 or +27 76 029 5178.';
                }
                return '';

            case 'message':
                if (value.length < 10) {
                    return 'Please write at least 10 characters (you have ' + value.length + ').';
                }
                if (value.length > 500) {
                    return 'Please keep your message under 500 characters (you have ' + value.length + ').';
                }
                return '';

            case 'visitDate':
                var visit = parseISO(value);
                if (!visit) { return 'Please enter a valid date.'; }
                var today = parseISO(toISO(new Date()));
                var latest = new Date(today.getFullYear(), today.getMonth(), today.getDate() + MAX_VISIT_DAYS);
                if (visit < today) { return 'Please choose today or a future date.'; }
                if (visit > latest) { return 'Please choose a date within the next ' + MAX_VISIT_DAYS + ' days.'; }
                return '';

            case 'dob':
                var birth = parseISO(value);
                if (!birth) { return 'Please enter a valid date of birth.'; }
                var now = new Date();
                if (birth > now) { return 'Your date of birth cannot be in the future.'; }
                var age = now.getFullYear() - birth.getFullYear();
                if (now.getMonth() < birth.getMonth() ||
                    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) { age--; }
                if (age > 110) { return 'Please check the year of your date of birth.'; }
                if (age < MIN_AGE) { return 'You must be at least ' + MIN_AGE + ' years old to create an account.'; }
                return '';

            case 'password':
                if (field.value.length < 8) { return 'Your password must be at least 8 characters.'; }
                if (!/[A-Za-z]/.test(field.value) || !/\d/.test(field.value)) {
                    return 'Include at least one letter and one number.';
                }
                return '';

            case 'confirmPassword':
                if (field.value !== field.form.elements.password.value) { return 'The passwords do not match.'; }
                return '';

            default:
                return '';
        }
    }

    // Show the error message directly under a field
    function setError(field, message) {
        var id = field.id + '-error';
        var box = document.getElementById(id);

        if (message) {
            if (!box) {
                box = make('span', 'field-error');
                box.id = id;
                box.setAttribute('role', 'alert');
                var anchor = field.type === 'checkbox' ? (field.closest('.checkbox-row') || field) : field;
                anchor.insertAdjacentElement('afterend', box);
            }
            box.textContent = message;
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', id);
        } else {
            if (box) { box.remove(); }
            field.removeAttribute('aria-invalid');
            field.removeAttribute('aria-describedby');
        }
    }

    // The message panel shown under a form after submitting
    function showResult(form, type, headingText, lines, focusPanel) {
        var id = form.getAttribute('data-validate') + '-result';
        var panel = document.getElementById(id);
        if (!panel) {
            panel = make('div');
            panel.id = id;
            panel.setAttribute('role', 'status');
            panel.setAttribute('tabindex', '-1');
            form.insertAdjacentElement('afterend', panel);
        }
        panel.className = 'form-result ' + (type === 'error' ? 'is-error' : 'is-success');
        panel.textContent = '';
        if (headingText) { panel.appendChild(make('h3', null, headingText)); }
        (lines || []).forEach(function (line) {
            var p = make('p');
            if (typeof line === 'string') {
                p.textContent = line;
            } else {
                p.appendChild(make('strong', null, line.label + ' '));
                p.appendChild(document.createTextNode(line.text));
            }
            panel.appendChild(p);
        });
        if (focusPanel) {
            panel.focus();
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return panel;
    }

    function clearResult(form) {
        var panel = document.getElementById(form.getAttribute('data-validate') + '-result');
        if (panel) { panel.remove(); }
    }

    function sendAjax(form, data) {
        var endpoint = form.getAttribute('data-endpoint');
        if (!endpoint) { return Promise.resolve(); }
        var payload = {};
        Object.keys(data).forEach(function (key) {
            if (key !== 'password' && key !== 'confirmPassword') { payload[key] = data[key]; } // never send passwords
        });
        return fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        }).then(function (response) {
            if (!response.ok) { throw new Error('Request failed (' + response.status + ')'); }
        });
    }

    var SUBMIT_HANDLERS = {
        enquiry: function (form, data) {
            return sendAjax(form, data).then(function () {
                var status = gymStatus();
                var lines = [
                    'We have received your enquiry about \u201C' + data.topicLabel + '\u201D and will reply to ' + data.email + '.',
                    { label: 'Cost:', text: ENQUIRY_INFO[data.topic] || ENQUIRY_INFO.other },
                    { label: 'Availability:', text: status.text + ' Our hours are ' + hoursSummary() }
                ];
                var visit = data.visitDate ? parseISO(data.visitDate) : null;
                if (visit) {
                    var h = HOURS[visit.getDay()];
                    lines.push({
                        label: 'Your visit:',
                        text: visit.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
                            ' \u2013 we are open from ' + fmtTime(h[0]) + ' to ' + fmtTime(h[1]) + ' that day. We will confirm by email.'
                    });
                }
                showResult(form, 'success', 'Thank you, ' + data.name.split(' ')[0] + '!', lines, true);
            });
        },

        contact: function (form, data) {
            // Compile the details into an email to the address in the form's action="mailto:..."
            var recipient = form.getAttribute('action').replace(/^mailto:/i, '');
            var subject = '[' + data.messageTypeLabel + '] Message from ' + data.name;
            var body = 'Name: ' + data.name + '\n' +
                'Email: ' + data.email + '\n' +
                'Phone: ' + data.tel + '\n' +
                'Message type: ' + data.messageTypeLabel + '\n\n' +
                data.message;
            var mailto = 'mailto:' + recipient + '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(body.replace(/\n/g, '\r\n'));

            var panel = showResult(form, 'success', 'Your email is ready, ' + data.name.split(' ')[0] + '!', [
                'Your email app should now open with your message addressed to ' + recipient + '. Press send there to finish.'
            ], true);
            var fallback = make('p');
            fallback.appendChild(document.createTextNode('Nothing happened? '));
            var link = make('a', null, 'Click here to open the email again');
            link.href = mailto;
            fallback.appendChild(link);
            fallback.appendChild(document.createTextNode('.'));
            panel.appendChild(fallback);

            window.location.href = mailto;
            return Promise.resolve();
        },

        signup: function (form, data) {
            return sendAjax(form, data).then(function () {
                showResult(form, 'success', 'Welcome to The Honourable, ' + data.firstName + '!', [
                    'Your ' + data.membershipLabel + ' membership sign-up has been received. We will send a confirmation to ' + data.email + '.'
                ], true);
            });
        },

        newsletter: function (form, data) {
            return sendAjax(form, data).then(function () {
                showResult(form, 'success', 'Thanks for subscribing!', [
                    'We will send new fitness articles and updates to ' + data.email + '.'
                ], false);
            });
        }
    };

    function initForms() {
        $$('form[data-validate]').forEach(function (form) {
            var type = form.getAttribute('data-validate');

            form.noValidate = true;

            var fields = $$('input, select, textarea', form).filter(function (f) {
                return f.name && f.type !== 'submit' && f.type !== 'hidden';
            });

            fields.forEach(function (field) {
                if (!field.id) { field.id = type + '-' + field.name; }
            });

            // Sensible date limits
            var visitField = form.elements.visitDate;
            if (visitField) {
                var t = new Date();
                visitField.min = toISO(t);
                visitField.max = toISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() + MAX_VISIT_DAYS));
            }
            var dobField = form.elements.dob;
            if (dobField) {
                var n = new Date();
                dobField.max = toISO(n);
                dobField.min = toISO(new Date(n.getFullYear() - 110, n.getMonth(), n.getDate()));
            }

            // Live character counter for message boxes
            fields.forEach(function (field) {
                if (field.tagName === 'TEXTAREA' && field.maxLength > 0) {
                    var counter = make('small', 'char-count');
                    counter.setAttribute('aria-hidden', 'true');
                    field.insertAdjacentElement('afterend', counter);
                    var update = function () { counter.textContent = field.value.length + ' / ' + field.maxLength + ' characters'; };
                    field.addEventListener('input', update);
                    form.addEventListener('reset', function () { setTimeout(update, 0); });
                    update();
                }
            });

            // Validate as the user moves through the form.
            var pressingSubmit = false;
            form.addEventListener('pointerdown', function (event) {
                if (event.target.closest && event.target.closest('button[type="submit"]')) { pressingSubmit = true; }
            });
            document.addEventListener('pointerup', function () {
                setTimeout(function () { pressingSubmit = false; }, 0);
            });

            fields.forEach(function (field) {
                function check() {
                    if (pressingSubmit) { return; }
                    field.setAttribute('data-touched', 'true');
                    setError(field, validateField(field));
                }
                field.addEventListener('blur', check);
                field.addEventListener('change', check);
                field.addEventListener('input', function () {
                    if (field.getAttribute('data-touched')) { setError(field, validateField(field)); }
                    // if the password changes, re-check the confirmation too
                    if (field.name === 'password' && form.elements.confirmPassword &&
                        form.elements.confirmPassword.getAttribute('data-touched')) {
                        setError(form.elements.confirmPassword, validateField(form.elements.confirmPassword));
                    }
                });
            });

            form.addEventListener('submit', function (event) {
                event.preventDefault();
                clearResult(form);

                var firstInvalid = null;
                var invalidCount = 0;
                fields.forEach(function (field) {
                    field.setAttribute('data-touched', 'true');
                    var message = validateField(field);
                    setError(field, message);
                    if (message) {
                        invalidCount++;
                        if (!firstInvalid) { firstInvalid = field; }
                    }
                });

                if (firstInvalid) {
                    showResult(form, 'error', null, [
                        'Please fix ' + (invalidCount === 1 ? 'the highlighted field' : 'the ' + invalidCount + ' highlighted fields') + ' and try again.'
                    ], false);
                    firstInvalid.focus();
                    return;
                }

                // Gather the values
                var data = {};
                fields.forEach(function (field) {
                    data[field.name] = field.type === 'checkbox' ? field.checked : field.value.trim();
                    if (field.tagName === 'SELECT') {
                        data[field.name + 'Label'] = field.options[field.selectedIndex].text;
                    }
                });

                var submitBtn = $('button[type="submit"]', form);
                var originalLabel = submitBtn ? submitBtn.textContent : '';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Sending\u2026';
                }

                SUBMIT_HANDLERS[type](form, data).then(function () {
                    form.reset();
                    fields.forEach(function (field) {
                        field.removeAttribute('data-touched');
                        setError(field, '');
                    });
                }).catch(function () {
                    showResult(form, 'error', 'Something went wrong', [
                        'We could not send your details just now. Please check your connection and try again.'
                    ], true);
                }).then(function () {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalLabel;
                    }
                });
            });
        });
    }

    /*
    START
    */
    initOpenStatus();
    initAccordion();
    initLightbox();
    initMap();
    initBlogFilter();
    initForms();
    initReveal();
}());
