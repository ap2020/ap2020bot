const path = require('path');
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const VirtualModulesPlugin = require('webpack-virtual-modules');

module.exports = (async () => ({
  context: __dirname,
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  entry: slsw.lib.entries,
  devtool: slsw.lib.webpack.isLocal ? 'eval-cheap-module-source-map' : 'source-map',
  resolve: {
    extensions: ['.mjs', '.json', '.ts'],
    symlinks: false,
    cacheWithContext: false,
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
  },
  target: 'node',
  externals: [nodeExternals({
    modulesDir: path.resolve(__dirname, '../node_modules'),
  })],
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      {
        test: /\.(tsx?)$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              experimentalWatchApi: true,
            },
          },
        ],
        exclude: [
          [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, '.serverless'),
            path.resolve(__dirname, '.webpack'),
          ],
        ],
      },
    ],
  },
  optimization: {
    concatenateModules: false,
  },
  plugins: [
    ...(() => {
      switch (slsw.lib.options.stage) {
        case 'local': {
          return [
            // use .env.local.json
            new CopyPlugin({
              patterns: [{ from: '.env.local.json', to: './.env.local.json' }],
            }),
          ];
        }
        default: {
          return [
            // not using .env.local.json
            // but we need a dummy module to require
            new VirtualModulesPlugin({
              './.env.local.json': '{}',
            }),
          ];
        }
      }
    })(),
    new ForkTsCheckerWebpackPlugin({
      eslint: {
        files: './src/**/*.{ts,tsx,js,jsx}',
      },
    }),
  ],
}))();
