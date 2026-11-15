/* Mazen Mahmoud — progressively enhanced résumé interactions. */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var mobileNav = window.matchMedia('(max-width: 768px)');
    var header = document.getElementById('site-header');
    var tablist = document.querySelector('[role="tablist"]');
    var tabs = tablist ? Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]')) : [];

    function onMediaChange(query, callback) {
        if (query.addEventListener) query.addEventListener('change', callback);
        else query.addListener(callback);
    }

    function findHashTarget() {
        try {
            return document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
        } catch (error) {
            return null;
        }
    }

    function tabForTarget(target) {
        if (!target) return null;
        return tabs.find(function (tab) {
            var panel = document.getElementById(tab.getAttribute('aria-controls'));
            return target === tab || (panel && panel.contains(target));
        });
    }

    function updateTabOrientation() {
        if (tablist) tablist.setAttribute('aria-orientation', 'horizontal');
    }

    function selectTab(tab, options) {
        if (!tab || tabs.indexOf(tab) === -1) return;
        options = options || {};

        tabs.forEach(function (item) {
            var selected = item === tab;
            var panel = document.getElementById(item.getAttribute('aria-controls'));
            item.setAttribute('aria-selected', String(selected));
            item.tabIndex = selected ? 0 : -1;
            if (panel) {
                panel.hidden = !selected;
                panel.classList.toggle('is-active', selected);
            }
        });

        var panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (options.history && panel) {
            var hash = '#' + encodeURIComponent(panel.id);
            if (window.location.hash !== hash) {
                // Arrow-key exploration replaces the entry; clicks can be undone with Back.
                try {
                    window.history[options.history + 'State']({ resumeTab: panel.id }, '', hash);
                } catch (error) {
                    // Tabs remain usable when history writes are unavailable in a file preview.
                }
            }
        }

        if (options.reveal && panel) {
            var panelTop = panel.getBoundingClientRect().top;
            var offset = (header ? header.offsetHeight : 0) + 24;
            if (panelTop < offset) {
                window.scrollTo({
                    top: Math.max(0, window.scrollY + panelTop - offset),
                    behavior: reduceMotion.matches ? 'instant' : 'smooth'
                });
            }
        }

        requestScrollFrame();
    }

    if (tablist && tabs.length) {
        tablist.addEventListener('click', function (event) {
            var tab = event.target.closest('[role="tab"]');
            if (tab && tablist.contains(tab)) selectTab(tab, { history: 'push', reveal: true });
        });

        tablist.addEventListener('keydown', function (event) {
            var current = tabs.indexOf(document.activeElement);
            if (current === -1 || event.altKey || event.ctrlKey || event.metaKey) return;

            var next;
            var forward = 'ArrowRight';
            var backward = 'ArrowLeft';
            if (event.key === forward) next = (current + 1) % tabs.length;
            else if (event.key === backward) next = (current - 1 + tabs.length) % tabs.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = tabs.length - 1;
            else return;

            event.preventDefault();
            tabs[next].focus({ preventScroll: true });
            selectTab(tabs[next], { history: 'replace', reveal: true });
        });

        updateTabOrientation();
        selectTab(tabForTarget(findHashTarget()) || tabs.find(function (tab) {
            return tab.getAttribute('aria-selected') === 'true';
        }) || tabs[0]);
    }

    // Preserve the original public API, including IDs that contain selector characters.
    window.toggleSection = function (sectionId) {
        var tab = tabs.find(function (item) { return item.getAttribute('aria-controls') === sectionId; });
        selectTab(tab, { history: 'push', reveal: true });
    };

    function followHash() {
        var target = findHashTarget();
        var tab = tabForTarget(target);
        if (!tab) return;
        selectTab(tab);
        // Open hidden panels before the browser tries to reach their fragment.
        window.requestAnimationFrame(function () {
            target.scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'instant' : 'smooth' });
        });
    }

    window.addEventListener('hashchange', followHash);
    window.addEventListener('popstate', function (event) {
        if (tabForTarget(findHashTarget()) || !event.state || !event.state.resumeTab) return;
        selectTab(tabs.find(function (tab) {
            return tab.getAttribute('aria-controls') === event.state.resumeTab;
        }));
    });
    document.addEventListener('click', function (event) {
        var link = event.target.closest('a[href^="#"]');
        if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var target;
        try { target = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1))); }
        catch (error) { return; }
        var tab = tabForTarget(target);
        if (tab) selectTab(tab);
    });

    /* Mobile navigation stays out of the keyboard order while collapsed. */
    var navToggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');
    var lastNavFocus = null;

    function setNav(open) {
        if (!navToggle || !nav) return;
        open = Boolean(open && mobileNav.matches);
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
        nav.classList.toggle('is-open', open);
        nav.inert = mobileNav.matches && !open;
    }

    if (navToggle && nav) {
        navToggle.addEventListener('click', function () {
            setNav(navToggle.getAttribute('aria-expanded') !== 'true');
        });

        nav.addEventListener('click', function (event) {
            var link = event.target.closest('a, button');
            if (!link || !mobileNav.matches) return;
            setNav(false);
            // Move focus out of the collapsed menu and onto the selected destination.
            if (link.getAttribute('href') && link.getAttribute('href').charAt(0) === '#') {
                var target = document.getElementById(link.getAttribute('href').slice(1));
                if (target) {
                    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
                    target.focus({ preventScroll: true });
                    return;
                }
            }
            navToggle.focus({ preventScroll: true });
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
                setNav(false);
                navToggle.focus({ preventScroll: true });
            }
        });

        document.addEventListener('click', function (event) {
            if (!event.target.closest('.site-header')) {
                lastNavFocus = null;
                if (navToggle.getAttribute('aria-expanded') === 'true') setNav(false);
            }
        });

        document.addEventListener('focusin', function (event) {
            lastNavFocus = event.target === navToggle || nav.contains(event.target) ? event.target : null;
            if (navToggle.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) {
                setNav(false);
            }
        });

        onMediaChange(mobileNav, function () {
            var focusedControl = document.activeElement;
            // CSS can hide a focused control before the media-query callback runs.
            if (focusedControl === document.body || focusedControl === document.documentElement) {
                focusedControl = lastNavFocus;
            }
            var focusedNav = Boolean(focusedControl && nav.contains(focusedControl));
            var focusedToggle = focusedControl === navToggle;
            setNav(false);
            if (mobileNav.matches && focusedNav) {
                navToggle.focus({ preventScroll: true });
            } else if (!mobileNav.matches && focusedToggle) {
                var destination = nav.querySelector('[aria-current="location"]') || nav.querySelector('a, button');
                if (destination) destination.focus({ preventScroll: true });
            }
        });
        setNav(false);
    }

    /* Header, progress and current section share one animation frame per scroll. */
    var progressBar = document.querySelector('.scroll-progress__bar');
    var needsProgressFallback = progressBar &&
        !(window.CSS && window.CSS.supports && window.CSS.supports('animation-timeline', 'scroll()'));
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link[href^="#"]'));
    var watched = navLinks.map(function (link) {
        var target = document.getElementById(link.getAttribute('href').slice(1));
        return target ? { link: link, target: target } : null;
    }).filter(Boolean);
    var ticking = false;

    function onScrollFrame() {
        ticking = false;
        if (header) header.classList.toggle('is-stuck', window.scrollY > 8);

        var max = document.documentElement.scrollHeight - window.innerHeight;
        // Reduced-motion CSS disables the native scroll animation, so update it directly.
        if (progressBar && (needsProgressFallback || reduceMotion.matches)) {
            var ratio = max > 0 ? Math.max(0, Math.min(window.scrollY / max, 1)) : 0;
            progressBar.style.transform = 'scaleX(' + ratio + ')';
        }

        if (watched && watched.length) {
            var current = watched[0];
            var threshold = (header ? header.offsetHeight : 0) + 80;
            watched.forEach(function (item) {
                if (item.target.getBoundingClientRect().top <= threshold) current = item;
            });
            if (max > 0 && window.scrollY >= max - 8) current = watched[watched.length - 1];
            navLinks.forEach(function (link) {
                var selected = link === current.link;
                link.classList.toggle('is-active', selected);
                if (selected) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
        }
    }

    function requestScrollFrame() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(onScrollFrame);
    }

    window.addEventListener('scroll', requestScrollFrame, { passive: true });
    window.addEventListener('resize', requestScrollFrame, { passive: true });
    window.addEventListener('load', requestScrollFrame);

    /* Reveals are decorative; the stylesheet keeps the content readable. */
    var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    var revealObserver;

    function revealAll() {
        revealItems.forEach(function (item) { item.classList.add('is-visible'); });
        if (revealObserver) revealObserver.disconnect();
    }

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
        revealAll();
    } else if (revealItems.length) {
        revealObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -4% 0px', threshold: 0.05 });
        revealItems.forEach(function (item) { revealObserver.observe(item); });
    }
    onMediaChange(reduceMotion, function () {
        if (reduceMotion.matches) revealAll();
        requestScrollFrame();
    });
    window.addEventListener('beforeprint', revealAll);

    var avatar = document.querySelector('[data-avatar]');
    var avatarImg = avatar && avatar.querySelector('img');
    function useMonogram() {
        if (avatar) avatar.classList.add('is-fallback');
        if (avatarImg) avatarImg.remove();
    }
    if (avatarImg) {
        avatarImg.addEventListener('error', useMonogram);
        if (avatarImg.complete && avatarImg.naturalWidth === 0) useMonogram();
    }

    document.querySelectorAll('[data-print]').forEach(function (button) {
        button.addEventListener('click', function () { window.print(); });
    });
    document.querySelectorAll('[data-year]').forEach(function (item) {
        item.textContent = String(new Date().getFullYear());
    });

    // Enhance only after controls are wired; a missing script leaves every section accessible.
    document.documentElement.classList.add('js');
    var selectedTab = tabs.find(function (tab) { return tab.getAttribute('aria-selected') === 'true'; });
    if (selectedTab) {
        try {
            window.history.replaceState({ resumeTab: selectedTab.getAttribute('aria-controls') }, '', window.location.href);
        } catch (error) {
            // Selection still works when the host preview disables history writes.
        }
    }
    onScrollFrame();
    if (tabForTarget(findHashTarget())) followHash();
}());
