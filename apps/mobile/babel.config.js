// babel.config.js
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Expo babel preset for the VetAssist mobile app
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
