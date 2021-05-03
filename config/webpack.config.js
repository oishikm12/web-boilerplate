const path = require('path');
const fs = require('fs-extra');

const { HotModuleReplacementPlugin, IgnorePlugin } = require('webpack'); // HMR
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer'); // Analyzes Build
const PnpWebpackPlugin = require('pnp-webpack-plugin'); // Yarn Plug n Play
const HtmlWebpackPlugin = require('html-webpack-plugin'); // To handle HTML
const HtmlWebpackInlineSVGPlugin = require('html-webpack-inline-svg-plugin'); // To optimize svg
const { WebpackManifestPlugin } = require('webpack-manifest-plugin'); // Generates manifest
const { CleanWebpackPlugin } = require('clean-webpack-plugin'); // To reset build folder
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin'); // Path Resolution
const MiniCssExtractPlugin = require('mini-css-extract-plugin'); // Minify CSS
const TerserJSPlugin = require('terser-webpack-plugin'); // Minify JS
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin'); // Better Minimize CSS
const Dotenv = require('dotenv-webpack'); // Enables environment Variable Injection
const { GenerateSW } = require('workbox-webpack-plugin'); // Service Worker
const ESLintPlugin = require('eslint-webpack-plugin'); // JS Linting
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin'); // Type Checking
const StylelintPlugin = require('stylelint-webpack-plugin'); // Style Linting
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin'); // Output

const { getPaths, resolve } = require('./addons/paths');
const { getFilesFromDir, getConfig } = require('./addons/files');

const { buildPath, srcPath } = getPaths();
const config = getConfig();

const getHTMLPlugins = (dev) => {
  const ext = config.enableHBS ? '.hbs' : '.html';
  const files = getFilesFromDir(srcPath, [ext]);
  const plugins = files.map((file) => {
    const fileName = path.basename(file);
    const data = {
      chunks: [fileName.replace(path.extname(fileName), ''), 'vendor'],
      template: file,
      scriptLoading: 'defer',
      filename: fileName,
      meta: {
        viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
        'theme-color': '#fff',
      },
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
        minifyURLs: true,
      };
    }
    return new HtmlWebpackPlugin(data);
  });
  return plugins;
};

const getEntires = () => {
  const ext = config.enableHBS ? '.hbs' : '.html';
  const fileExt = config.enableTypescript ? 'ts' : 'js';
  const entryNames = {};
  const files = getFilesFromDir(srcPath, [ext]);
  files.forEach((file) => {
    const chunkName = path.basename(file).replace(path.extname(file), '');
    entryNames[chunkName] = resolve(['src', 'scripts', `${chunkName}.${fileExt}`]);
  });
  return entryNames;
};

const getHTMLLoader = () => {
  let action = {
    test: /\.html$/i,
    loader: 'html-loader',
    options: {
      esModule: true,
    },
  };

  if (config.enableHTMLPartials) {
    action.options.preprocessor = (content, loaderContext) =>
      content.replace(/<include src="(.+)"\s*\/?>(?:<\/include>)?/gi, (m, src) => {
        const filePath = path.resolve(loaderContext.context, src);
        loaderContext.dependency(filePath);
        return fs.readFileSync(filePath, 'utf8');
      });
  }

  if (config.enableHBS) {
    action = {
      test: /\.hbs$/i,
      loader: 'handlebars-loader',
    };
  }

  return action;
};

const getJSLoaders = (dev) => {
  const loader = {
    test: /\.(js|mjs)$/,
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
            corejs: 3,
          },
        ],
      ],
    },
  };

  if (config.enableTypescript) {
    loader.test = /\.ts$/;

    loader.options.presets.push([
      '@babel/preset-typescript',
      {
        onlyRemoveTypeImports: true,
      },
    ]);
  }

  return loader;
};

const getStyleLoaders = (dev) => {
  const productionLoader = {
    loader: MiniCssExtractPlugin.loader,
    options: config.publicUrl.startsWith('.') ? { publicPath: buildPath } : {},
  };

  const sassLoader = {
    loader: 'sass-loader',
    options: {
      sourceMap: true,
      sassOptions: {
        fiber: false,
      },
    },
  };

  const loaders = [
    'style-loader',
    {
      loader: 'css-loader',
      options: {
        importLoaders: 3,
        sourceMap: !dev ? config.enableSourceMap : dev,
      },
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
                  flexbox: 'no-2009',
                },
                stage: 3,
              },
            ],
            'postcss-normalize',
          ],
        },
      },
    },
    {
      loader: 'resolve-url-loader',
      options: {
        sourceMap: !dev ? config.enableSourceMap : dev,
        root: srcPath,
      },
    },
  ];

  if (!dev) loaders[0] = productionLoader;
  if (config.enableSass === true) {
    loaders.push(sassLoader);
    return {
      test: /\.scss$/,
      use: loaders,
    };
  } else {
    return {
      test: /\.css$/,
      use: loaders,
    };
  }
};

