module.exports = {
  target: 'node',
  resolve: {
    fallback: {
      "path": require.resolve("path-browserify")
    }
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
        // eslint-disable-next-line no-param-reassign
        webpackConfig.resolve.fallback = {
            fs: false,
        };
        return webpackConfig;
    },
  },
};
