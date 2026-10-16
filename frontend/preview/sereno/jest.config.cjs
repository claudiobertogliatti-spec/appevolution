const path = require('path');
process.env.NODE_ENV = 'test';
const createConfig = require('react-scripts/scripts/utils/createJestConfig');
const base = createConfig(file => require.resolve(`react-scripts/${file}`), path.resolve(__dirname, '../..'), false);
// CRA/Jest 27 cannot resolve Router 7's conditional exports; select its CJS export.
function commonJS(pkg, entry = '.') {
  const manifestPath = require.resolve(`${pkg}/package.json`);
  const manifest = require(manifestPath);
  return path.resolve(path.dirname(manifestPath), manifest.exports?.[entry]?.node?.default || manifest.main);
}
module.exports = { ...base, testMatch: ['**/*.test.js'],
  moduleNameMapper: { ...base.moduleNameMapper,
    '^react-router-dom$': commonJS('react-router-dom'),
    '^react-router$': commonJS('react-router'),
    '^react-router/dom$': commonJS('react-router', './dom'),
  },
};
