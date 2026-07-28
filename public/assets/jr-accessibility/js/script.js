/**
 * jr-accessibility - script.js
 *
 * Combined JavaScript for:
 * - Accessibility settings engine (voice mode, magnifier, virtual keyboard, etc.)
 * - Floating panel controllers (quick access, social media drawers)
 * - Feedback form (rating slider, captcha, submission)
 * - Mobile FAB sheet toggle
 *
 * DEPENDENCIES (must be loaded before this file):
 * - Bootstrap 5 JS bundle (for modal, offcanvas)
 * - ResponsiveVoice.js (for TTS voice mode)
 *
 * GLOBAL VARIABLES (must be defined before this file):
 * - siteUrl (string) – base URL for AJAX requests, e.g. "https://example.com/"
 */

/* =====================================================================
   PART 1: ACCESSIBILITY SETTINGS ENGINE
   ===================================================================== */
(function () {
    const root = document.body;
    const scope = document;
    const container = document.querySelector('.jr-page-root') || document;

    const MAGNIFIER_SIZE = 220;
    const MAGNIFIER_SCALE = 1.75;

    /* ===== Persistence ===== */
    const STORAGE_KEY = 'jrAccState';
    const DEFAULT_STATE = {
        voiceMode: false,
        textSize: 100,
        lineHeight: 1.6,
        textSpacing: 'normal',
        textAlign: 'left',
        boldText: false,
        readingGuide: false,
        monochrome: false,
        highContrast: false,
        largeCursor: false,
        animationsDisabled: false,
        hideImages: false,
        magnifyMode: false,
        virtualKeyboard: false,
        hideDescription: false
    };

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULT_STATE };
            const obj = JSON.parse(raw);
            return { ...DEFAULT_STATE, ...obj };
        } catch { return { ...DEFAULT_STATE }; }
    }
    let state = loadState();

    let saveTick = 0;
    function saveState() {
        if (saveTick) cancelAnimationFrame(saveTick);
        saveTick = requestAnimationFrame(() => {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { }
            saveTick = 0;
        });
    }

    /* ===== Helper & util (scoped) ===== */
    const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)(\?.*)?$/i;
    const q = sel => scope.querySelector(sel);
    const qa = sel => scope.querySelectorAll(sel);

    const EDITABLE_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'time', 'datetime-local']);
    const NON_TEXT_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'checkbox', 'radio', 'hidden', 'color', 'file', 'range']);
    let virtualKeyboardEl = q('#jrVirtualKeyboard');
    let virtualKeyboardShift = false;

    /* ===== Footer Protection =====
       The jr-menu-footer must always exist inside the accessibility menu
       and must not be editable/removeable by user scripts. We freeze its
       attributes so its href/text cannot be tampered with, and a
       MutationObserver re-inserts it if any script removes it from the DOM.
    */
    const FOOTER_TEMPLATE_HTML =
        '<a class="jr-menu-footer__link" href="https://github.com/januriawan/jr-accessibility" target="_blank" rel="noopener noreferrer">' +
            '<i class="bi bi-github me-1"></i>© jr-accessibility' +
        '</a>';
    const FOOTER_LINK_URL = 'https://github.com/januriawan/jr-accessibility';

    function getFooterEl() {
        const menu = q('.jr-accessibility-menu');
        if (!menu) return null;
        return menu.querySelector(':scope > footer.jr-menu-footer');
    }

    function ensureFooter() {
        const menu = q('.jr-accessibility-menu');
        if (!menu) return null;

        let footer = getFooterEl();
        if (!footer) {
            footer = document.createElement('footer');
            footer.className = 'jr-menu-footer';
            footer.setAttribute('data-jr-protected', 'footer');
            footer.innerHTML = FOOTER_TEMPLATE_HTML;
            menu.appendChild(footer);
        } else {
            // Re-append to keep it at the very end (in case something moved it)
            if (footer !== menu.lastElementChild) menu.appendChild(footer);
        }

        // Freeze footer & link attributes against tampering
        const link = footer.querySelector('.jr-menu-footer__link');
        if (link) {
            link.setAttribute('href', FOOTER_LINK_URL);
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
            link.setAttribute('data-jr-protected', 'footer-link');
        }
        return footer;
    }

    function startFooterProtection() {
        ensureFooter();
        const menu = q('.jr-accessibility-menu');
        if (!menu || menu.__jrFooterObserver) return;
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                // If the footer was removed, re-create it
                if (m.removedNodes && m.removedNodes.length) {
                    for (const node of m.removedNodes) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('jr-menu-footer')) {
                            ensureFooter();
                            return;
                        }
                    }
                }
                // If href was tampered with, restore it
                const link = menu.querySelector('.jr-menu-footer__link');
                if (link && link.getAttribute('href') !== FOOTER_LINK_URL) {
                    link.setAttribute('href', FOOTER_LINK_URL);
                }
            }
        });
        observer.observe(menu, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'target', 'rel'] });
        menu.__jrFooterObserver = observer;
    }
    let lastEditableElement = null;

    function isImageSrcFormat(src = '') {
        try {
            if (!src) return false;
            return src.startsWith('data:image/') || src.startsWith('blob:') || IMAGE_EXT_RE.test(src);
        } catch { return false; }
    }
    function extractUrlFromBg(bg) {
        if (!bg || bg === 'none') return [];
        const urls = []; const rg = /url\((['"]?)(.*?)\1\)/g; let m;
        while ((m = rg.exec(bg)) !== null) urls.push(m[2]);
        return urls;
    }
    function isImageUrlFormat(url = '') {
        try {
            if (!url) return false;
            return url.startsWith('data:image/') || url.startsWith('blob:') || IMAGE_EXT_RE.test(url);
        } catch { return false; }
    }
    function inHeaderFooter(el) {
        return !!el.closest('.jr-site-header, .jr-site-footer');
    }

    function hideAllImagesAndBackgrounds() {
        container.querySelectorAll('img').forEach(img => {
            if (inHeaderFooter(img)) return;
            if (isImageSrcFormat(img.currentSrc || img.src)) {
                if (!img.dataset.accHiddenImg) {
                    img.dataset.accHiddenImg = '1';
                    img.dataset.accOldDisplay = img.style.display || '';
                    img.style.display = 'none';
                }
            }
        });
        container.querySelectorAll('picture').forEach(pic => {
            if (inHeaderFooter(pic)) return;
            if (!pic.dataset.accHiddenPic) {
                pic.dataset.accHiddenPic = '1';
                pic.dataset.accOldDisplay = pic.style.display || '';
                pic.style.display = 'none';
            }
        });
        container.querySelectorAll('*').forEach(el => {
            if (inHeaderFooter(el)) return;
            const cs = getComputedStyle(el);
            const bg = cs.backgroundImage;
            if (bg && bg !== 'none') {
                const urls = extractUrlFromBg(bg);
                if (urls.some(isImageUrlFormat)) {
                    if (!el.dataset.accBgHidden) {
                        el.dataset.accBgHidden = '1';
                        el.dataset.accOldBg = el.style.backgroundImage || '';
                        el.style.setProperty('background-image', 'none', 'important');
                    }
                }
            }
        });
    }
    function restoreAllImagesAndBackgrounds() {
        container.querySelectorAll('[data-acc-hidden-img="1"]').forEach(img => {
            img.style.display = img.dataset.accOldDisplay || '';
            delete img.dataset.accOldDisplay;
            delete img.dataset.accHiddenImg;
        });
        container.querySelectorAll('[data-acc-hidden-pic="1"]').forEach(pic => {
            pic.style.display = pic.dataset.accOldDisplay || '';
            delete pic.dataset.accOldDisplay;
            delete pic.dataset.accHiddenPic;
        });
        container.querySelectorAll('[data-acc-bg-hidden="1"]').forEach(el => {
            const old = el.dataset.accOldBg ?? '';
            if (old) el.style.setProperty('background-image', old);
            else el.style.removeProperty('background-image');
            delete el.dataset.accOldBg;
            delete el.dataset.accBgHidden;
        });
    }

    function isEditableElement(el) {
        if (!el || el.disabled) return false;
        const tag = el.tagName;
        if (tag === 'TEXTAREA') return !el.readOnly;
        if (tag === 'INPUT') {
            const type = (el.type || 'text').toLowerCase();
            if (NON_TEXT_INPUT_TYPES.has(type)) return false;
            if (el.readOnly) return false;
            return EDITABLE_INPUT_TYPES.has(type) || !NON_TEXT_INPUT_TYPES.has(type);
        }
        if (el.isContentEditable) return true;
        return false;
    }

    function rememberEditable(el) {
        if (isEditableElement(el)) lastEditableElement = el;
    }

    function getEditableTarget() {
        const active = document.activeElement;
        if (isEditableElement(active)) return active;
        if (lastEditableElement && root.contains(lastEditableElement)) return lastEditableElement;
        return null;
    }

    function focusEditableTarget(target) {
        if (!target) return null;
        if (typeof target.focus === 'function') {
            try { target.focus({ preventScroll: true }); }
            catch { target.focus(); }
        }
        return target;
    }

    function ensureEditableTargetFocus() {
        const target = getEditableTarget();
        if (!target) return null;
        focusEditableTarget(target);
        rememberEditable(target);
        return target;
    }

    function dispatchInputEvent(el) {
        if (!el) return;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function insertTextAtCursor(target, text) {
        if (!target || !text) return;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            const value = target.value ?? '';
            const start = target.selectionStart ?? value.length;
            const end = target.selectionEnd ?? start;
            const newValue = value.slice(0, start) + text + value.slice(end);
            target.value = newValue;
            const pos = start + text.length;
            if (typeof target.setSelectionRange === 'function') {
                target.setSelectionRange(pos, pos);
            }
            dispatchInputEvent(target);
            return;
        }
        if (target.isContentEditable) {
            focusEditableTarget(target);
            try { document.execCommand('insertText', false, text); }
            catch {
                const sel = window.getSelection();
                if (!sel) return;
                if (!sel.rangeCount) {
                    const range = document.createRange();
                    range.selectNodeContents(target);
                    range.collapse(false);
                    sel.addRange(range);
                }
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const node = document.createTextNode(text);
                range.insertNode(node);
                range.setStartAfter(node);
                range.setEndAfter(node);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }

    function deleteCharacterAtCursor(target) {
        if (!target) return;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            const value = target.value ?? '';
            let start = target.selectionStart ?? value.length;
            const end = target.selectionEnd ?? start;
            if (start === end && start === 0) return;
            if (start === end) start = Math.max(0, start - 1);
            const newValue = value.slice(0, start) + value.slice(end);
            target.value = newValue;
            if (typeof target.setSelectionRange === 'function') {
                target.setSelectionRange(start, start);
            }
            dispatchInputEvent(target);
            return;
        }
        if (target.isContentEditable) {
            focusEditableTarget(target);
            try { document.execCommand('delete', false, null); }
            catch {
                const sel = window.getSelection();
                if (!sel || !sel.rangeCount) return;
                const range = sel.getRangeAt(0);
                if (range.collapsed) {
                    if (range.startOffset === 0) return;
                    range.setStart(range.startContainer, Math.max(0, range.startOffset - 1));
                }
                range.deleteContents();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }

    function clearEditableValue(target) {
        if (!target) return;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            target.value = '';
            if (typeof target.setSelectionRange === 'function') {
                target.setSelectionRange(0, 0);
            }
            dispatchInputEvent(target);
            return;
        }
        if (target.isContentEditable) {
            target.innerHTML = '';
            focusEditableTarget(target);
        }
    }

    function updateVirtualKeyboardShiftVisual() {
        if (!virtualKeyboardEl) return;
        const shiftBtn = virtualKeyboardEl.querySelector('[data-action="virtualShift"]');
        if (shiftBtn) shiftBtn.classList.toggle('is-active', virtualKeyboardShift);

        virtualKeyboardEl.querySelectorAll('[data-action="virtualKey"]').forEach(btn => {
            const key = btn.getAttribute('data-key');
            if (!key || !/^[a-z]$/.test(key)) return;
            const label = virtualKeyboardShift ? key.toUpperCase() : key.toLowerCase();
            btn.textContent = label;
            btn.setAttribute('aria-label', label);
        });
    }

    function setVirtualKeyboardShift(value) {
        virtualKeyboardShift = !!value;
        if (virtualKeyboardEl) {
            virtualKeyboardEl.classList.toggle('jr-virtual-keyboard--shift', virtualKeyboardShift);
        }
        updateVirtualKeyboardShiftVisual();
    }

    function updateVirtualKeyboardVisibility(isActive) {
        if (!virtualKeyboardEl) return;
        virtualKeyboardEl.classList.toggle('is-visible', isActive);
        virtualKeyboardEl.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        root.classList.toggle('jr-virtual-keyboard-open', isActive);
        if (isActive) {
            updateVirtualKeyboardShiftVisual();
        }
    }

    if (virtualKeyboardEl) {
        const isKeyboardControl = (target) => !!(target && (target.closest('.jr-virtual-keyboard__key') || target.closest('.jr-virtual-keyboard__action')));
        const handlePointerDown = (event) => {
            if (!isKeyboardControl(event.target)) return;
            if (event.pointerType === 'mouse') { event.preventDefault(); }
            ensureEditableTargetFocus();
        };
        const handleMouseDown = (event) => {
            if (!isKeyboardControl(event.target)) return;
            event.preventDefault();
            ensureEditableTargetFocus();
        };
        const handleTouchStart = (event) => {
            if (!isKeyboardControl(event.target)) return;
            ensureEditableTargetFocus();
        };

        if (window.PointerEvent) {
            virtualKeyboardEl.addEventListener('pointerdown', handlePointerDown, { passive: false });
        } else {
            virtualKeyboardEl.addEventListener('mousedown', handleMouseDown, { passive: false });
            virtualKeyboardEl.addEventListener('touchstart', handleTouchStart, { passive: true });
        }
    }

    if (virtualKeyboardEl) updateVirtualKeyboardShiftVisual();

    /* ===== Magnifier Setup ===== */
    let magnifierEl = root.querySelector('.jr-magnifier');
    if (magnifierEl) {
        magnifierEl.setAttribute('aria-hidden', 'true');
        magnifierEl.setAttribute('data-acc-ignore-magnifier', '1');
    }
    let magnifierInner = magnifierEl ? magnifierEl.querySelector('.jr-magnifier-inner') : null;
    let magnifierSnapshot = null;
    let magnifierResizeObserver = null;
    let magnifierMutationObserver = null;
    let magnifierVisible = false;
    let magnifierActive = false;
    let lastMagnifierPoint = null;

    function ensureMagnifierElements() {
        if (magnifierEl && magnifierInner) return true;

        magnifierEl = document.createElement('div');
        magnifierEl.className = 'jr-magnifier';
        magnifierEl.setAttribute('aria-hidden', 'true');
        magnifierEl.setAttribute('data-acc-ignore-magnifier', '1');

        magnifierInner = document.createElement('div');
        magnifierInner.className = 'jr-magnifier-inner';
        magnifierEl.appendChild(magnifierInner);

        root.appendChild(magnifierEl);
        return true;
    }

    function sanitizeForMagnifier(node) {
        if (!node) return;
        node.querySelectorAll('script').forEach(s => s.remove());
        node.querySelectorAll('.jr-magnifier').forEach(s => s.remove());
        node.querySelectorAll('[data-acc-ignore-magnifier="1"]').forEach(s => s.remove());
    }

    function rebuildMagnifierSnapshot() {
        if (!ensureMagnifierElements()) return;

        magnifierInner.innerHTML = '';
        const source = container === document ? (document.body || document.documentElement) : container;
        const clone = source.cloneNode(true);
        sanitizeForMagnifier(clone);
        clone.classList.add('jr-magnifier-snapshot');
        clone.setAttribute('aria-hidden', 'true');

        magnifierSnapshot = clone;
        magnifierInner.appendChild(clone);
        const rect = source.getBoundingClientRect();
        magnifierInner.style.width = Math.max(source.scrollWidth, rect.width) + 'px';
        magnifierInner.style.height = Math.max(source.scrollHeight, rect.height) + 'px';
    }

    function updateMagnifierPosition(clientX, clientY) {
        if (!magnifierEl || !magnifierInner || !magnifierSnapshot) return;

        const size = magnifierEl.offsetWidth || MAGNIFIER_SIZE;
        const radius = size / 2;
        magnifierEl.style.transform = `translate(${clientX - radius}px, ${clientY - radius}px)`;

        const source = container === document ? (document.body || document.documentElement) : container;
        const rect = source.getBoundingClientRect();
        const docX = window.scrollX + clientX;
        const docY = window.scrollY + clientY;
        const originX = rect.left + window.scrollX;
        const originY = rect.top + window.scrollY;
        const relX = docX - originX;
        const relY = docY - originY;
        const maxX = Math.max(source.scrollWidth, rect.width);
        const maxY = Math.max(source.scrollHeight, rect.height);
        const clampedX = Math.max(0, Math.min(maxX, relX));
        const clampedY = Math.max(0, Math.min(maxY, relY));

        magnifierInner.style.transform = `translate(${radius}px, ${radius}px) scale(${MAGNIFIER_SCALE}) translate(${-clampedX}px, ${-clampedY}px)`;
    }

    function hideMagnifier() {
        if (!magnifierEl) return;
        magnifierEl.classList.remove('is-visible');
        magnifierVisible = false;
    }

    function showMagnifier() {
        if (!magnifierEl) return;
        if (!magnifierVisible) { magnifierEl.classList.add('is-visible'); }
        magnifierVisible = true;
    }

    function shouldIgnoreMagnifier(target) {
        return !target || !!target.closest('.jr-accessibility-menu, .jr-magnifier, [data-acc-ignore-magnifier="1"]');
    }

    function onMagnifierMove(e) {
        if (!state.magnifyMode) return;
        const target = e.target;
        if (shouldIgnoreMagnifier(target)) { hideMagnifier(); return; }

        if (!magnifierSnapshot) rebuildMagnifierSnapshot();
        if (!magnifierSnapshot) return;

        showMagnifier();
        lastMagnifierPoint = { x: e.clientX, y: e.clientY };
        updateMagnifierPosition(e.clientX, e.clientY);
    }

    function onMagnifierLeave() { hideMagnifier(); }

    function onMagnifierScroll() {
        if (!state.magnifyMode || !lastMagnifierPoint) return;
        if (!magnifierSnapshot) rebuildMagnifierSnapshot();
        if (!magnifierSnapshot) return;
        const el = document.elementFromPoint(lastMagnifierPoint.x, lastMagnifierPoint.y);
        if (shouldIgnoreMagnifier(el)) { hideMagnifier(); return; }
        showMagnifier();
        updateMagnifierPosition(lastMagnifierPoint.x, lastMagnifierPoint.y);
    }

    function refreshMagnifierOnResize() {
        if (!state.magnifyMode) return;
        rebuildMagnifierSnapshot();
        if (lastMagnifierPoint) updateMagnifierPosition(lastMagnifierPoint.x, lastMagnifierPoint.y);
    }

    function activateMagnifier() {
        if (magnifierActive) return;
        if (!ensureMagnifierElements()) return;
        rebuildMagnifierSnapshot();
        magnifierEl.classList.add('jr-active');
        document.addEventListener('mousemove', onMagnifierMove);
        document.addEventListener('mouseleave', onMagnifierLeave, true);
        window.addEventListener('scroll', onMagnifierScroll, true);
        window.addEventListener('resize', refreshMagnifierOnResize);

        const target = container === document ? (document.body || document.documentElement) : container;

        if (typeof ResizeObserver !== 'undefined') {
            magnifierResizeObserver = new ResizeObserver(() => refreshMagnifierOnResize());
            magnifierResizeObserver.observe(target);
        }

        if (typeof MutationObserver !== 'undefined') {
            magnifierMutationObserver = new MutationObserver(() => { magnifierSnapshot = null; });
            magnifierMutationObserver.observe(target, { childList: true, subtree: true, attributes: true, characterData: false });
        }
        magnifierActive = true;
    }

    function deactivateMagnifier() {
        if (!magnifierActive) return;
        document.removeEventListener('mousemove', onMagnifierMove);
        document.removeEventListener('mouseleave', onMagnifierLeave, true);
        window.removeEventListener('scroll', onMagnifierScroll, true);
        window.removeEventListener('resize', refreshMagnifierOnResize);
        if (magnifierResizeObserver) {
            magnifierResizeObserver.disconnect();
            magnifierResizeObserver = null;
        }
        if (magnifierMutationObserver) {
            magnifierMutationObserver.disconnect();
            magnifierMutationObserver = null;
        }
        hideMagnifier();
        if (magnifierEl) magnifierEl.classList.remove('jr-active');
        if (magnifierInner) magnifierInner.innerHTML = '';
        magnifierSnapshot = null;
        lastMagnifierPoint = null;
        magnifierActive = false;
    }

    /* ===== UI Helpers ===== */
    function setToggle(el, isActive) {
        if (!el) return; el.classList.toggle('jr-active', !!isActive);
    }
    function setGroupActive(groupSel, value) {
        qa(groupSel + ' [data-action]').forEach(b => {
            const v = b.getAttribute('data-value');
            b.classList.toggle('jr-active', v === value);
        });
    }

    /* ====== Voice via Cursor (Hover Proximity) ====== */
    const TTS_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, .jr-tts';
    const HOVER_DELAY_MS = 350;
    const MIN_TEXT_LEN = 24;
    const PROXIMITY_PAD = 8;

    let hoverRAF = 0;
    let hoverTimer = 0;
    let currentHoverEl = null;
    let lastSpokenEl = null;

    function isInProximity(rect, x, y, pad = PROXIMITY_PAD) {
        return (x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad);
    }

    function nearestSpeakableFromPoint(x, y) {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        if (el.closest('.jr-site-header, .jr-site-footer')) return null;

        let blk = el.closest(TTS_SELECTOR);
        if (!blk) return null;

        const txt = (blk.innerText || '').replace(/\s+/g, ' ').trim();
        if (txt.length < MIN_TEXT_LEN) return null;

        const r = blk.getBoundingClientRect();
        if (!isInProximity(r, x, y)) return null;

        return blk;
    }

    function addHoverHighlight(el) {
        if (!el) return; el.classList.add('jr-voice-hover');
    }
    function removeHoverHighlight(el) {
        if (!el) return; el.classList.remove('jr-voice-hover'); el.classList.remove('jr-voice-speaking');
    }

    function speakParagraph(el) {
        if (typeof responsiveVoice === 'undefined') return;
        const txt = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (!txt) return;

        if (lastSpokenEl === el) return;

        responsiveVoice.cancel();
        lastSpokenEl = el;
        el.classList.add('jr-voice-speaking');

        responsiveVoice.speak(txt, "UK English Female", {
            rate: 0.9, pitch: 1, volume: 0.85,
            onend: () => el && el.classList.remove('jr-voice-speaking')
        });
    }

    function onVoiceMove(e) {
        if (!state.voiceMode) return;

        if (hoverRAF) cancelAnimationFrame(hoverRAF);
        hoverRAF = requestAnimationFrame(() => {
            hoverRAF = 0;

            const blk = nearestSpeakableFromPoint(e.clientX, e.clientY);

            if (blk !== currentHoverEl) {
                clearTimeout(hoverTimer);
                if (currentHoverEl) removeHoverHighlight(currentHoverEl);
                currentHoverEl = blk;

                if (currentHoverEl) {
                    addHoverHighlight(currentHoverEl);
                    hoverTimer = setTimeout(() => {
                        if (currentHoverEl === blk) { speakParagraph(currentHoverEl); }
                    }, HOVER_DELAY_MS);
                }
            }
        });
    }

    function cancelVoiceHover() {
        clearTimeout(hoverTimer);
        hoverTimer = 0;
        if (currentHoverEl) removeHoverHighlight(currentHoverEl);
        currentHoverEl = null;
    }

    /* ===== Apply state ke UI (load & berubah) ===== */
    function applyState({ initial = false } = {}) {
        root.classList.toggle('jr-menu-open', root.classList.contains('jr-menu-open'));
        root.classList.toggle('jr-voice-mode', state.voiceMode);
        root.classList.toggle('jr-reading-guide-active', state.readingGuide);
        root.classList.toggle('jr-monochrome', state.monochrome);
        root.classList.toggle('jr-high-contrast', state.highContrast);
        root.classList.toggle('jr-cursor-large', state.largeCursor);
        root.classList.toggle('jr-animations-disabled', state.animationsDisabled);
        root.classList.toggle('jr-hide-images', state.hideImages);
        root.classList.toggle('jr-magnify-mode', state.magnifyMode);

        root.style.fontSize = state.textSize + '%';
        root.style.lineHeight = state.lineHeight;
        let ls = '0px', ws = '0px';
        if (state.textSpacing === 'medium') { ls = '1px'; ws = '2px'; }
        if (state.textSpacing === 'large') { ls = '2px'; ws = '4px'; }
        root.style.letterSpacing = ls;
        root.style.wordSpacing = ws;
        root.style.fontWeight = state.boldText ? 'bold' : 'normal';

        const tv = q('[data-role="textSizeValue"]'); if (tv) tv.textContent = state.textSize + '%';
        const lv = q('[data-role="lineHeightValue"]'); if (lv) lv.textContent = state.lineHeight.toFixed(1) + 'x';
        setGroupActive('[data-group="spacing"]', state.textSpacing);
        setGroupActive('[data-group="align"]', state.textAlign);
        const box = q('.jr-page-root'); if (box) box.style.textAlign = state.textAlign;

        setToggle(q('[data-action="toggleVoice"]'), state.voiceMode);
        setToggle(q('[data-action="toggleReadingGuide"]'), state.readingGuide);
        setToggle(q('[data-action="toggleMonochrome"]'), state.monochrome);
        setToggle(q('[data-action="toggleHighContrast"]'), state.highContrast);
        setToggle(q('[data-action="toggleCursor"]'), state.largeCursor);
        setToggle(q('[data-action="toggleAnimations"]'), state.animationsDisabled);
        setToggle(q('[data-action="toggleHideImages"]'), state.hideImages);
        setToggle(q('[data-action="toggleMagnifier"]'), state.magnifyMode);
        setToggle(q('[data-action="toggleVirtualKeyboard"]'), state.virtualKeyboard);
        setToggle(q('[data-action="toggleHideDescription"]'), state.hideDescription);

        const menuEl = q('.jr-accessibility-menu');
        if (menuEl) menuEl.classList.toggle('jr-hide-description', !!state.hideDescription);

        scope.removeEventListener('mousemove', moveGuide);
        if (state.readingGuide) scope.addEventListener('mousemove', moveGuide);

        document.removeEventListener('mousemove', onVoiceMove);
        document.removeEventListener('mouseleave', cancelVoiceHover, true);

        if (state.voiceMode) {
            document.addEventListener('mousemove', onVoiceMove);
            document.addEventListener('mouseleave', cancelVoiceHover, true);

            if (!initial && typeof responsiveVoice !== 'undefined') {
                responsiveVoice.speak("Voice cursor mode is active.", "UK English Female", { rate: 0.9, pitch: 1, volume: 0.85 });
            }
        }

        if (state.hideImages) hideAllImagesAndBackgrounds();
        else restoreAllImagesAndBackgrounds();

        if (state.magnifyMode) activateMagnifier();
        else deactivateMagnifier();

        updateVirtualKeyboardVisibility(state.virtualKeyboard);

        // Protect footer — always present, cannot be removed or tampered
        ensureFooter();
    }

    /* ===== Features (global) ===== */
    function togglejrMenu(open) {
        root.classList.toggle('jr-menu-open', open === undefined ? !root.classList.contains('jr-menu-open') : !!open);
    }

    function toggleVoice() {
        state.voiceMode = !state.voiceMode;
        root.classList.toggle('jr-voice-mode', state.voiceMode);
        setToggle(q('[data-action="toggleVoice"]'), state.voiceMode);

        if (state.voiceMode) {
            document.addEventListener('mousemove', onVoiceMove);
            document.addEventListener('mouseleave', cancelVoiceHover, true);
            if (typeof responsiveVoice !== 'undefined') {
                responsiveVoice.cancel();
                responsiveVoice.speak("Voice cursor mode is active. Move the cursor to a paragraph to hear it.", "UK English Female", { rate: 0.9, pitch: 1, volume: 0.85 });
            }
        } else {
            document.removeEventListener('mousemove', onVoiceMove);
            document.removeEventListener('mouseleave', cancelVoiceHover, true);
            cancelVoiceHover();
            if (typeof responsiveVoice !== 'undefined') {
                responsiveVoice.cancel();
                responsiveVoice.speak("Voice mode is disabled.", "UK English Female", { rate: 0.9, pitch: 1, volume: 0.85 });
            }
        }
        saveState();
    }

    function textSize(delta) {
        state.textSize = Math.max(50, Math.min(200, state.textSize + delta));
        root.style.fontSize = state.textSize + '%';
        const v = q('[data-role="textSizeValue"]'); if (v) v.textContent = state.textSize + '%';
        saveState();
    }
    function lineHeight(delta) {
        state.lineHeight = Math.max(1.0, Math.min(3.0, +(state.lineHeight + delta).toFixed(1)));
        root.style.lineHeight = state.lineHeight;
        const v = q('[data-role="lineHeightValue"]'); if (v) v.textContent = state.lineHeight.toFixed(1) + 'x';
        saveState();
    }
    function spacing(val) {
        state.textSpacing = val;
        setGroupActive('[data-group="spacing"]', val);
        let ls = '0px', ws = '0px';
        if (val === 'medium') { ls = '1px'; ws = '2px'; }
        if (val === 'large') { ls = '2px'; ws = '4px'; }
        root.style.letterSpacing = ls;
        root.style.wordSpacing = ws;
        saveState();
    }
    function align(val) {
        state.textAlign = val;
        setGroupActive('[data-group="align"]', val);
        const box = q('.jr-page-root'); if (box) box.style.textAlign = val;
        saveState();
    }
    function toggleBold() {
        state.boldText = !state.boldText;
        root.style.fontWeight = state.boldText ? 'bold' : 'normal';
        setToggle(q('[data-action="toggleBold"]'), state.boldText);
        saveState();
    }
    function toggleReadingGuide() {
        state.readingGuide = !state.readingGuide;
        root.classList.toggle('jr-reading-guide-active', state.readingGuide);
        setToggle(q('[data-action="toggleReadingGuide"]'), state.readingGuide);
        if (state.readingGuide) { scope.addEventListener('mousemove', moveGuide); }
        else { scope.removeEventListener('mousemove', moveGuide); }
        saveState();
    }
    function moveGuide(e) {
        const guide = q('.jr-reading-guide');
        if (!guide) return;
        guide.style.top = (e.clientY - 1) + 'px';
    }
    function toggleMonochrome() {
        state.monochrome = !state.monochrome;
        root.classList.toggle('jr-monochrome', state.monochrome);
        setToggle(q('[data-action="toggleMonochrome"]'), state.monochrome);
        saveState();
    }
    function toggleHighContrast() {
        state.highContrast = !state.highContrast;
        root.classList.toggle('jr-high-contrast', state.highContrast);
        setToggle(q('[data-action="toggleHighContrast"]'), state.highContrast);
        saveState();
    }
    function toggleCursor() {
        state.largeCursor = !state.largeCursor;
        root.classList.toggle('jr-cursor-large', state.largeCursor);
        setToggle(q('[data-action="toggleCursor"]'), state.largeCursor);

        if (typeof responsiveVoice !== 'undefined' && state.voiceMode) {
            responsiveVoice.speak(state.largeCursor ? "Cursor enlarged." : "Cursor normal.", "UK English Female", { rate: 0.9, pitch: 1, volume: 0.8 });
        }

        saveState();
    }

    function toggleAnimations() {
        state.animationsDisabled = !state.animationsDisabled;
        root.classList.toggle('jr-animations-disabled', state.animationsDisabled);
        setToggle(q('[data-action="toggleAnimations"]'), state.animationsDisabled);
        saveState();
    }
    function toggleHideImages() {
        state.hideImages = !state.hideImages;
        root.classList.toggle('jr-hide-images', state.hideImages);
        setToggle(q('[data-action="toggleHideImages"]'), state.hideImages);
        if (state.hideImages) hideAllImagesAndBackgrounds();
        else restoreAllImagesAndBackgrounds();
        saveState();
    }

    function toggleMagnifier() {
        state.magnifyMode = !state.magnifyMode;
        root.classList.toggle('jr-magnify-mode', state.magnifyMode);
        setToggle(q('[data-action="toggleMagnifier"]'), state.magnifyMode);
        if (state.magnifyMode) activateMagnifier();
        else deactivateMagnifier();
        saveState();
    }

    function toggleVirtualKeyboard(force) {
        const next = force === undefined ? !state.virtualKeyboard : !!force;
        state.virtualKeyboard = next;
        updateVirtualKeyboardVisibility(next);
        setToggle(q('[data-action="toggleVirtualKeyboard"]'), next);
        if (next) { ensureEditableTargetFocus(); }
        else { setVirtualKeyboardShift(false); }
        saveState();
    }

    function closeVirtualKeyboard() {
        if (!state.virtualKeyboard) return;
        toggleVirtualKeyboard(false);
    }

    function toggleVirtualShift() { setVirtualKeyboardShift(!virtualKeyboardShift); }

    function toggleHideDescription() {
        state.hideDescription = !state.hideDescription;
        const menuEl = q('.jr-accessibility-menu');
        if (menuEl) menuEl.classList.toggle('jr-hide-description', state.hideDescription);
        setToggle(q('[data-action="toggleHideDescription"]'), state.hideDescription);
        saveState();
    }

    function handleVirtualKeyInput(key) {
        if (!key) return;
        const target = ensureEditableTargetFocus();
        if (!target) return;
        const needsUpper = virtualKeyboardShift && /^[a-z]$/.test(key);
        const text = needsUpper ? key.toUpperCase() : key;
        insertTextAtCursor(target, text);
        if (virtualKeyboardShift) setVirtualKeyboardShift(false);
    }

    function handleVirtualSpace() {
        const target = ensureEditableTargetFocus();
        if (!target) return;
        insertTextAtCursor(target, ' ');
        if (virtualKeyboardShift) setVirtualKeyboardShift(false);
    }

    function handleVirtualEnter() {
        const target = ensureEditableTargetFocus();
        if (!target) return;
        if (target.tagName === 'TEXTAREA' || target.isContentEditable) {
            insertTextAtCursor(target, '\n');
        } else if (target.tagName === 'INPUT') {
            const type = (target.type || 'text').toLowerCase();
            if (!NON_TEXT_INPUT_TYPES.has(type)) {
                const form = target.form;
                if (form) {
                    if (typeof form.requestSubmit === 'function') form.requestSubmit();
                    else form.submit();
                }
            }
        }
        if (virtualKeyboardShift) setVirtualKeyboardShift(false);
    }

    function handleVirtualBackspace() {
        const target = ensureEditableTargetFocus();
        if (!target) return;
        deleteCharacterAtCursor(target);
    }

    function handleVirtualClear() {
        const target = ensureEditableTargetFocus();
        if (!target) return;
        clearEditableValue(target);
        if (virtualKeyboardShift) setVirtualKeyboardShift(false);
    }

    function resetAll() {
        if (typeof responsiveVoice !== 'undefined') { responsiveVoice.cancel(); }
        document.removeEventListener('mousemove', onVoiceMove);
        document.removeEventListener('mouseleave', cancelVoiceHover, true);
        cancelVoiceHover();
        restoreAllImagesAndBackgrounds();
        deactivateMagnifier();
        updateVirtualKeyboardVisibility(false);
        setVirtualKeyboardShift(false);

        state = { ...DEFAULT_STATE };
        
        // Clear Google Translate cookies to reset language
        if (typeof window.setCookieAll === 'function' && typeof window.clearCookieAll === 'function') {
            window.clearCookieAll('googtrans');
            const from = (window.CONFIG && window.norm) ? window.norm(window.CONFIG.pageLanguage) : 'en';
            window.setCookieAll('googtrans', `/${from}/${from}`, 365);
        }

        root.classList.remove(
            'jr-menu-open', 'jr-voice-mode', 'jr-reading-guide-active',
            'jr-monochrome', 'jr-high-contrast', 'jr-cursor-large',
            'jr-animations-disabled', 'jr-hide-images', 'jr-magnify-mode',
            'jr-virtual-keyboard-open'
        );
        root.style.fontSize = ''; root.style.lineHeight = ''; root.style.letterSpacing = ''; root.style.wordSpacing = ''; root.style.fontWeight = '';
        const box = q('.jr-page-root'); if (box) box.style.textAlign = '';

        const tv = q('[data-role="textSizeValue"]'); if (tv) tv.textContent = '100%';
        const lv = q('[data-role="lineHeightValue"]'); if (lv) lv.textContent = '1.6x';

        qa('.jr-toggle-switch').forEach(t => t.classList.remove('jr-active'));
        const menuEl = q('.jr-accessibility-menu');
        if (menuEl) menuEl.classList.remove('jr-hide-description');
        setGroupActive('[data-group="spacing"]', 'normal');
        setGroupActive('[data-group="align"]', 'left');

        // Ensure footer is protected after reset
        ensureFooter();

        try { localStorage.removeItem(STORAGE_KEY); } catch { }

        // Reload page to reset Google Translate rendering
        if (typeof window.setCookieAll === 'function') {
            window.location.reload();
        }
    }

    /* ===== Event delegation (global) ===== */
    scope.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        if (t.tagName === 'A') e.preventDefault();

        const act = t.getAttribute('data-action');
        switch (act) {
            case 'togglejrMenu': togglejrMenu(); break;
            case 'closeMenu': togglejrMenu(false); break;
            case 'toggleVoice': toggleVoice(); break;
            case 'textSizeDec': textSize(-10); break;
            case 'textSizeInc': textSize(10); break;
            case 'lineHeightDec': lineHeight(-0.1); break;
            case 'lineHeightInc': lineHeight(0.1); break;
            case 'spacing': spacing(t.getAttribute('data-value')); break;
            case 'align': align(t.getAttribute('data-value')); break;
            case 'toggleBold': toggleBold(); break;
            case 'toggleReadingGuide': toggleReadingGuide(); break;
            case 'toggleMonochrome': toggleMonochrome(); break;
            case 'toggleHighContrast': toggleHighContrast(); break;
            case 'toggleCursor': toggleCursor(); break;
            case 'toggleAnimations': toggleAnimations(); break;
            case 'toggleHideImages': toggleHideImages(); break;
            case 'toggleMagnifier': toggleMagnifier(); break;
            case 'toggleVirtualKeyboard': toggleVirtualKeyboard(); break;
            case 'toggleHideDescription': toggleHideDescription(); break;
            case 'closeVirtualKeyboard': closeVirtualKeyboard(); break;
            case 'virtualShift': toggleVirtualShift(); break;
            case 'virtualBackspace': handleVirtualBackspace(); break;
            case 'virtualSpace': handleVirtualSpace(); break;
            case 'virtualEnter': handleVirtualEnter(); break;
            case 'virtualClear': handleVirtualClear(); break;
            case 'virtualKey': handleVirtualKeyInput(t.getAttribute('data-key')); break;
            case 'reset': resetAll(); break;
        }
    });

    document.addEventListener('focusin', (event) => { rememberEditable(event.target); });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            togglejrMenu(false);
            if (typeof responsiveVoice !== 'undefined') responsiveVoice.cancel();
            cancelVoiceHover();
            if (state.virtualKeyboard) toggleVirtualKeyboard(false);
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        if (typeof responsiveVoice === 'undefined') console.warn('[jr-accessibility] ResponsiveVoice not loaded');
        applyState({ initial: true });
        startFooterProtection();
    });

    window.addEventListener('beforeunload', () => {
        if (typeof responsiveVoice !== 'undefined') responsiveVoice.cancel();
        saveState();
    });
})();

