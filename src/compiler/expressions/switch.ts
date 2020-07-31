import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTBlockNode, WASTNodeList, WASTLoopNode, WASTConditionalBranchNode, WASTBranchNode, Ref, WASTSetVarNode, WASTGetVarNode } from "../../WASTNode";
import { BOOL_TYPE } from "../LangType";
import { invert_boolean_expression } from "./boolean";
import { default_initialiser } from "../default_initialiser";
import { Variable } from "../Variable";

type Case = { block: AST, conditions: AST[] } & ({ style: "match" } | { style: "cast", identifier: string } | { style: "destructure", fields: string[] });
function read_node_data (node: AST) {
	return node.data as {
		parameter: AST
		cases: Case[]
	};
}

export function visit_switch_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const data = read_node_data(node);
	const ref = Ref.from_node(node);
	const ctx = compiler.ctx;

	const block = new WASTBlockNode(ref);
	const node_list = block.body;
	// doesn't pass any type hint into the parameter...
	const parameter = compiler.visit_expression(data.parameter, null);
	const [param_variable, clear_param_variable] = ctx.get_temp_variable(parameter.value_type);
	const init_node = new WASTSetVarNode(param_variable, parameter, ref);
	node_list.nodes.push(init_node);

	for (const variant of data.cases) {
		variant.conditions.map(condition => {
			const expr = compiler.visit_expression(condition, parameter.value_type);
			assign_type_check(ref, parameter.value_type, expr.value_type);
			return expr
		})
	}
	
	clear_param_variable();	
	return node_list;
}

function assign_type_check (ref: Ref, l_type: LangType, r_type: LangType) {
	// TODO improve error message
	type_assert(r_type.is_void() === false, ref, `Cannot assign value with type "void"`);
	type_assert(l_type.equals(r_type), ref, `Assignment value doesn't match variable type`);
}