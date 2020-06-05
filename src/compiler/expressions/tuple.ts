import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTNodeList, Ref } from "../../WASTNode";
import { LangType, create_tuple_type } from "../LangType";
import { create_object } from "./object";

function read_node_data (node: AST) {
	return node.data as {
		values: Array<AST>
	};
}

export function visit_tuple_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const data = read_node_data(node);
	const ref = Ref.from_node(node);

	// TODO remove this
	if (data.values.length === 0) {
		return new WASTNodeList(Ref.from_node(node)); // this is equivilent to returning a void value, without actually returning one ( as void is the abscense of a value )
	}

	const value_types: Array<LangType> = [];
	const values: Array<WASTExpressionNode> = [];
	let type_hints = null;

	if (type_hint && type_hint.is_tuple()) {
		const types = type_hint.types;
		if (types.length === data.values.length) {
			type_hints = types.map(({ type }) => type);
		}
	}

	for (const sub_expr of data.values) {
		const type_hint = type_hints ? type_hints.shift()! : null;
		const value = compiler.visit_expression(sub_expr, type_hint);

		value_types.push(value.value_type);
		values.push(value);
	}

	const tuple_type = create_tuple_type(value_types);

	return create_object(compiler, ref, tuple_type, values);
}