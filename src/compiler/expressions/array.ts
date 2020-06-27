import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTConstNode, Ref } from "../../WASTNode";
import { type_assert, type_error } from "../error";
import { create_object } from "./object";
import { create_array_type, I32_TYPE, EnumCaseLangType, LangType } from "../LangType";

function read_node_data (node: AST) {
	return node.data as Array<AST>;
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
			if (inner_type.equals(result.value_type) === false) {
				const ref = Ref.from_node(stmt);
				inner_type = find_common_type(ref, i + 1, inner_type, result.value_type);
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

function find_common_type (ref: Ref, index: number, a: LangType, b: LangType): LangType {

	if (a.is_enum() && b.is_enum()) {
		if (a instanceof EnumCaseLangType) {
			a = a.parent;
		}
		if (b instanceof EnumCaseLangType) {
			b = b.parent;
		}

		if (a.equals(b)) {
			return a;
		}
	}
	else if (a.is_array() && b.is_array()) {
		let count = a.count;
		let common_type = a.type;

		if (a.count !== b.count) {
			count = -1;
		}
		if (a.type.equals(b.type) === false) {
			// NOTE calling this recursively is losing type information for the error case
			common_type = find_common_type(ref, index, a.type, b.type);
		}
		
		return create_array_type(common_type, count);
	}

	type_error(ref, `Inconsistent array literal types. First element is ${a.name}, but element ${index + 1} is ${b.name}`);
}