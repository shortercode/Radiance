import { Ref } from "../../WASTNode";
import { parse_type, LangType } from "../LangType";
import { syntax_assert } from "../error";
import { Compiler, AST } from "../core";
import { TypePattern } from "../../parser/index";

function read_node_data (node: AST) {
	return node.data as {
		name: string,
		generics: string[],
		cases: Map<string, Map<string, TypePattern>>
	};
}

export function hoist_enum_declaration (compiler: Compiler, node: AST) {
	const data = read_node_data(node);
	const ctx = compiler.ctx;

	syntax_assert(data.cases.size > 0, node, `Unable to declare enum ${data.name} as it has no cases. Enums must have at least 1 case`);
	
	if (data.generics.length > 0) {
		ctx.declare_enum_template(Ref.from_node(node), data.name, data.cases, data.generics);
	}
	else {
		const cases: Map<string, Map<string, LangType>> = new Map;

		for (const [name, pattern] of data.cases) {
			const fields: Map<string, LangType> = new Map;
			for (const [field_name, field_pattern] of pattern) {
				const type = parse_type(field_pattern, ctx);
				fields.set(field_name, type);
			}
			cases.set(name, fields);
		}

		ctx.declare_enum(Ref.from_node(node), data.name, cases);
	}
}