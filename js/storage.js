// ============================================================
// storage.js — memoria de lectura en localStorage
// ============================================================
const Storage = (function () {
  const KEY = "ljdh_reader_state_v1";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  function save(partial) {
    try {
      const current = load();
      const merged = Object.assign({}, current, partial);
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch (e) {
      // localStorage no disponible (modo privado, cuota, etc.) — no interrumpe la lectura
    }
  }

  return { load, save };
})();
