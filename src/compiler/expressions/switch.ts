import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTBlockNode, Ref, WASTSetVarNode, WASTGetVarNode, WASTLoadNode, WASTEqualsNode, WASTConstNode, WASTBitwiseOrNode, WASTNodeList, WASTConditionalNode, WASTTrapNode, WASTBreakNode } from "../../WASTNode";
import { BOOL_TYPE, EnumLangType, I32_TYPE, LangType, VOID_TYPE, EnumCaseLangType } from "../LangType";
import { type_assert, compiler_assert, syntax_assert, type_error, compiler_error } from "../error";
import { find_common_type } from "../find_common_type";

type Case = { block: AST[], conditions: AST[] } & ({ style: "match" } | { style: "cast", identifier: string } | { style: "destructure", fields: string[] });

function read_node_data (node: AST) {
	return node.data as {
		parameter: AST
		default?: AST<AST[]>
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

export function visit_switch_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
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

	let return_type: TypeHint = null;
	const blocks: [WASTExpressionNode, WASTNodeList][] = [];
	let remaining_variant_count = Infinity;

	if (param_type instanceof EnumLangType) {
		const enum_variants = param_type.cases;
		const read_index = new WASTLoadNode(ref, I32_TYPE, new WASTGetVarNode(param_variable), 0);
		const remaining_variants = new Set(enum_variants.keys());
		
		for (const arm of data.cases) {
			// TODO the value is currently being read from memory for each check, it might be faster to use a variable
			const ref = Ref.from_list(arm.block);
			const conditions: WASTExpressionNode[] = [];
			const count = arm.conditions.length;

			// Ensure that the arm has at least 1 variant
			compiler_assert(count > 0, ref, 'No variants specified for case');
			// Non "match" arms cannot have more than 1 variant
			syntax_assert(arm.style !== "match" || count === 1, ref, 'Cannot use "as" with more than one variant');

			let prime_variant: EnumCaseLangType | null = null;

			for (const match of arm.conditions) {
				type_assert(match.type === "identifier", ref, 'Expected the name of an enum variant');
				const enum_name = match.data as string;
				const variant = enum_variants.get(enum_name)!;
				type_assert(!!variant, ref, `"${enum_name}" is not a variant of ${param_type.name}`);	
				type_assert(remaining_variants.delete(enum_name), ref, `Variant "${enum_name}" already has a matching case`);
				const case_index = variant.case_index;
				conditions.push(new WASTEqualsNode(ref, read_index, new WASTConstNode(ref, I32_TYPE, case_index.toString())));
				
				prime_variant = variant;
			}

			if (prime_variant === null) {
				throw new Error("No conditions found");
			}

			ctx.push_frame();

			const block = new WASTNodeList(ref);
			
			if (arm.style === "cast") {
				const variable = ctx.declare_variable(ref, arm.identifier, prime_variant);
				const set_variable_node = new WASTSetVarNode(variable, new WASTGetVarNode(param_variable));
				block.nodes.push(set_variable_node);
			}
			else if (arm.style === "destructure") {
				const variant_fields = prime_variant.type.types
				for (const field_name of arm.fields) {
					const field_type = variant_fields.get(field_name);
					if (!field_type) {
						type_error(ref, `No field with name ${field_name}`);
					}
					const variable = ctx.declare_variable(ref, field_name, field_type.type);
					const set_variable_node = new WASTSetVarNode(variable, new WASTLoadNode(ref, field_type.type, new WASTGetVarNode(param_variable), field_type.offset));
					block.nodes.push(set_variable_node);
				}
			}

			return_type = compile_block(ref, block, compiler, arm.block, return_type, type_hint);
			blocks.push([ combineConditions(conditions), block ]);
			ctx.pop_frame();
		}

		remaining_variant_count = remaining_variants.size;
	}
	else {		
		for (const arm of data.cases) {
			const ref = Ref.from_list(arm.block);
			const conditions: WASTExpressionNode[] = [];
			const count = arm.conditions.length;

			// Ensure that the arm has at least 1 variant
			compiler_assert(count > 0, ref, 'No variants specified for case');
			// Non "match" arms cannot have more than 1 variant
			syntax_assert(arm.style !== "match" || count === 1, ref, 'Cannot use "as" with more than one variant');

			let prime_variant: LangType | null = null;

			for (const match of arm.conditions) {
				const expr = compiler.visit_expression(match, param_type);
				type_assert(param_type.equals(expr.value_type), ref, `Case type doesn't match parameter type`);
				conditions.push(new WASTEqualsNode(ref, new WASTGetVarNode(param_variable), expr));
				prime_variant = expr.value_type;
			}

			if (prime_variant === null) {
				throw new Error("No conditions found");
			}

			ctx.push_frame();

			const block = new WASTNodeList(ref);
			
			if (arm.style === "cast") {
				const variable = ctx.declare_variable(ref, arm.identifier, prime_variant);
				const set_variable_node = new WASTSetVarNode(variable, new WASTGetVarNode(param_variable));
				block.nodes.push(set_variable_node);
			}
			else if (arm.style === "destructure") {
				compiler_error(ref, 'Destructing a switch case with a non-enumerable input type is not yet possible');
			}

			return_type = compile_block(ref, block, compiler, arm.block, return_type, type_hint);
			blocks.push([ combineConditions(conditions), block ]);
			ctx.pop_frame();
		}
	}

	let finalised_return_type: LangType = VOID_TYPE;
	let does_emit_value: boolean = false;

	let end_node: WASTExpressionNode | null = null;

	if (data.default) {
		const ref = Ref.from_node(data.default);
		type_assert(remaining_variant_count > 0, ref, `The default case is never used, all cases are met`);
		ctx.push_frame();
		const block = new WASTNodeList(ref);
		return_type = compile_block(ref, block, compiler, data.default.data, return_type, type_hint);
		finalised_return_type = return_type ?? VOID_TYPE;
		does_emit_value = !finalised_return_type.is_void();

		ctx.pop_frame();

		if (does_emit_value && block.does_return_value) {
			end_node = new WASTNodeList(ref, [new WASTBreakNode(ref, 1, block)]);
		}
		else {
			end_node = new WASTNodeList(ref, [
				block,
				new WASTBreakNode(ref, 1)
			]);
		}
	}
	else if (remaining_variant_count === 0) {
		end_node = new WASTTrapNode(ref);
		finalised_return_type = return_type ?? VOID_TYPE;
		does_emit_value = !finalised_return_type.is_void();
	}

	for (const [ condition, block ] of blocks) {
		const then_block = new WASTNodeList(ref);
		// NOTE the block might return never, so we need to check the common
		// return value AND the block value
		if (does_emit_value && block.does_return_value) {
			const break_node = new WASTBreakNode(ref, 1, block);
			then_block.push(break_node);
		}
		else {
			then_block.push(block);
			then_block.push(new WASTBreakNode(ref, 1));
		}
		const arm = new WASTConditionalNode(block.source, VOID_TYPE, condition, then_block)
		node_list.push(arm);
	}
	block.value_type = finalised_return_type;
	if (end_node) {
		node_list.push(end_node);
	}
	
	clear_param_variable();	
	return block;
}

function compile_block (ref: Ref, block: WASTNodeList, compiler: Compiler, stmts: AST[], return_type: TypeHint, type_hint: TypeHint): TypeHint {
	// NOTE this should probably pass the type hint to the last sub-stmt
	if (stmts.length > 0) {
		const last = stmts[stmts.length - 1];
		const others = stmts.slice(0, -1);
		for (const stmt_ast of others) {
			const stmt = compiler.visit_local_statement(stmt_ast, null);
			block.nodes.push(stmt);
		}
		const last_stmt = compiler.visit_local_statement(last, type_hint);
		block.nodes.push(last_stmt);
		block.value_type = last_stmt.value_type;
		return return_type ? find_common_type(ref, return_type, last_stmt.value_type, true) : last_stmt.value_type;
	}
	return VOID_TYPE;
}