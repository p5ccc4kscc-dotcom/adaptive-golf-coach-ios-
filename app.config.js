// Extends app.json. EXPO_BASE_URL lets the web build be hosted under a sub-path,
// e.g. GitHub Pages serves this repo at /adaptive-golf-coach-ios-/.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  return {
    ...config,
    experiments: { ...config.experiments, ...(baseUrl ? { baseUrl } : {}) },
  };
};
