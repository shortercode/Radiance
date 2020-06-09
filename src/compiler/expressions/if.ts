import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTNodeList, WASTConditionalNode, Ref } from "../../WASTNode";
import { BOOL_TYPE, VOID_TYPE, LangType } from "../LangType";
import { ensure_expression_emits_boolean } from "./boolean";

function read_node_data (node: AST) {
	return node.data as {
		condition: AST
		thenBranch: AST
		elseBranch: AST | null
	};
}

export function visit_if_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const data = read_node_data(node);
	const ref = Ref.from_node(node);

	let condition = compiler.visit_expression(data.condition, BOOL_TYPE);
	condition = ensure_expression_emits_boolean(condition);
	
	const then_branch = compiler.visit_expression(data.thenBranch, type_hint) as WASTNodeList;
	let value_type: LangType = VOID_TYPE;
	
	if (data.elseBranch !== null) {
		const else_branch = compiler.visit_expression(data.elseBranch, type_hint) as WASTNodeList;
		if (else_branch.value_type.equals(then_branch.value_type)) {
			value_type = then_branch.value_type;;
		}
		return new WASTConditionalNode(ref, value_type, condition, then_branch, else_branch);
	}
	else {
		const else_branch = new WASTNodeList(ref);
		return new WASTConditionalNode(ref, value_type, condition, then_branch, else_branch);
	}
}