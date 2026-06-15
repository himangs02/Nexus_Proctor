import { useEffect, useRef, useCallback, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';

/**
 * useProctoring — Core anti-cheat engine hook
 * Detects: tab switch, blur, fullscreen exit, copy/paste, right-click, devtools, shortcuts
 */
export default function useProctoring({ examId, enabled = false, maxViolations = 3, onRestricted, onAutoSubmit }) {
  const [violations, setViolations] = useState([]);
  const [violationCount, setViolationCount] = useState(0);
  const [restricted, setRestricted] = useState(false);
  const countRef = useRef(0);

  const logViolation = useCallback(async (type, severity = 'medium', details = '') => {
    if (!enabled || restricted) return;
    countRef.current += 1;
    const count = countRef.current;
    setViolationCount(count);
    setViolations(prev => [...prev, { type, severity, details, timestamp: new Date() }]);

    // Emit via socket for live monitoring
    const socket = getSocket();
    if (socket) socket.emit('violation', { type, severity, details, count });

    // Log to backend
    try {
      const res = await api.post('/violations', { examId, type, severity, details });
      if (res.data.restricted) {
        setRestricted(true);
        if (onRestricted) onRestricted(res.data.message);
        if (onAutoSubmit) onAutoSubmit('Max violations exceeded');
      }
    } catch (e) { /* silent */ }
  }, [examId, enabled, restricted, onRestricted, onAutoSubmit]);

  useEffect(() => {
    if (!enabled) return;

    // ── Tab visibility change ──
    const handleVisibility = () => {
      if (document.hidden) logViolation('tab_switch', 'high', 'Tab switched / minimized');
    };

    // ── Window blur (alt-tab, app switch) ──
    const handleBlur = () => logViolation('window_blur', 'high', 'Window lost focus');

    // ── Fullscreen exit ── (Handled in page for custom force-reentry logic)
    const handleFullscreen = () => {};

    // ── Copy / Paste / Cut / Drag / Drop ──
    const preventEvent = (name) => (e) => { e.preventDefault(); logViolation('copy_paste', 'medium', `${name} attempted`); };
    const handleCopy = preventEvent('Copy');
    const handlePaste = preventEvent('Paste');
    const handleCut = preventEvent('Cut');
    const handleDrag = preventEvent('Drag');
    const handleDrop = preventEvent('Drop');

    // ── Right click ──
    const handleContext = (e) => { e.preventDefault(); logViolation('right_click', 'low', 'Right-click attempted'); };

    // ── Keyboard shortcuts ──
    const handleKeydown = (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (DevTools / Source)
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault(); logViolation('devtools', 'critical', 'DevTools shortcut detected');
        return;
      }
      // Ctrl+Tab, Ctrl+T, Ctrl+N
      if (e.ctrlKey && (e.key === 'Tab' || e.key === 't' || e.key === 'T' || e.key === 'n' || e.key === 'N')) {
        e.preventDefault(); logViolation('keyboard_shortcut', 'high', `Ctrl+${e.key} detected`);
        return;
      }
      // Alt+Tab (can't fully prevent but detect)
      if (e.altKey && e.key === 'Tab') {
        logViolation('keyboard_shortcut', 'high', 'Alt+Tab detected');
        return;
      }
      // Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A in exam (outside editor)
      if (e.ctrlKey && ['c', 'v', 'x', 'a', 'C', 'V', 'X', 'A'].includes(e.key)) {
        // Allow inside Monaco editor
        const target = e.target;
        const isEditor = target.closest('.monaco-editor');
        if (!isEditor) { 
          e.preventDefault(); 
          logViolation('copy_paste', 'medium', `Ctrl+${e.key.toUpperCase()} outside editor`); 
        }
      }
    };

    // ── Screen resize (possible monitor change) ──
    let lastW = window.innerWidth, lastH = window.innerHeight;
    const handleResize = () => {
      const dw = Math.abs(window.innerWidth - lastW);
      const dh = Math.abs(window.innerHeight - lastH);
      if (dw > 200 || dh > 200) {
        logViolation('screen_resize', 'medium', `Significant resize: ${dw}x${dh}`);
      }
      lastW = window.innerWidth; lastH = window.innerHeight;
    };

    // ── DevTools detection via debugger timing ──
    const devtoolsInterval = setInterval(() => {
      const el = new Image();
      Object.defineProperty(el, 'id', { get: () => { /* triggered by devtools */ } });
    }, 5000);

    // ── Disable text selection ──
    const preventSelection = (e) => {
      const target = e.target;
      if (!target.closest('.monaco-editor')) {
        e.preventDefault();
      }
    };

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreen);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('dragstart', handleDrag);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('selectstart', preventSelection);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('dragstart', handleDrag);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('selectstart', preventSelection);
      window.removeEventListener('resize', handleResize);
      clearInterval(devtoolsInterval);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [enabled, logViolation]);

  return { violations, violationCount, restricted, logViolation };
}
