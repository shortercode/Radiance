import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTConstNode } from "../../WASTNode";
import { syntax_assert, type_assert } from "../error";
import { create_object } from "./object";
import { create_array_type, I32_TYPE } from "../AtiumType";

function read_node_data (node: AST) {
	return node.data as Array<AST>;
}

export function visit_array_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const values = [];
	const statements = read_node_data(node);

	syntax_assert(statements.length > 0, node, `Array literals must contain at least 1 element`);

	let inner_type_hint = null;

	if (type_hint && type_hint.as_array()) {
		inner_type_hint = type_hint.as_array()!.type;
	}

	const first = statements.slice(0, 1)[0];
	const rest = statements.slice(1);

	const first_element = compiler.visit_local_statement(first, inner_type_hint);
	values.push(first_element);

	const inner_type = first_element.value_type;

	for (const stmt of rest) {
		const result = compiler.visit_local_statement(stmt, inner_type);
		type_assert(inner_type.equals(result.value_type), stmt, ``);
		values.push(result);
	}

	/*
		Arrays contain an additional value at the start which contains the length
	*/
	const length_value = new WASTConstNode(node, I32_TYPE, values.length.toString());
	values.push(length_value);

	const array_type = create_array_type(inner_type, values.length);
	
	return create_object(compiler, node, array_type, values);
}