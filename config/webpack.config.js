const path = require('path');

const { HotModuleReplacementPlugin, IgnorePlugin } = require('webpack'); // HMR
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer'); // Analyzes Build
const PnpWebpackPlugin = require('pnp-webpack-plugin'); // Yarn Plug n Play
const HtmlWebpackPlugin = require('html-webpack-plugin'); // To handle HTML
const HtmlWebpackInlineSVGPlugin = require('html-webpack-inline-svg-plugin'); // To optimize svg
const { CleanWebpackPlugin } = require('clean-webpack-plugin'); // To reset build folder
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin'); // Path Resolution
const MiniCssExtractPlugin = require('mini-css-extract-plugin'); // Minify CSS
const PostcssSafeParser = require('postcss-safe-parser'); // Postcss Parser
const TerserJSPlugin = require('terser-webpack-plugin'); // Minify JS
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin'); // Optimizes CSS
const Dotenv = require('dotenv-webpack'); // Enables environment Variable Injection
const { GenerateSW } = require('workbox-webpack-plugin'); // Service Worker
const ESLintPlugin = require('eslint-webpack-plugin'); // JS Linting
const StylelintPlugin = require('stylelint-webpack-plugin'); // Style Linting
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin'); // Output

const { getPaths, resolve } = require('./addons/paths');
const { getFilesFromDir, getConfig } = require('./addons/files');

const { buildPath, srcPath } = getPaths();
const config = getConfig();

const getHTMLPlugins = (dev) => {
  const files = getFilesFromDir(srcPath, ['.html']);
  const plugins = files.map((file) => {
    const fileName = file.replace(srcPath, '');
    const data = {
      chunks: [fileName.replace(path.extname(fileName), ''), 'vendor'],
      template: file,
      scriptLoading: 'defer',
      filename: fileName,
      meta: {
        viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
        'theme-color': '#fff'
      }
    };
    if (!dev) {
      data.minify = {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      };
    }
    return new HtmlWebpackPlugin(data);
  });
  return plugins;
};

const getEntires = () => {
  const entryNames = {};
  const files = getFilesFromDir(srcPath, ['.html']);
  files.forEach((file) => {
    const chunkName = file.replace(srcPath, '').replace(path.extname(file), '');
    entryNames[chunkName] = resolve(['src', 'scripts', `${chunkName}.js`]);
  });
  return entryNames;
};

const getHTMLLoader = () => {
  return {
    test: /\.html$/i,
    loader: 'html-loader',
    options: {
      esModule: true
    }
  };
};

const getJSLoaders = (dev) => {
  return {
    test: /\.(js|jsx)$/,
    include: [srcPath],
    exclude: [resolve('node-modules')],
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      cacheCompression: false,
      compact: !dev,
      presets: [
        [
          '@babel/preset-env',
          {
            useBuiltIns: 'usage',
            modules: false,
            corejs: 3
          }
        ]
      ]
    }
  };
};

const getStyleLoaders = (dev) => {
  const productionLoader = {
    loader: MiniCssExtractPlugin.loader,
    options: { publicPath: buildPath }
  };

  const sassLoader = {
    loader: 'sass-loader',
    options: {
      sourceMap: true,
      sassOptions: {
        fiber: require('fibers')
      }
    }
  };

  const loaders = [
    'style-loader',
    {
      loader: 'css-loader',
      options: {
        importLoaders: 3,
        sourceMap: !dev ? config.enableSourceMap : dev
      }
    },
    {
      loader: 'postcss-loader',
      options: {
        sourceMap: !dev ? config.enableSourceMap : dev,
        postcssOptions: {
          plugins: [
            'pleeease-filters',
            'postcss-flexbugs-fixes',
            [
              'postcss-preset-env',
              {
                autoprefixer: {
                  flexbox: 'no-2009'
                },
                stage: 3
              }
            ],
            'postcss-normalize'
          ]
        }
      }
    },
    {
      loader: 'resolve-url-loader',
      options: {
        sourceMap: !dev ? config.enableSourceMap : dev,
        root: srcPath
      }
    }
  ];

  if (!dev) loaders[0] = productionLoader;
  if (config.enableSass === true) {
    loaders.push(sassLoader);
    return {
      test: /\.scss$/,
      use: loaders
    };
  } else {
    return {
      test: /\.css$/,
      use: loaders
    };
  }
};

const getImageLoaders = () => {
  const loaders = [
    {
      test: /\.bmp$/,
      use: [
        {
          loader: 'url-loader',
          options: {
            limit: config.imageInlineLimit,
            name: 'static/media/[name].[hash:8].[ext]'
          }
        }
      ]
    },
    {
      test: [/\.gif$/, /\.jpe?g$/, /\.png$/, /\.webp$/, /\.svg$/],
      use: [
        {
          loader: 'url-loader',
          options: {
            limit: config.imageInlineLimit,
            name: 'static/media/[name].[hash:8].[ext]'
          }
        },
        {
          loader: 'image-webpack-loader',
          options: {
            disable: true,
            webp: {
              quality: 75
            }
          }
        }
      ]
    }
  ];

  return loaders;
};

