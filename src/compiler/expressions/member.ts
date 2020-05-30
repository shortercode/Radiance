import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTLoadNode, WASTNotNode, Ref } from "../../WASTNode";
import { type_assert, compiler_assert, type_error, is_defined, compiler_error } from "../error";
import { StructLangType, TupleLangType, I32_TYPE } from "../LangType";

function read_node_data (node: AST) {
	return node.data as {
		target: AST,
		member: string
	};
}

export function visit_member_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const value = read_node_data(node);
	const ref = Ref.from_node(node);

	const target = compiler.visit_expression(value.target, null);
	const target_tuple_type = target.value_type.as_tuple();

	if (target_tuple_type) {
		return visit_tuple_member_expression(ref, target, target_tuple_type, value.member);
	}
	
	const target_struct_type = target.value_type.as_struct();

	if (target_struct_type) {
		return visit_struct_member_expression(ref, target, target_struct_type, value.member);
	}

	const target_array_type = target.value_type.as_array();

	if (target_array_type) {
		return visit_array_member_expression(ref, target, value.member);
	}

	if (target.value_type.is_string()) {
		return visit_string_member_expression(ref, target, value.member);
	}

	type_error(node, `Target does not have any properties`);
}

function visit_tuple_member_expression (ref: Ref, target: WASTExpressionNode, target_type: TupleLangType, member: string) {
	const index = parseInt(member);

	compiler_assert(isFinite(index), ref, `Expected index to be a finite number`);

	const type_count = target_type.types.length;

	type_assert(index >= 0 && index < type_count, ref, `Cannot read member ${index} of tuple, as it only contains ${type_count} members.`);

	const { type, offset } = target_type.types[index]!;

	return new WASTLoadNode(ref, type, target, offset);
}

function visit_struct_member_expression (ref: Ref, target: WASTExpressionNode, target_type: StructLangType, member: string) {
	const member_type = target_type.types.get(member)!;

	type_assert(is_defined(member_type), ref, `Cannot read member ${member} of tuple, as it doesn't contain a field of that name.`);
	// TODO add a "did you mean .blah_blah?"

	const { type, offset } = member_type;
	return new WASTLoadNode(ref, type, target, offset);
}

function visit_string_member_expression (ref: Ref, target: WASTExpressionNode, member: string) {
	// TODO this can be optimised for fixed length strings
	switch (member) {
		case "byte_length":
		return new WASTLoadNode(
			ref,
			I32_TYPE,
			target,
			0
		);
	}
	compiler_error(ref, `Target does not have any properties`);
}

function visit_array_member_expression (ref: Ref, target: WASTExpressionNode, member: string) {
	// TODO this can be optimised for fixed length arrays
	switch (member) {
		case "length":
		return new WASTLoadNode(
			ref,
			I32_TYPE,
			target,
			0
		);
		case "is_empty":
		return new WASTNotNode(ref, 
			new WASTLoadNode(
				ref,
				I32_TYPE,
				target,
				0
			)
		);
	}
	compiler_error(ref, `Target does not have any properties`);
}