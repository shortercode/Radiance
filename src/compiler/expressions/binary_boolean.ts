import { WASTNodeList, WASTConstNode, WASTConditionalNode, WASTExpressionNode } from "../../WASTNode";
import { BOOL_TYPE } from "../AtiumType";
import { Compiler, AST } from "../core";
import { visit_binary_expresson } from "./binary";
import { ensure_expression_emits_boolean } from "./boolean";

export function visit_logical_and_expression (compiler: Compiler, node: AST): WASTExpressionNode {
	const {left, right } = visit_boolean_binary_expression(compiler, node);

	/*
	(left)
	(if
		(right)
	else
		false
	end)
	*/

	const boolean_type = BOOL_TYPE;

	const then_branch = new WASTNodeList(node);
	then_branch.nodes.push(right);
	const else_branch = new WASTNodeList(node);
	const false_node = new WASTConstNode(node, boolean_type, "0");
	else_branch.nodes.push(false_node);

	return new WASTConditionalNode(node, boolean_type, left, then_branch, else_branch);
}

export function visit_logical_or_expression (compiler: Compiler, node: AST): WASTExpressionNode {
	const {left, right } = visit_boolean_binary_expression(compiler, node);

	/*
	(left)
	(if
		true
	else
		(right)
	end)
	*/
	
	const boolean_type = BOOL_TYPE;

	const then_branch = new WASTNodeList(node);
	const true_node = new WASTConstNode(node, boolean_type, "1"); 
	then_branch.nodes.push(true_node);
	const else_branch = new WASTNodeList(node);
	else_branch.nodes.push(right);

	return new WASTConditionalNode(node, boolean_type, left, then_branch, else_branch);
}

function visit_boolean_binary_expression (compiler: Compiler, node: AST) {
	const result = visit_binary_expresson(compiler, node, BOOL_TYPE);
	const left = ensure_expression_emits_boolean(node, result.left);
	const right = ensure_expression_emits_boolean(node, result.right);

	return {
		left,
		right
	};
}