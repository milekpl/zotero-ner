module.exports = {
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.jsx?$': ['babel-jest', { configFile: false, presets: ['@babel/preset-env'] }],
  },
  transformIgnorePatterns: ['/node_modules/'],
};