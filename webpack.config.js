import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import unzipper from 'unzipper';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin'
import demos from './demolist.js';
const demoList = demos.demos;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webpackEntry = {
    app: './src/index.js'
}

class UnzipPlugin {
    constructor(options) {
        this.zipPath = options.zipPath;
        this.outputPath = options.outputPath;
    }

    async apply(compiler) {

        if (!fs.existsSync(this.zipPath)) {
            throw new Error(`Zip file not found: ${this.zipPath}`);
        }

        console.log(`[UnzipPlugin] 解压 ${this.zipPath} 到 ${this.outputPath}`);
        await fs.createReadStream(this.zipPath)
            .pipe(unzipper.Extract({ path: this.outputPath }))
            .promise();
    }
}

const webpackPlugins = [
    new UnzipPlugin({
        zipPath: "assets/data/pointcloud/dragon.zip",
        outputPath: "assets/data/pointcloud"
    }),
    new UnzipPlugin({
        zipPath: "assets/data/pointcloud/swisssurface3d_2601_1199_EPSG3857_samples.zip",
        outputPath: "assets/data/pointcloud"
    }),
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

export default [{
    mode: 'development',
    context: __dirname,
    entry: webpackEntry,
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        extensions: ['.js', '.json'],
    },
    devtool: 'eval',
    module: {
        rules: [{
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
        }, , {
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
        }, {
            test: /\.geojson$/,
            type: 'json'
        }
        ]
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
