import { AST, Compiler } from "../core";
import { TypePattern } from "../../parser/index";
import { syntax_assert } from "../error";
import { parse_type } from "../LangType";
import { Ref } from "../../WASTNode";

function read_node_data (node: AST) {
	return node.data as {
		name: string,
		fields: Map<string, TypePattern>,
		generics: string[]
	};
}

export function hoist_struct_declaration(compiler: Compiler, node: AST) {
	const data = read_node_data(node);
	const ctx = compiler.ctx;

	syntax_assert(data.fields.size > 0, node, `Unable to declare struct ${data.name} as it has no fields. Structs must have at least 1 field`);
	
	if (data.generics.length > 0) {
		const fields = new Map;

		for (const [name, pattern] of data.fields) {
			fields.set(name, pattern);
		}
	
		ctx.declare_struct_template(Ref.from_node(node), data.name, fields, data.generics);
	}
	else {
		const fields = new Map;

		for (const [name, pattern] of data.fields) {
			const type = parse_type(pattern, ctx);
			fields.set(name, type);
		}
	
		ctx.declare_struct(Ref.from_node(node), data.name, fields);
	}
}