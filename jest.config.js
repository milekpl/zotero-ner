module.exports = {
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  transform: {
    '^.+\\.jsx?$': ['babel-jest', { configFile: false, presets: ['@babel/preset-env'] }],
  },
  transformIgnorePatterns: ['/node_modules/'],
};