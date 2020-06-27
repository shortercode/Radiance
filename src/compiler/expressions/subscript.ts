import { WASTExpressionNode, WASTLoadNode, WASTNodeList, WASTGreaterThanEqualsNode, WASTConstNode, WASTLessThanNode, WASTBitwiseAndNode, WASTNotNode, WASTConditionalNode, WASTTrapNode, WASTAddNode, WASTMultiplyNode, Ref, WASTSetVarNode, WASTGetVarNode, WASTTeeVarNode } from "../../WASTNode";
import { Compiler, AST, TypeHint } from "../core";
import { type_error, type_assert } from "../error";
import { I32_TYPE, VOID_TYPE, BOOL_TYPE, ArrayLangType } from "../LangType";

function read_node_data (node: AST) {
	return node.data as {
		target: AST,
		accessor: AST
	};
}

export function visit_subscript_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const value = read_node_data(node);
	const ref = Ref.from_node(node);

	const target = compiler.visit_expression(value.target, null);
	const type = target.value_type;

	if (type.is_array()) {
		return visit_array_subscript_expression(compiler, ref, target, value.accessor);
	}

	if (type.is_string()) {
		return visit_string_subscript_expression(compiler, ref, target, value.accessor);
	}

	type_error(ref, `Target does not have any entries`);
}

function visit_array_subscript_expression (compiler: Compiler, ref: Ref, target: WASTExpressionNode, accessor: AST) {	
	const accessor_expression = ensure_int32(ref, compiler.visit_expression(accessor, I32_TYPE));

	const index = bounds_check(compiler, ref, target, accessor_expression);
	const type = target.value_type as ArrayLangType;
	const inner_type = type.type;
	return new WASTLoadNode(ref, inner_type, index, 0);
}

function visit_string_subscript_expression (compiler: Compiler, ref: Ref, target: WASTExpressionNode, accessor: AST) {	
	const accessor_expression = ensure_int32(ref, compiler.visit_expression(accessor, I32_TYPE));

	const index = bounds_check(compiler, ref, target, accessor_expression);
	
	throw new Error(`String subscript operator is not implented yet. We cannot yet load u8 values from memory`);

	return new WASTLoadNode(ref, I32_TYPE, index, 0);
}

export function bounds_check (compiler: Compiler, ref: Ref, target: WASTExpressionNode, accessor: WASTExpressionNode): WASTExpressionNode {
	// TODO this does not work in global context
	const variables = compiler.ctx.get_environment(ref).get_array_variables(ref);

	const trap_condition_branch = new WASTNodeList(ref);
	trap_condition_branch.nodes.push(new WASTTrapNode(ref));

	const get_length_expression = new WASTSetVarNode(
		variables.length,
		new WASTLoadNode(
			ref,
			I32_TYPE,
			new WASTTeeVarNode(
				variables.target,
				target,
				ref
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
					new WASTTeeVarNode(
						variables.index,
						accessor,
						ref
					),
					new WASTConstNode(
						ref,
						I32_TYPE,
						"0"
					)
				),
				new WASTLessThanNode(
					ref,
					new WASTGetVarNode(variables.index),
					new WASTGetVarNode(variables.length),
				)
			)
		),
		trap_condition_branch,
		new WASTNodeList(ref)
	);

	const array_type = target.value_type as ArrayLangType;

	const retrieve_location_expression = new WASTAddNode(
		ref,
		I32_TYPE,
		new WASTAddNode(
			ref,
			I32_TYPE,
			new WASTGetVarNode(variables.target),
			new WASTConstNode(ref, I32_TYPE, I32_TYPE.size.toString())
		),
		new WASTMultiplyNode(
			ref,
			I32_TYPE,
			new WASTGetVarNode(variables.index),
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

export function ensure_int32 (ref: Ref, expr: WASTExpressionNode): WASTExpressionNode {
	// TODO	add a type cast here if it's a compatiblish value
	type_assert(expr.value_type.equals(I32_TYPE), ref, `Unable to index array, please ensure the input type is i32`);
	return expr;
}