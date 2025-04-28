const path = require('path');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const demoList = require('./demolist.json').demos;

const webpackEntry = {
    app: './src/index.js'
}
const webpackPlugins = [
    new HtmlWebpackPlugin({
        template: 'src/index.html'
    }),
    new CopyWebpackPlugin({
        patterns: [
            {
                from: 'assets',
                to: 'assets'
            }
        ]
    })
];

for (const demo of demoList) {
    console.log(demo);
    webpackEntry[demo.name] = `./src/${demo.name}/${demo.name}.js`;
    webpackPlugins.push(new HtmlWebpackPlugin({
        template: `src/${demo.name}/${demo.name}.html`,
        filename: `${demo.name}.html`
    }));
}

module.exports = [{
    mode: 'development',
    context: __dirname,
    entry: webpackEntry,
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    devtool: 'eval',
    module: {
        rules: [{
            test: /\.css$/,
            exclude: /node_modules/,
            use: ['style-loader', 'css-loader']
        }, {
            test: /\.(png|gif|jpg|jpeg|svg|xml)$/,
            exclude: /node_modules/,
            use: ['url-loader']
        }, {
            test: /\.(glsl|vs|fs|vert|frag)$/,
            exclude: /node_modules/,
            use: ['raw-loader']
        }]
    },
    plugins: webpackPlugins,

    // development server options
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 9000
    }
}];
