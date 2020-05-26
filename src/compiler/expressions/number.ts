import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTConstNode, Ref } from "../../WASTNode";
import { I64_TYPE, F64_TYPE } from "../LangType";
import { type_error } from "../error";

export function visit_number_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const ref = Ref.from_node(node);
	if (type_hint !== null && type_hint.is_numeric()) {
		const value = node.data as string;
		if (type_hint.is_integer() && (!should_create_int(value))) {
			type_error(node, "Inference believes this value should be an integer but it contains a fractional part");
		}
		return new WASTConstNode(ref, type_hint, node.data as string);
	}
	else {
		const value = node.data as string;
		const type = should_create_int(value) ? I64_TYPE : F64_TYPE;

		return new WASTConstNode(ref, type, node.data as string);
	}
}

function should_create_int (value: string): boolean {
	return !value.includes(".");
}