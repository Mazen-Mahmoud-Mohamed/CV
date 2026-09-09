/* ==========================================================================
   Mazen Mahmoud — CV interactions
   Tabs, sticky header, scroll-spy, mobile nav, scroll reveals, avatar fallback.
   Everything degrades gracefully: without JS the page stays fully readable.
   ========================================================================== */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var header = document.getElementById('site-header');

    /* ----------------------------------------------------------------------
       Résumé tabs
       A global `toggleSection(id)` is kept so the previous inline API still works.
       ---------------------------------------------------------------------- */
    var tablist = document.querySelector('[role="tablist"]');
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));

    function selectTab(tab) {
        if (!tab) return;

        tabs.forEach(function (item) {
            var isSelected = item === tab;
            var panel = document.getElementById(item.getAttribute('aria-controls'));

            item.setAttribute('aria-selected', String(isSelected));
            item.tabIndex = isSelected ? 0 : -1;

            if (!panel) return;
            panel.hidden = !isSelected;
            panel.classList.remove('is-active');

            if (isSelected) {
                // Force a reflow so the entry animation replays on every switch.
                void panel.offsetWidth;
                panel.classList.add('is-active');
            }
        });

        // Keep the active tab in view inside the scrollable strip.
        if (tablist && tablist.scrollWidth > tablist.clientWidth) {
            tab.scrollIntoView({
                behavior: reduceMotion.matches ? 'auto' : 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }

        // A shorter panel can leave the viewport stranded below the content,
        // so pull the tab strip back under the header when it has scrolled off.
        if (tablist) {
            var headerHeight = header ? header.offsetHeight : 0;
            var offset = tablist.getBoundingClientRect().top - headerHeight - 16;
            if (offset < 0) {
                window.scrollTo({
                    top: window.scrollY + offset,
                    behavior: reduceMotion.matches ? 'auto' : 'smooth'
                });
            }
        }
    }

    // Edge fades hint that the strip scrolls horizontally on narrow screens.
    function updateTabFades() {
        var scrollable = tablist.scrollWidth - tablist.clientWidth;
        tablist.classList.toggle('has-fade-start', tablist.scrollLeft > 4);
        tablist.classList.toggle('has-fade-end', scrollable > 4 && tablist.scrollLeft < scrollable - 4);
    }

    if (tablist) {
        tablist.addEventListener('click', function (event) {
            var tab = event.target.closest('[role="tab"]');
            if (tab) selectTab(tab);
        });

        tablist.addEventListener('keydown', function (event) {
            var current = tabs.indexOf(document.activeElement);
            if (current === -1) return;

            var next = null;
            switch (event.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    next = (current + 1) % tabs.length;
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    next = (current - 1 + tabs.length) % tabs.length;
                    break;
                case 'Home':
                    next = 0;
                    break;
                case 'End':
                    next = tabs.length - 1;
                    break;
                default:
                    return;
            }

            event.preventDefault();
            tabs[next].focus();
            selectTab(tabs[next]);
        });

        tablist.addEventListener('scroll', updateTabFades, { passive: true });
        window.addEventListener('resize', updateTabFades, { passive: true });
        updateTabFades();
    }

    window.toggleSection = function (sectionId) {
        selectTab(document.getElementById('tab-' + sectionId) ||
            document.querySelector('[aria-controls="' + sectionId + '"]'));
    };

    /* ----------------------------------------------------------------------
       Mobile navigation
       ---------------------------------------------------------------------- */
    var navToggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');

    function setNav(open) {
        if (!navToggle || !nav) return;
        navToggle.setAttribute('aria-expanded', String(open));
        nav.classList.toggle('is-open', open);
    }

    if (navToggle && nav) {
        navToggle.addEventListener('click', function () {
            setNav(navToggle.getAttribute('aria-expanded') !== 'true');
        });

        nav.addEventListener('click', function (event) {
            if (event.target.closest('a, button')) setNav(false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
                setNav(false);
                navToggle.focus();
            }
        });

        document.addEventListener('click', function (event) {
            if (navToggle.getAttribute('aria-expanded') !== 'true') return;
            if (!event.target.closest('.site-header')) setNav(false);
        });

        // Reset state when growing past the mobile breakpoint.
        window.matchMedia('(min-width: 769px)').addEventListener('change', function (event) {
            if (event.matches) setNav(false);
        });
    }

    /* ----------------------------------------------------------------------
       Sticky header state + scroll progress fallback
       ---------------------------------------------------------------------- */
    var progressBar = document.querySelector('.scroll-progress__bar');
    var needsProgressFallback = progressBar &&
        !(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()'));
    var ticking = false;

    function onScrollFrame() {
        ticking = false;

        if (header) header.classList.toggle('is-stuck', window.scrollY > 8);

        if (needsProgressFallback) {
            var max = document.documentElement.scrollHeight - window.innerHeight;
            var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
            progressBar.style.transform = 'scaleX(' + ratio + ')';
        }
    }

    function requestScrollFrame() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(onScrollFrame);
    }

    window.addEventListener('scroll', requestScrollFrame, { passive: true });
    window.addEventListener('resize', requestScrollFrame, { passive: true });
    onScrollFrame();

    /* ----------------------------------------------------------------------
       Scroll-spy for the primary navigation
       ---------------------------------------------------------------------- */
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
    var watched = navLinks
        .map(function (link) {
            var id = link.getAttribute('href').slice(1);
            var target = document.getElementById(id);
            return target ? { link: link, target: target } : null;
        })
        .filter(Boolean);

    if (watched.length && 'IntersectionObserver' in window) {
        // Sections are tall, so track the band just below the header.
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var match = watched.find(function (item) { return item.target === entry.target; });
                if (!match) return;
                navLinks.forEach(function (link) { link.classList.remove('is-active'); });
                match.link.classList.add('is-active');
            });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

        watched.forEach(function (item) { spy.observe(item.target); });
    }

    /* ----------------------------------------------------------------------
       Scroll reveals
       ---------------------------------------------------------------------- */
    var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
        revealItems.forEach(function (el) { el.classList.add('is-visible'); });
    } else if (revealItems.length) {
        var groups = new Map();
        revealItems.forEach(function (el) {
            var parent = el.parentElement;
            var index = groups.get(parent) || 0;
            el.style.setProperty('--reveal-delay', Math.min(index, 5) * 60 + 'ms');
            groups.set(parent, index + 1);
        });

        var revealObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

        revealItems.forEach(function (el) { revealObserver.observe(el); });
    }

    /* ----------------------------------------------------------------------
       Avatar fallback — the portrait file is optional
       ---------------------------------------------------------------------- */
    var avatar = document.querySelector('[data-avatar]');
    var avatarImg = avatar && avatar.querySelector('img');

    function useMonogram() {
        if (!avatar) return;
        avatar.classList.add('is-fallback');
        if (avatarImg) avatarImg.remove();
    }

    if (avatarImg) {
        avatarImg.addEventListener('error', useMonogram);
        if (avatarImg.complete && avatarImg.naturalWidth === 0) useMonogram();
    }

    /* ----------------------------------------------------------------------
       Misc
       ---------------------------------------------------------------------- */
    document.querySelectorAll('[data-print]').forEach(function (button) {
        button.addEventListener('click', function () { window.print(); });
    });

    document.querySelectorAll('[data-year]').forEach(function (el) {
        el.textContent = String(new Date().getFullYear());
    });
}());