const getImageLoaders = (dev) => {
  const loaders = [
    {
      test: [/\.bmp$/, /\.webp$/],
      type: 'asset',
      parser: {
        dataUrlCondition: {
          maxSize: config.imageInlineLimit,
        },
      },
      generator: {
        filename: 'static/media/[name].[hash:8][ext]',
      },
    },
    {
      test: [/\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/],
      type: 'asset',
      parser: {
        dataUrlCondition: {
          maxSize: config.imageInlineLimit,
        },
      },
      generator: {
        filename: 'static/media/[name].[hash:8][ext]',
      },
    },
  ];

  if (!dev) {
    loaders[1].use = [
      {
        loader: 'image-webpack-loader',
      },
    ];
  }

  return loaders;
};

const getFileLoaders = () => {
  const loaders = [
    {
      test: /\.(ttf|eot|woff|woff2)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[name].[hash:8][ext]',
      },
    },
    {
      type: 'asset/resource',
      exclude: [/\.(js|mjs|ts)$/, /\.html$/, /\.json$/],
      generator: {
        filename: 'static/data/[name].[hash:8][ext]',
      },
    },
  ];

  return loaders;
};

module.exports = (env, options) => {
  const isDevMode = options.mode === 'development';
  const BASE_PATH = isDevMode ? '/' : config.publicUrl;

  return {
    target: 'web',
    devtool: isDevMode ? 'cheap-module-source-map' : config.enableSourceMap && 'source-map',
    bail: !isDevMode,
    entry: getEntires(),
    output: {
      path: !isDevMode ? buildPath : undefined,
      pathinfo: isDevMode,
      filename: isDevMode ? 'static/js/[name].bundle.js' : 'static/js/[name].[contenthash:8].js',
      chunkFilename: isDevMode
        ? 'static/js/[name].chunk.js'
        : 'static/js/[name].[contenthash:8].chunk.js',
      publicPath: BASE_PATH,
      globalObject: 'this',
      devtoolModuleFilenameTemplate: !isDevMode
        ? (info) => path.relative(srcPath, info.absoluteResourcePath).replace(/\\/g, '/')
        : (info) => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
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
        errors: true,
      },
    },
    resolve: {
      alias: {
        src: srcPath,
        styles: resolve(['src', 'styles']),
        scripts: resolve(['src', 'scripts']),
        assets: resolve(['src', 'assets']),
      },
      plugins: [PnpWebpackPlugin],
    },
    resolveLoader: {
      plugins: [PnpWebpackPlugin.moduleLoader(module)],
    },
    optimization: {
      usedExports: true,
      runtimeChunk: {
        name: (entrypoint) => `runtime-${entrypoint.name}`,
      },
      splitChunks: {
        chunks: 'all',
        name: false,
      },
      minimize: !isDevMode,
      minimizer: [
        new TerserJSPlugin({
          parallel: true,
          terserOptions: {
            sourceMap: true,
            parse: {
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
        }),
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: ['default', { minifyFontValues: { removeQuotes: false } }],
          },
        }),
      ],
    },
    module: {
      strictExportPresence: true,
      rules: [
        {
          oneOf: [
            getHTMLLoader(),
            getJSLoaders(isDevMode),
            getStyleLoaders(isDevMode),
            ...getImageLoaders(isDevMode),
            ...getFileLoaders(),
          ],
        },
      ],
    },
    plugins: [
      ...getHTMLPlugins(isDevMode),
      new HtmlWebpackInlineSVGPlugin(),
      isDevMode &&
        config.generateReport &&
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        }),
      isDevMode && new HotModuleReplacementPlugin(),
      isDevMode && new CaseSensitivePathsPlugin(),
      !isDevMode &&
        new MiniCssExtractPlugin({
          // css extraction
          filename: 'static/css/[name].[contenthash:8].css',
          chunkFilename: 'static/css/[name].[contenthash:8].[id].css',
        }),
      !isDevMode &&
        config.enablePWA &&
        new GenerateSW({
          exclude: [/\.map$/, /manifest\.json$/, /LICENSE/],
          mode: 'production',
          clientsClaim: true,
          skipWaiting: true,
        }),
      !isDevMode &&
        new WebpackManifestPlugin({
          fileName: 'asset-manifest.json',
          publicPath: config.publicUrl,
          generate: (seed, files, entrypoints) => {
            const manifestFiles = files.reduce((manifest, file) => {
              manifest[file.name] = file.path;
              return manifest;
            }, seed);
            const entrypointFiles = entrypoints.main?.filter(
              (fileName) => !fileName.endsWith('.map'),
            );

            return {
              files: manifestFiles,
              entrypoints: entrypointFiles,
            };
          },
        }),
      new IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      config.allowENV && new Dotenv(),
      config.enableTypescript &&
        new ForkTsCheckerWebpackPlugin({
          async: isDevMode,
          typescript: {
            context: srcPath,
            diagnosticOptions: {
              syntactic: true,
            },
            mode: 'write-references',
          },
        }),
      new ESLintPlugin({
        extensions: ['js', 'ts', 'mjs'],
        files: srcPath,
        cache: true,
        cacheLocation: resolve(['node_modules', '.cache', '.eslintcache']),
      }),
      new StylelintPlugin({
        context: srcPath,
      }),
      !isDevMode &&
        new CleanWebpackPlugin({
          verbose: true,
          cleanOnceBeforeBuildPatterns: [buildPath],
        }),
      new FriendlyErrorsWebpackPlugin(),
    ].filter(Boolean),
    node: {
      global: false,
      __dirname: 'mock',
      __filename: 'mock',
    },
  };
};
