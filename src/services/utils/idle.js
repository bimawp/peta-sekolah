// src/utils/idle.js
export const onIdle = (fn) => {
  const cb = () => setTimeout(fn, 0);
  (window.requestIdleCallback || ((f) => setTimeout(f, 1))).call(window, cb);
};
