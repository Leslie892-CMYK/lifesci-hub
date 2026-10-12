// Express 4's deprecation notifier creates wrappers with new Function().
// Workers forbids runtime code generation; deprecated APIs retain their normal
// behavior here, without dynamically generating a notification wrapper.
module.exports = function deprecate() {
  const notify = () => {};
  notify.function = (fn) => fn;
  notify.property = () => {};
  return notify;
};
