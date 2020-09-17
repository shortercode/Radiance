import { Compiler, TypeHint, AST } from "../core";
import { WASTExpressionNode, WASTConstNode, Ref } from "../../WASTNode";
import { type_assert, type_error } from "../error";
import { create_object } from "./object";
import { create_array_type, I32_TYPE } from "../LangType";
import { find_common_type } from "../find_common_type";
import { ArrayNode } from "../../parser/ast";

function read_node_data (node: AST) {
	return (node as ArrayNode).data;
}

export function visit_array_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const values = [];
	const statements = read_node_data(node);
	const ref = Ref.from_node(node);

	let inner_type_hint = null;

	if (type_hint && type_hint.is_array()) {
		inner_type_hint = type_hint.type;
	}

	let inner_type = type_hint;

	if (statements.length > 0) {
		const first = statements.slice(0, 1)[0];
		const rest = statements.slice(1);

		const first_element = compiler.visit_expression(first, inner_type_hint);
		values.push(first_element);

		/*
			If the type hint is a loose type that the inner type matches, then make
			the type of the array be that loose type. Otherwise use the strict type
			of the first value.

			This allows for an array of enum variants, provided a hint for the enum
			is used.

			An additional system could be to modify the inner type if the second
			value was inconsistent with the strict type, but they had a common loose
			type ( such as enum vs variants again ). This allows literal arrays of a
			common loose type to be created without type hints.
		*/
		if (inner_type_hint?.equals(first_element.value_type)) {
			inner_type = inner_type_hint;
		}
		else {
			inner_type = first_element.value_type;
		}

		for (let i = 0; i < rest.length; i++) {
			const stmt = rest[i];
			const result = compiler.visit_expression(stmt, inner_type);
			const ref = Ref.from_node(stmt);
			const common_type = find_common_type(ref, inner_type, result.value_type);
			if (common_type) {
				inner_type = common_type;
			}
			else {
				type_error(ref, `Inconsistent array literal types. First element is ${inner_type.name}, but element ${i + 1} is ${result.value_type.name}`);
			}
			values.push(result);
		}
	}
	else {
		type_assert(inner_type !== null, ref, `Unable to infer the type of empty array, please add type annotation`);
		inner_type = inner_type!;
	}

	type_assert(inner_type.is_void() === false, ref, `Cannot have an array of type "void"`);

	const array_type = create_array_type(inner_type, values.length);

	// Arrays contain an additional value at the start which contains the length

	const length_value = new WASTConstNode(ref, I32_TYPE, values.length.toString());
	values.unshift(length_value);
	
	return create_object(compiler, ref, array_type, values);
}
