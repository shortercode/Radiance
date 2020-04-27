import { Compiler, AST } from "../core";
import { WASTStatementNode, WASTImportFunctionNode } from "../../WASTNode";
import { TypePattern } from "../../parser/index";
import { is_defined, compiler_assert } from "../error";
import { parse_type } from "../AtiumType";

function read_node_data (node: AST) {
	return node.data as {
		name: string,
		parameters: Array<{ name: string, type: TypePattern }>,
		type: TypePattern
	}
}

export function visit_import_function (compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const data = read_node_data(node);
	const ctx = compiler.ctx;
	const fn_decl = ctx.get_function(data.name)!; 
	compiler_assert(is_defined(fn_decl), node, "Cannot locate function declaration");

	const parameters = data.parameters.map(param => parse_type(param.type, ctx));
	const return_type = parse_type(data.type, ctx);

	return [
		new WASTImportFunctionNode(node, fn_decl.id, data.name, return_type, parameters)
	];
}