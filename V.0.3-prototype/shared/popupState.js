(function (root) {
  function createRenderController() {
    const keys = new Map();
    const generations = new Map();
    const metrics = { renders: 0, identicalUpdatesSkipped: 0, staleUpdatesSkipped: 0 };

    function begin(channel) {
      const generation = (generations.get(channel) || 0) + 1;
      generations.set(channel, generation);
      return generation;
    }

    function isCurrent(channel, generation) {
      return generations.get(channel) === generation;
    }

    function update(channel, key, render, generation, generationChannel = channel) {
      if (generation !== undefined && !isCurrent(generationChannel, generation)) {
        metrics.staleUpdatesSkipped += 1;
        return false;
      }
      if (keys.get(channel) === key) {
        metrics.identicalUpdatesSkipped += 1;
        return false;
      }
      render();
      keys.set(channel, key);
      metrics.renders += 1;
      return true;
    }

    return { begin, isCurrent, update, snapshot: () => ({ ...metrics }) };
  }

  const api = { createRenderController };
  root.ComprPopupState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