const getFileLoaders = () => {
  const loaders = [
    {
      test: /\.(ttf|eot|woff|woff2)$/,
      use: {
        loader: 'file-loader',
        options: {
          name: 'static/fonts/[name].[hash:8].[ext]'
        }
      }
    },
    {
      loader: 'file-loader',
      exclude: [/\.(js|jsx)$/, /\.html$/, /\.json$/],
      options: {
        name: 'static/data/[name].[hash:8].[ext]'
      }
    }
  ];

  return loaders;
};

module.exports = (env, options) => {
  const isDevMode = options.mode === 'development';
  const BASE_PATH = isDevMode ? '/' : config.publicUrl;

  return {
    target: 'web',
    devtool: isDevMode
      ? 'cheap-module-source-map'
      : config.enableSourceMap && 'source-map',
    bail: !isDevMode,
    entry: getEntires(),
    output: {
      path: buildPath,
      pathinfo: isDevMode,
      filename: isDevMode
        ? 'static/js/[name].[fullhash:8].js'
        : 'static/js/[name].[contenthash:8].js',
      chunkFilename: isDevMode
        ? 'static/js/[name].[fullhash:8].chunk.js'
        : 'static/js/[name].[contenthash:8].chunk.js',
      publicPath: BASE_PATH,
      globalObject: 'this',
      devtoolModuleFilenameTemplate: !isDevMode
        ? (info) =>
            path
              .relative(srcPath, info.absoluteResourcePath)
              .replace(/\\/g, '/')
        : (info) => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')
    },
    devServer: {
      open: true,
      compress: true,
      quiet: true,
      hot: true,
      port: config.port,
      disableHostCheck: true,
      publicPath: BASE_PATH,
      overlay: {
        warnings: false,
        errors: true
      }
    },
    resolve: {
      alias: {
        src: srcPath,
        styles: resolve(['src', 'styles']),
        scripts: resolve(['src', 'scripts']),
        assets: resolve(['src', 'assets'])
      },
      plugins: [PnpWebpackPlugin]
    },
    resolveLoader: {
      plugins: [PnpWebpackPlugin.moduleLoader(module)]
    },
    optimization: {
      usedExports: true,
      runtimeChunk: {
        name: (entrypoint) => `runtime-${entrypoint.name}`
      },
      splitChunks: {
        chunks: 'all',
        name: false
      },
      minimize: !isDevMode,
      minimizer: [
        new TerserJSPlugin({
          parallel: true,
          terserOptions: {
            sourceMap: true,
            parse: {
              ecma: 8
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2
            },
            mangle: {
              safari10: true
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true
            }
          }
        }),
        new OptimizeCSSAssetsPlugin({
          cssProcessorOptions: {
            parser: PostcssSafeParser,
            map: config.enableSourceMap
              ? {
                  inline: false,
                  annotation: true
                }
              : false
          },
          cssProcessorPluginOptions: {
            preset: ['default', { minifyFontValues: { removeQuotes: false } }]
          }
        })
      ]
    },
    module: {
      strictExportPresence: true,
      rules: [
        {
          oneOf: [
            getHTMLLoader(),
            getJSLoaders(isDevMode),
            getStyleLoaders(isDevMode),
            ...getImageLoaders(),
            ...getFileLoaders()
          ]
        }
      ]
    },
    plugins: [
      ...getHTMLPlugins(isDevMode),
      new HtmlWebpackInlineSVGPlugin(),
      isDevMode &&
        config.generateReport &&
        new BundleAnalyzerPlugin({
          // analyzes our bundle
          analyzerMode: 'static',
          openAnalyzer: false
        }),
      isDevMode && new HotModuleReplacementPlugin(),
      isDevMode && new CaseSensitivePathsPlugin(),
      !isDevMode &&
        new MiniCssExtractPlugin({
          // css extraction
          filename: 'static/css/[name].[contenthash:8].css',
          chunkFilename: 'static/css/[name].[contenthash:8].[id].css'
        }),
      !isDevMode &&
        config.enablePWA &&
        new GenerateSW({
          // Service Workers
          exclude: [/\.map$/, /manifest\.json$/, /LICENSE/],
          mode: 'production',
          clientsClaim: true,
          skipWaiting: true
        }),
      new IgnorePlugin(/^\.\/locale$/, /moment$/), // These contin large locales
      config.allowENV && new Dotenv(), // will load .env variables
      new ESLintPlugin({
        extensions: ['js', 'ts'],
        files: 'src/',
        cache: true
      }), // will lint our files
      new StylelintPlugin({
        context: srcPath
      }), // will lint our css
      !isDevMode &&
        new CleanWebpackPlugin({
          verbose: true,
          cleanOnceBeforeBuildPatterns: [buildPath]
        }),
      new FriendlyErrorsWebpackPlugin()
    ].filter(Boolean),
    node: {
      global: false,
      __dirname: 'mock',
      __filename: 'mock'
    }
  };
};
