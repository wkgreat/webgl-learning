import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import unzipper from 'unzipper';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin'
import demos from './src/demolist.js';
const webglDemos = demos.webglDemos;
const webgpuDemos = demos.webgpuDemos;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webpackEntry = {
    index: './src/index.jsx'
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
        template: 'src/index.html',
        chunks: ['index'],
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

for (const demo of webglDemos) {
    const gltype = "webgl";
    const entryName = `${gltype}-${demo.name}`
    webpackEntry[entryName] = `./src/demos/${gltype}/${demo.name}/${demo.name}`;
    webpackPlugins.push(new HtmlWebpackPlugin({
        template: `src/demos/${gltype}/${demo.name}/${demo.name}.html`,
        filename: `${gltype}-${demo.name}.html`,
        chunks: [entryName]
    }));
}

for (const demo of webgpuDemos) {
    const gltype = "webgpu";
    const entryName = `${gltype}-${demo.name}`
    webpackEntry[entryName] = `./src/demos/${gltype}/${demo.name}/${demo.name}`;
    webpackPlugins.push(new HtmlWebpackPlugin({
        template: `src/demos/${gltype}/${demo.name}/${demo.name}.html`,
        filename: `${gltype}-${demo.name}.html`,
        chunks: [entryName]
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
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    devtool: 'eval',
    module: {
        rules: [{
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
        }, {
            test: /\.jsx$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
        },
        {
            test: /\.ts$/,
            loader: 'ts-loader',
            exclude: /node_modules/,
        },
        {
            test: /\.tsx$/,
            loader: 'ts-loader',
            exclude: /node_modules/,
        },
        {
            test: /\.css$/,
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
        port: 9010
    }
}];
