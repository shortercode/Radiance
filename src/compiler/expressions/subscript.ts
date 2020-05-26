import { WASTExpressionNode, WASTLoadNode, WASTNodeList, WASTTeeLocalNode, WASTGreaterThanEqualsNode, WASTConstNode, WASTGetLocalNode, WASTLessThanNode, WASTBitwiseAndNode, WASTNotNode, WASTConditionalNode, WASTTrapNode, WASTSetLocalNode, WASTAddNode, WASTMultiplyNode, Ref } from "../../WASTNode";
import { Compiler, AST, TypeHint } from "../core";
import { type_error, type_assert } from "../error";
import { I32_TYPE, VOID_TYPE, BOOL_TYPE } from "../LangType";

function read_node_data (node: AST) {
	return node.data as {
		target: AST,
		accessor: AST
	};
}

export function visit_subscript_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const value = read_node_data(node);

	const target = compiler.visit_expression(value.target, null);
	const target_array_type = target.value_type.as_array();

	if (target_array_type) {
		return visit_array_subscript_expression(compiler, node, target, value.accessor);
	}

	if (target.value_type.is_string()) {
		return visit_string_subscript_expression(compiler, node, target, value.accessor);
	}

	type_error(node, `Target does not have any entries`);
}

function visit_array_subscript_expression (compiler: Compiler, node: AST, target: WASTExpressionNode, accessor: AST) {	
	const accessor_expression = ensure_int32(node, compiler.visit_expression(accessor, I32_TYPE));

	const index = bounds_check(compiler, node, target, accessor_expression);
	const type = target.value_type.as_array()!.type;
	return new WASTLoadNode(Ref.from_node(node), type, index, 0);
}

function visit_string_subscript_expression (compiler: Compiler, node: AST, target: WASTExpressionNode, accessor: AST) {	
	const accessor_expression = ensure_int32(node, compiler.visit_expression(accessor, I32_TYPE));

	const index = bounds_check(compiler, node, target, accessor_expression);
	
	throw new Error(`String subscript operator is not implented yet. We cannot yet load u8 values from memory`);

	return new WASTLoadNode(Ref.from_node(node), I32_TYPE, index, 0);
}

function bounds_check (compiler: Compiler, node: AST, target: WASTExpressionNode, accessor: WASTExpressionNode): WASTExpressionNode {
	const ref = Ref.from_node(node);
	const variables = compiler.ctx.environment!.get_array_variables(ref);
	const { id: target_id, name: target_name } = variables.target;
	const { id: index_id, name: index_name } = variables.index;
	const { id: length_id, name: length_name } = variables.length;

	const trap_condition_branch = new WASTNodeList(ref);
	trap_condition_branch.nodes.push(new WASTTrapNode(ref));

	const get_length_expression = new WASTSetLocalNode(
		ref,
		length_id,
		length_name,
		new WASTLoadNode(
			ref,
			I32_TYPE,
			new WASTTeeLocalNode(
				ref,
				target_id,
				target_name,
				target,
				I32_TYPE
			),
			0
		)
	);

	const conditional_trap_expression = new WASTConditionalNode(
		ref,
		VOID_TYPE,
		new WASTNotNode(
			ref,
			new WASTBitwiseAndNode(
				ref,
				BOOL_TYPE,
				new WASTGreaterThanEqualsNode(
					ref, 
					new WASTTeeLocalNode(
						ref,
						index_id,
						index_name,
						accessor,
						I32_TYPE
					),
					new WASTConstNode(
						ref,
						I32_TYPE,
						"0"
					)
				),
				new WASTLessThanNode(
					ref,
					new WASTGetLocalNode(ref, index_id, index_name, I32_TYPE),
					new WASTGetLocalNode(ref, length_id, length_name, I32_TYPE),
				)
			)
		),
		trap_condition_branch,
		new WASTNodeList(ref)
	);

	const array_type = target.value_type.as_array()!;

	const retrieve_location_expression = new WASTAddNode(
		ref,
		I32_TYPE,
		new WASTAddNode(
			ref,
			I32_TYPE,
			new WASTGetLocalNode(ref, target_id, target_name, I32_TYPE),
			new WASTConstNode(ref, I32_TYPE, I32_TYPE.size.toString())
		),
		new WASTMultiplyNode(
			ref,
			I32_TYPE,
			new WASTGetLocalNode(ref, index_id, index_name, I32_TYPE),
			new WASTConstNode(ref, I32_TYPE, array_type.type.size.toString())
		)
	);

	const result_expression = new WASTNodeList(ref);
	result_expression.nodes.push(
		get_length_expression,
		conditional_trap_expression,
		retrieve_location_expression
	);
	result_expression.value_type = I32_TYPE;
	
	return result_expression;
}

function ensure_int32 (node: AST, expr: WASTExpressionNode): WASTExpressionNode {
	// TODO	add a type cast here if it's a compatiblish value
	type_assert(expr.value_type.equals(I32_TYPE), node, `Unable to index array, please ensure the input type is i32`);
	return expr;
}