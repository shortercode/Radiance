import Parser from "./parser/index.js";
import Compiler from "./compiler/index.js";

const ast = Parser.parseProgram(`
func add (a: f64, b: f64) -> f64 {
    let c: f64 = a + b
    c
}

export add

`, "test program");

const wast = Compiler(ast);
console.log(JSON.stringify(wast, null, 2));