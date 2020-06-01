import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, Ref, WASTStoreNode, WASTSetLocalNode } from "../../WASTNode";
import { syntax_assert, is_defined, type_assert, syntax_error, type_error, compiler_error, compiler_assert } from "../error";
import { TupleLangType, StructLangType, ArrayLangType, LangType, I32_TYPE } from "../LangType";
import { bounds_check, ensure_int32 } from "./subscript";

function read_node_data<T = unknown> (node: AST) {
	return node.data as {
		left: AST<T>,
		right: AST
	};
}

export function visit_assignment_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const value = read_node_data(node);
	const ref = Ref.from_node(node);
	return get_assignment_visitor(compiler, ref, value.left)(value.right);
}

function get_assignment_visitor (compiler: Compiler, ref: Ref, left: AST): (right: AST) => WASTExpressionNode{
	switch (left.type) {
		case "identifier": {
			const left_def = left as AST<string>;
			return (right: AST) => visit_variable_assignment_expression(compiler, ref, left_def, right);
		}
		case "member": {
			const left_def = left as AST<{ target: AST, member: string }>;
			return (right: AST) => visit_member_assignment(compiler, ref, left_def, right);
		}
		case "subscript": {
			const left_def = left as AST<{ target: AST, accessor: AST }>;
			return (right: AST) => visit_subscript_assignment(compiler, ref, left_def, right);
		}
		case "grouping": {
			const left_def = left as AST<AST>;
			return (right: AST) => visit_grouping_assignment(compiler, ref, left_def, right);
		}
		default:
		syntax_error(ref, `Invalid left hand in assignment`);
	}
}

function visit_member_assignment (compiler: Compiler, ref: Ref, left: AST<{ target: AST, member: string }>, right: AST): WASTExpressionNode {
	const target_expr = compiler.visit_expression(left.data.target, null);
	const target_type = target_expr.value_type;
	const member_name = left.data.member;

	if (target_type.as_tuple() !== null) {
		return visit_tuple_member_assignment(compiler, ref, target_expr, target_type.as_tuple()!, member_name, right);
	}
	
	if (target_type.as_struct() !== null) {
		return visit_struct_member_assignment(compiler, ref, target_expr, target_type.as_struct()!, member_name, right);
	}

	if (target_type.as_array() !== null) {
		return visit_array_member_assignment(compiler, ref, target_expr, target_type.as_array()!, member_name, right);
	}

	if (target_type.is_string()) {
		return visit_string_member_assignment(compiler, ref, target_expr, member_name, right);
	}

	type_error(ref, `Target does not have any properties`);
}

function visit_tuple_member_assignment (compiler: Compiler, ref: Ref, target: WASTExpressionNode, target_type: TupleLangType, member: string, right: AST) {
	const index = parseInt(member);

	compiler_assert(isFinite(index), ref, `Expected index to be a finite number`);

	const type_count = target_type.types.length;

	type_assert(index >= 0 && index < type_count, ref, `Cannot write member ${index} of tuple, as it only contains ${type_count} members.`);

	const { type, offset } = target_type.types[index]!;
	const expr = compiler.visit_expression(right, type);

	assign_type_check(ref, type, expr.value_type);

	return new WASTStoreNode(ref, target, offset, expr);
}

function visit_struct_member_assignment (compiler: Compiler, ref: Ref, target: WASTExpressionNode, target_type: StructLangType, member: string, right: AST) {
	const member_type = target_type.types.get(member)!;

	type_assert(is_defined(member_type), ref, `Cannot read member ${member} of tuple, as it doesn't contain a field of that name.`);
	// TODO add a "did you mean .blah_blah?"

	const { type, offset } = member_type;
	const expr = compiler.visit_expression(right, type);

	assign_type_check(ref, type, expr.value_type);

	return new WASTStoreNode(ref, target, offset, expr);
}

function visit_string_member_assignment (_compiler: Compiler, ref: Ref, _target: WASTExpressionNode, member: string, _right: AST):never {
	switch (member) {
		case "length":
		type_error(ref, `${member} is read-only.`)
	}
	compiler_error(ref, `Target does not have any properties.`);
}

function visit_array_member_assignment (_compiler: Compiler, ref: Ref, _target: WASTExpressionNode, _target_type: ArrayLangType, member: string, _right: AST):never {
	switch (member) {
		case "length":
		case "isEmpty":
		type_error(ref, `${member} is read-only.`);
		default:
		compiler_error(ref, `Target does not have any properties.`);
	}
}

function visit_subscript_assignment (compiler: Compiler, ref: Ref, left: AST<{ target: AST, accessor: AST }>, right: AST) {
	
	const target = compiler.visit_expression(left.data.target, null);
	const target_array_type = target.value_type.as_array();

	if (target_array_type) {
		return visit_array_subscript_assignment(compiler, ref, target, left.data.accessor, right);
	}

	if (target.value_type.is_string()) {
		return visit_string_subscript_assignment(compiler, ref, target, left.data.accessor, right);
	}

	type_error(ref, `Target does not have any entries`);
}

function visit_array_subscript_assignment (compiler: Compiler, ref: Ref, target: WASTExpressionNode, accessor: AST, right: AST) {	
	const accessor_expression = ensure_int32(ref, compiler.visit_expression(accessor, I32_TYPE));

	const index = bounds_check(compiler, ref, target, accessor_expression);
	const type = target.value_type.as_array()!.type;

	const expr = compiler.visit_expression(right, type);

	assign_type_check(ref, type, expr.value_type);

	return new WASTStoreNode(ref, index, 0, expr);
}

function visit_string_subscript_assignment (_compiler: Compiler, ref: Ref, _target: WASTExpressionNode, _accessor: AST, _right: AST): never {	
	syntax_error(ref, `Unable to modify read-only string.`);
}

function visit_grouping_assignment (compiler: Compiler, ref: Ref, left: AST<AST>, right: AST) {
	return get_assignment_visitor(compiler, ref, left)(right);
}

function visit_variable_assignment_expression (compiler: Compiler, ref: Ref, left: AST<string>, right: AST): WASTExpressionNode {
	const variable_name = left.data;
	const variable = compiler.ctx.get_variable(variable_name)!;
	
	syntax_assert(is_defined(variable), ref, `Unable to assign to undeclared variable ${variable_name}`);
	
	const new_value = compiler.visit_expression(right, variable.type);
	
	assign_type_check(ref, variable.type, new_value.value_type);
	
	return new WASTSetLocalNode(ref, variable.id, variable.name, new_value);
}

function assign_type_check (ref: Ref, l_type: LangType, r_type: LangType) {
	// TODO improve error message
	type_assert(l_type.equals(r_type), ref, `Assignment value doesn't match variable type`);
}