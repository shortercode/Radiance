import * as WAST from "./WASTNode.js"
import Node from "../pratt/Node.js";
import { AtiumType } from "./AtiumType.js";
import { Context } from "./Context.js";
import { FunctionDeclaration } from "./FunctionDeclaration.js";

export default function (node: Node): WAST.WASTModuleNode {
    const ctx: Context = new Context;
    if (node.type !== "module")
        throw new Error(`Invalid node type ${node.type} expected a module`);
    return visit_module(node, ctx);
}

function visit_module(node: Node, ctx: Context): WAST.WASTModuleNode {
    /*
        This is entry point to the compiler
        the public exported function does some simple setup
        and input verification but this actually creates the
        module and recusively visits the source AST
    */

    const module = new WAST.WASTModuleNode;

    const statements = node.data as Array<Node>;

    /*
        Before processing the bulk of the AST we visit
        the functions and create them so that they can
        refer to each other in their bodies
    */
    for (const stmt of statements) {
        hoist_declaration(stmt, ctx);
    }

    for (const stmt of statements) {
        const wast_stmt = visit_statement(stmt, ctx);
        module.statements.push(wast_stmt);
    }

    const memory_stmt = new WAST.WASTMemoryNode("main", 1);

    module.statements.push(memory_stmt);

    return module;
}

function hoist_declaration(node: Node, ctx: Context) {
    switch (node.type) {
        case "function": {
            const data = node.data as {
                name: string
                type: string
                parameters: Array<{ name: string, type: string }>
                block: Node
            }

            const parameters = data.parameters.map(param => ({
                name: param.name,
                type: validateAtiumType(param.type)
            }));

            ctx.declare_function(data.name, validateAtiumType(data.type), parameters);
            break;
        }
    }
}

function visit_statement(node: Node, ctx: Context): WAST.WASTStatementNode {
    switch (node.type) {
        case "function": {
            /*
                NOTE prior to this "visit_declaration" has validated the
                .type and .parameter.*.type are AtiumType so we can do a
                direct cast here without the validation
            */
            const data = node.data as {
                name: string
                type: AtiumType
                parameters: Array<{ name: string, type: AtiumType }>
                block: Node
            }

            const fn_wast = new WAST.WASTFunctionNode(data.name, downgrade_type(data.type));

            ctx.create_environment();

            for (const { name, type } of  data.parameters) {
                ctx.declare_variable(name, type);
                fn_wast.parameters.push(downgrade_type(type));
            }
        
            const expr = visit_expression(data.block, ctx) as WAST.WASTBlockNode;
            ctx.exit_environment();

            fn_wast.body = expr; 

            return fn_wast;
        }
        case "export": {
            const data = node.data as {
                name: string
            };
            const fn = ctx.get_global(data.name);

            if (!fn)
                throw new Error(`Cannot export ${data.name} as it is not available in the global scope`);

            if (fn instanceof FunctionDeclaration) {
                for (const {name, type} of fn.parameters) {
                    const real_type = downgrade_type(type);
                    if (real_type === "i64") {
                        throw new Error(`Cannot export ${data.name} because the parameter ${name} is the type "i64" which cannot be used in exported functions`);
                    }
                }
                const return_type = downgrade_type(fn.type);
                if (return_type === "i64") {
                    throw new Error(`Cannot export ${data.name} because the return type is "i64" which cannot be used in exported functions`);
                }
            }
            else
                throw new Error(`Cannot export ${data.name} as it's not a function`);

            return new WAST.WASTExportNode(data.name, data.name);
        }
        default: throw new Error(`Invalid node type ${node.type} @ ${node.start} expected a statement`);
    }
}

/*
    convert an AtiumType to a WASTType
*/
function downgrade_type (type: AtiumType): WAST.WASTType {
    switch (type) {
        case "f32":
        case "f64":
        case "i32":
        case "i64":
            return type;
        // everything else is a pointer, we ditch the type
        // information associated with it, as thats just for
        // this stage of the compiler, and just turn it into
        // a number
        default:
            // NOTE we use i32 for the pointer type because this
            // allows us to send it to JS land unlike i64
            return "i32";
    }
}

function validateAtiumType(type: string): AtiumType {
    switch (type) {
        case "f32":
        case "f64":
        case "i32":
        case "i64":
            return type;
        default:
            throw new Error(`Illegal type ${type}`);
    }
}

function visit_nested_statement(node: Node, ctx: Context): WAST.WASTExpressionNode {
    switch (node.type) {
        case "expression":
            return visit_expression(node.data as Node, ctx);
        case "variable": {
            const data = node.data as {
                name: string
                type: string
                initial: Node
            };
            ctx.declare_variable(data.name, validateAtiumType(data.type));
            const value = visit_expression(data.initial, ctx);
            // TODO type validation
            return new WAST.WASTSetLocalNode(data.name, value);
        }
        default: throw new Error(`Invalid node type ${node.type} @ ${node.start} expected a statement`);
    }
}

function visit_expression(node: Node, ctx: Context): WAST.WASTExpressionNode | null {
    switch (node.type) {
        case "block": {
            const wast_block = new WAST.WASTBlockNode;
            const statements = node.data as Array<Node>;
            for (const stmt of statements) {
                const result = visit_nested_statement(stmt, ctx);
                if (result !== null)
                    wast_block.body.push(result);
            }
            return wast_block;
        }
        case "number": {
            return new WAST.WASTConstNode("f64", node.data as string);
        }
        case "boolean": {
            const value = node.data as string;
            if (value === "false") {
                return new WAST.WASTConstNode("i32", "0");
            }
            else if (value === "true") {
                return new WAST.WASTConstNode("i32", "1");
            }
            else {
                throw new Error(`Invalid boolean value`);
            }
        }
        case "identifier": {
            const name = node.data as string;
            const variable = ctx.get_local(name);
            // TODO validate type checks!
            return new WAST.WASTGetLocalNode(name);
        }
        case "+": {
            const data = node.data as {
                left: Node
                right: Node
            };
            const left = visit_expression(data.left, ctx);
            const right = visit_expression(data.right, ctx);
            return new WAST.WASTAddNode("f64", left, right);
        }

        default: throw new Error(`Invalid node type ${node.type} @ ${node.start} expected an expression`);;
    }
}