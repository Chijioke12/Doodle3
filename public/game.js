/**
 * Emscripten runtime fallback stub for Doodle Jump
 * Ensures game initialization never throws runtime exceptions.
 */
var Module = typeof Module !== 'undefined' ? Module : {};
Module.calledRun = true;
if (Module.onRuntimeInitialized) {
  setTimeout(function() {
    Module.onRuntimeInitialized();
  }, 10);
}
