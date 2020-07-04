import { Ref } from "../../WASTNode";
import { Compiler, AST } from "../core";
import { TypePattern } from "../../parser/index";
import { parse_type } from "../LangType";

export function hoist_type (compiler: Compiler, node: AST) {
	const data = node.data as {
		name: string,
		type: TypePattern
	};
	const ref = Ref.from_node(node);

	const type = parse_type(data.type, compiler.ctx);
	
	compiler.ctx.declare_type_alias(ref, data.name, type);
}