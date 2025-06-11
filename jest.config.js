export default {
    transform: {
        '^.+\\.js$': 'babel-jest',
        '\\.(glsl|vert|frag|txt|json)$': "<rootDir>/jest-raw-transformer.js"
    },
    moduleFileExtensions: ['js', 'json', 'glsl', 'vert', 'frag', 'txt']
};