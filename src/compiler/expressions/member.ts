import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTLoadNode } from "../../WASTNode";
import { type_assert, compiler_assert, type_error, is_defined } from "../error";
import { StructAtiumType, TupleAtiumType } from "../AtiumType";

function read_node_data (node: AST) {
	return node.data as {
		target: AST,
		member: string
	};
}
export function visit_member_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const value = read_node_data(node);

	const target = compiler.visit_expression(value.target, null);
	const target_tuple_type = target.value_type.as_tuple();

	if (target_tuple_type) {
		return visit_tuple_member_expression(node, target, target_tuple_type, value.member);
	}
	
	const target_struct_type = target.value_type.as_struct();

	if (target_struct_type) {
		return visit_struct_member_expression(node, target, target_struct_type, value.member);
	}

	type_error(node, `Target does not have any properties`);
}

function visit_tuple_member_expression (node: AST, target: WASTExpressionNode, target_type: TupleAtiumType, member: string) {
	const index = parseInt(member);

	compiler_assert(isFinite(index), node, `Expected index to be a finite number`);

	const type_count = target_type.types.length;

	type_assert(index >= 0 && index < type_count, node, `Cannot read member ${index} of tuple, as it only contains ${type_count} members.`);

	const { type, offset } = target_type.types[index]!;

	return new WASTLoadNode(node, type, target, offset);
}

function visit_struct_member_expression (node: AST, target: WASTExpressionNode, target_type: StructAtiumType, member: string) {
	const member_type = target_type.types.get(member)!;

	type_assert(is_defined(member_type), node, `Cannot read member ${member} of tuple, as it doesn't contain a field of that name.`);
	// TODO add a "did you mean .blah_blah?"

	const { type, offset } = member_type;
	return new WASTLoadNode(node, type, target, offset);
}