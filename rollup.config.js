import typescript from 'rollup-plugin-typescript2';
 
export default {
    input: './src/index.ts',
    output: [
        {
            file: "dist/radiance.js",
            format: "cjs"
        }
    ],
 
    plugins: [
        typescript(/*{ plugin options }*/)
    ]
}