import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTBlockNode, Ref, WASTSetVarNode, WASTGetVarNode, WASTLoadNode, WASTEqualsNode, WASTConstNode, WASTBitwiseOrNode, WASTNodeList, WASTBranchNode, WASTConditionalNode, WASTTrapNode } from "../../WASTNode";
import { BOOL_TYPE, EnumLangType, I32_TYPE, LangType, VOID_TYPE } from "../LangType";
import { type_assert, compiler_assert, syntax_assert } from "../error";
import { find_common_type } from "../find_common_type";

type Case = { block: AST[], conditions: AST[] } & ({ style: "match" } | { style: "cast", identifier: string } | { style: "destructure", fields: string[] });

function read_node_data (node: AST) {
	return node.data as {
		parameter: AST
		default?: AST[]
		cases: Case[]
	};
}

function combineConditions (conditions: WASTExpressionNode[]): WASTExpressionNode {
	let result: WASTExpressionNode = conditions[0];

	for (const condition of conditions.slice(1)) {
		result = new WASTBitwiseOrNode(condition.source, BOOL_TYPE, condition, result);
	}
	return result;
}

export function visit_switch_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const data = read_node_data(node);
	const ref = Ref.from_node(node);
	const ctx = compiler.ctx;

	const block = new WASTBlockNode(ref);
	const node_list = block.body;
	// doesn't pass any type hint into the parameter...
	const parameter = compiler.visit_expression(data.parameter, null);
	const param_type = parameter.value_type;
	const [param_variable, clear_param_variable] = ctx.get_temp_variable(param_type);
	const init_node = new WASTSetVarNode(param_variable, parameter, ref);
	node_list.nodes.push(init_node);

	if (param_type instanceof EnumLangType) {
		const enum_variants = param_type.cases;
		const read_index = new WASTLoadNode(ref, I32_TYPE, new WASTGetVarNode(param_variable), 0);
		const remaining_variants = new Set(enum_variants.keys());
		let return_type: LangType|null = null;
		
		for (const arm of data.cases) {
			// TODO the value is currently being read from memory for each check, it might be faster to use a variable
			const conditions: WASTExpressionNode[] = [];
			const count = arm.conditions.length;
			const { style } = arm;

			// Ensure that the arm has at least 1 variant
			compiler_assert(count > 0, ref, 'No variants specified for case');
			// Non "match" arms cannot have more than 1 variant
			syntax_assert(style !== "match" || count === 1, ref, 'Cannot use "as" with more than one variant');

			for (const match of arm.conditions) {
				type_assert(match.type === "identifier", ref, 'Expected the name of an enum variant');
				const enum_name = match.data as string;
				const variant = enum_variants.get(enum_name)!;
				type_assert(!!variant, ref, `"${enum_name}" is not a variant of ${param_type.name}`);	
				type_assert(remaining_variants.delete(enum_name), ref, `Variant "${enum_name}" already has a matching case`);
				const case_index = variant.case_index;
				conditions.push(new WASTEqualsNode(ref, read_index, new WASTConstNode(ref, I32_TYPE, case_index.toString())));
			}
			
			if (style === "cast") {
				throw new Error("Cast not implemented");
			}
			else if (style === "destructure") {
				throw new Error("Destructure not implemented");
			}

			const block = new WASTNodeList(ref);
			// NOTE this should probably pass the type hint to the last sub-stmt
			let last;
			for (const stmt_ast of arm.block) {
				const stmt = compiler.visit_local_statement(stmt_ast, null);
				block.nodes.push(stmt);
				last = stmt;
			}
			const stmt_type = last ? last.value_type : VOID_TYPE;
			return_type = return_type ? find_common_type(ref, return_type, stmt_type) : stmt_type;

			// we need to emit a branch instruction here to escape the
			// switch block
			block.nodes.push(new WASTBranchNode(ref, 1));

			node_list.nodes.push(new WASTConditionalNode(ref, VOID_TYPE, combineConditions(conditions), block, new WASTNodeList(ref)));
		}

		if (data.default) {
			type_assert(remaining_variants.size > 0, ref, `The default case is never used, all cases are met`);
			// NOTE this should probably pass the type hint to the last sub-stmt
			let last;
			for (const stmt_ast of data.default) {
				const stmt = compiler.visit_local_statement(stmt_ast, null);
				node_list.nodes.push(stmt);
				last = stmt;
			}
			const stmt_type = last ? last.value_type : VOID_TYPE;
			return_type = return_type ? find_common_type(ref, return_type, stmt_type) : stmt_type;
		}
		else if (remaining_variants.size === 0) {
			node_list.nodes.push(new WASTTrapNode(ref));
			if (return_type) {
				node_list.value_type = return_type;
			}
		}
	}
	else {
		throw new Error("switch expressions for types other than enums has not been implemented");

		for (const variant of data.cases) {
			variant.conditions.map(condition => {
				const expr = compiler.visit_expression(condition, parameter.value_type);
				assign_type_check(ref, parameter.value_type, expr.value_type);
				return expr
			})
		}
	}
	
	clear_param_variable();	
	return node_list;
}

function assign_type_check (ref: Ref, l_type: LangType, r_type: LangType) {
	// TODO improve error message
	type_assert(r_type.is_void() === false, ref, `Cannot assign value with type "void"`);
	type_assert(l_type.equals(r_type), ref, `Assignment value doesn't match variable type`);
}