/* =====================================================================
   PART 3: MOBILE FAB TOGGLE (removed — using floating sidebar only)
   ===================================================================== */

/* =====================================================================
   PART 4: GOOGLE TRANSLATE WIDGET
   ===================================================================== */
(function() {
    const CONFIG = {
        pageLanguage: 'en',
        included: 'en,id,ja,ko,es,fr,de',
    };

    const FLAG_MAP = {
        'en': 'gb', 'id': 'id', 'ja': 'jp', 'ko': 'kr',
        'es': 'es', 'fr': 'fr', 'de': 'de',
    };

    const norm = (s) => (s || '').trim().toLowerCase();

    function computeFlagSrc(lang) {
        const ln = norm(lang);
        const cc = FLAG_MAP[ln] || FLAG_MAP[ln.split('-')[0]];
        return cc ? `https://flagcdn.com/w40/${cc}.png` : '';
    }

    function getCookieAll(name) {
        const target = name + '=';
        const ca = document.cookie ? document.cookie.split(';') : [];
        const hits = [];
        for (let i = 0; i < ca.length; i++) {
            const raw = ca[i].trim();
            if (raw.indexOf(target) === 0) {
                hits.push(decodeURIComponent(raw.substring(target.length)));
            }
        }
        return hits;
    }

    function parseGoogTrans() {
        const v = getCookieAll('googtrans').pop() || '';
        const p = v.split('/').filter(Boolean);
        return { src: p[0] || '', target: p[1] || '' };
    }

    function setCookieAll(name, value, days) {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const base = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
        const host = window.location.hostname;
        const variants = [null, host, '.' + host];
        const parts = host.split('.');
        if (parts.length > 2) variants.push('.' + parts.slice(-2).join('.'));
        variants.forEach(dom => {
            let cookie = base;
            if (dom) cookie += `;domain=${dom}`;
            document.cookie = cookie;
        });
    }

    function clearCookieAll(name) {
        setCookieAll(name, '', -1);
    }

    class GTW {
        constructor() {
            this.btn = document.getElementById('gtwBtn');
            this.dropdown = document.getElementById('gtwDropdown');
            this.flagImg = document.getElementById('gtwFlag');
            this.items = Array.from(document.querySelectorAll('.gtw-item'));
            this.currentLang = norm(CONFIG.pageLanguage);
            this.isOpen = false;
            this.isMobile = window.innerWidth <= 768;

            this.injectCssHider();
            this.initFromPref();
            this.bind();
            this.loadGoogleTranslate();
        }

        injectCssHider() {
            // Already in style.css
        }

        getPreferredLang() {
            const fromCookie = norm(parseGoogTrans().target);
            if (fromCookie) return fromCookie;
            const htmlLang = norm(document.documentElement.getAttribute('lang') || '');
            if (htmlLang && FLAG_MAP[htmlLang]) return htmlLang;
            return norm(CONFIG.pageLanguage);
        }

        initFromPref() {
            const pref = this.getPreferredLang();
            this.updateFlagUI(pref);
            document.documentElement.setAttribute('lang', pref);
        }

        bind() {
            if (this.btn) {
                this.btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggle();
                });
            }
            document.addEventListener('click', () => this.close());
            if (this.dropdown) this.dropdown.addEventListener('click', (e) => e.stopPropagation());

            window.addEventListener('resize', () => {
                const wasMobile = this.isMobile;
                this.isMobile = window.innerWidth <= 768;
                if (wasMobile !== this.isMobile && this.isOpen) this.close();
            });

            this.items.forEach(item => {
                const act = (e) => {
                    e.stopPropagation();
                    const lang = norm(item.getAttribute('data-lang'));
                    if (lang === '__reset__') {
                        this.resetTranslation();
                        return;
                    }
                    this.select(lang);
                };
                item.addEventListener('click', act);
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') act(e);
                });
            });
        }

        toggle() { this.isOpen ? this.close() : this.open(); }
        open() {
            this.isOpen = true;
            if (this.btn) this.btn.classList.add('active');
            if (this.dropdown) this.dropdown.classList.add('show');
        }
        close() {
            this.isOpen = false;
            if (this.btn) this.btn.classList.remove('active');
            if (this.dropdown) this.dropdown.classList.remove('show');
        }

        updateFlagUI(lang) {
            const ln = norm(lang);
            this.currentLang = ln;

            let src = '';
            let name = ln;
            const item = this.items.find(el => norm(el.getAttribute('data-lang')) === ln);
            if (item) {
                name = item.getAttribute('data-name') || ln;
                const img = item.querySelector('img');
                if (img && img.src) src = img.src;
            }
            if (!src) src = computeFlagSrc(ln);

            if (this.flagImg && src) this.flagImg.src = src;
            if (this.flagImg) this.flagImg.alt = name;
            if (this.btn) this.btn.setAttribute('aria-label', `Select language (current: ${name})`);

            const labelEl = document.getElementById('gtwLabel');
            if (labelEl) labelEl.textContent = name;

            this.items.forEach(el => {
                const active = norm(el.getAttribute('data-lang')) === ln;
                el.classList.toggle('is-active', active);
                el.setAttribute('aria-selected', active ? 'true' : 'false');
            });
        }

        select(lang) {
            if (!lang || lang === this.currentLang) {
                this.close();
                return;
            }
            this.updateFlagUI(lang);
            this.close();
            this.applyGoogleTranslate(lang);
        }

        applyGoogleTranslate(target) {
            const src = norm(CONFIG.pageLanguage);
            setCookieAll('googtrans', `/${src}/${target}`, 365);
            document.documentElement.setAttribute('lang', target);
            window.location.reload();
        }

        resetTranslation() {
            const from = norm(CONFIG.pageLanguage);
            clearCookieAll('googtrans');
            setCookieAll('googtrans', `/${from}/${from}`, 365);
            document.documentElement.setAttribute('lang', from);
            window.location.reload();
        }

        loadGoogleTranslate() {
            const hiddenDiv = document.createElement('div');
            hiddenDiv.id = 'google_translate_element';
            hiddenDiv.style.display = 'none';
            document.body.appendChild(hiddenDiv);

            window.googleTranslateElementInit = () => {
                new google.translate.TranslateElement({
                    pageLanguage: CONFIG.pageLanguage,
                    includedLanguages: CONFIG.included,
                    layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                    autoDisplay: false
                }, 'google_translate_element');

                const eff = parseGoogTrans().target;
                if (eff) {
                    this.updateFlagUI(eff);
                    document.documentElement.setAttribute('lang', eff);
                }
            };

            if (!document.querySelector('script[data-gtw="gtelement"]')) {
                const s = document.createElement('script');
                s.setAttribute('data-gtw', 'gtelement');
                s.setAttribute('data-cfasync', 'false');
                s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
                document.head.appendChild(s);
            }
        }
    }

    if (document.querySelector('#gtwBtn')) {
        document.addEventListener('DOMContentLoaded', () => {
            window.__gtw = new GTW();
            // Expose helpers for reset functionality
            window.setCookieAll = setCookieAll;
            window.clearCookieAll = clearCookieAll;
            window.CONFIG = CONFIG;
            window.norm = norm;
        });
    }
})();
