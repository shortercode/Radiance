import { Ref } from "../../WASTNode";
import { Compiler, AST } from "../core";
import { parse_type } from "../LangType";
import { TypeNode } from "../../parser/ast";

export function hoist_type (compiler: Compiler, node: AST) {
	const data = (node as TypeNode).data;
	const ref = Ref.from_node(node);

	const type = parse_type(data.type, compiler.ctx);
	
	compiler.ctx.declare_type_alias(ref, data.name, type);
}