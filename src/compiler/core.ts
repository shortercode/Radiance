import { WASTStatementNode, WASTExpressionNode } from "../WASTNode"
import { Context } from "./Context"
import { LangType } from "./LangType";
import AST from "../pratt/Node";
import { compiler_assert, is_defined } from "./error";

import { visit_function } from "./expressions/function";
import { visit_import_function } from "./expressions/import";
import { visit_export, visit_export_function } from "./expressions/export";
import { visit_expression, visit_global_expression } from "./expressions/expression";
import { visit_variable, visit_global_variable } from "./expressions/variable";
import { visit_if_expression } from "./expressions/if";
import { visit_while_expression } from "./expressions/while";
import { visit_block_expression } from "./expressions/block";
import { visit_number_expression } from "./expressions/number";
import { visit_boolean_expression } from "./expressions/boolean";
import { visit_tuple_expression } from "./expressions/tuple";
import { visit_identifier_expression } from "./expressions/identifier";
import { visit_group_expression } from "./expressions/group";
import { visit_constructor_expression } from "./expressions/constructor";
import { visit_call_expression } from "./expressions/call";
import { visit_not_expression } from "./expressions/not";
import { visit_member_expression } from "./expressions/member";
import { visit_assignment_expression } from "./expressions/assignment";
import { visit_equality_expression, visit_inequality_expression, visit_less_than_expression, visit_greater_than_expression, visit_greater_than_equals_expression, visit_less_than_equals_expression, visit_addition_expression, visit_subtraction_expression, visit_multiplication_expression, visit_division_expression } from "./expressions/binary_numeric";
import { visit_as_expression } from "./expressions/as";
import { visit_logical_and_expression, visit_logical_or_expression } from "./expressions/binary_boolean";
import { visit_bitwise_or_expression, visit_bitwise_and_expression } from "./expressions/bitwise";
import { visit_remainder_expression, visit_left_shift_expression, visit_right_shift_expression } from "./expressions/binary_integer";
import { visit_module } from "./expressions/module";
import { visit_array_expression } from "./expressions/array";
import { visit_subscript_expression } from "./expressions/subscript";
import { visit_string_expression } from "./expressions/string";
import { visit_unsafe_expression } from "./expressions/unsafe";
import { visit_return_statement } from "./expressions/return";
import { visit_switch_expression } from "./expressions/switch";

export type TypeHint = LangType | null;
export { AST };

type LocalStatementVistor = (ctx: Compiler, node: AST, type_hint: TypeHint) => WASTExpressionNode
type GlobalStatementVistor = (ctx: Compiler, node: AST) => Array<WASTStatementNode>
type ExpressionVistor = (ctx: Compiler, node: AST, type_hint: TypeHint) => WASTExpressionNode

export class Compiler {
	private global_statement_visitors: Map<string, GlobalStatementVistor>
	private local_statement_visitors: Map<string, LocalStatementVistor>
	private expression_visitors: Map<string, ExpressionVistor>

	readonly ctx: Context = new Context

	constructor () {

		this.global_statement_visitors = new Map([
			["module", visit_module],
			["function", visit_function],
			["export", visit_export],
			["export_function", visit_export_function],
			["import_function", visit_import_function],
			["struct", () => []],
			["enum", () => []],
			["variable", visit_global_variable],
			["expression", visit_global_expression],
			["type", () => []]
		]);

		this.local_statement_visitors = new Map([
			["expression", visit_expression],
			["variable", visit_variable],
			["return", visit_return_statement]
		]);

		this.expression_visitors = new Map([
			["if", visit_if_expression],
			["while", visit_while_expression],
			["switch", visit_switch_expression],
			["block", visit_block_expression],
			["array", visit_array_expression],
			["unsafe", visit_unsafe_expression],

			["number", visit_number_expression],
			["boolean", visit_boolean_expression],
			["identifier", visit_identifier_expression],
			["string", visit_string_expression],

			["group", visit_group_expression],
			
			["constructor", visit_constructor_expression],
			["tuple", visit_tuple_expression],

			["call", visit_call_expression],
			["not", visit_not_expression],
			["member", visit_member_expression],
			["subscript", visit_subscript_expression],

			["=", visit_assignment_expression],
			["==", visit_equality_expression],
			["!=", visit_inequality_expression],
			["<", visit_less_than_expression],
			[">", visit_greater_than_expression],
			["<=", visit_less_than_equals_expression],
			[">=", visit_greater_than_equals_expression],
			["+", visit_addition_expression],
			["-", visit_subtraction_expression],
			["*", visit_multiplication_expression],
			["/", visit_division_expression],
			["%", visit_remainder_expression],
			["as", visit_as_expression],
			["and", visit_logical_and_expression],
			["or", visit_logical_or_expression],
			["|", visit_bitwise_or_expression],
			["&", visit_bitwise_and_expression],
			["<<", visit_left_shift_expression],
			[">>", visit_right_shift_expression]
		]);
	}

	visit_global_statement (node: AST): Array<WASTStatementNode> {
		const visitor = this.global_statement_visitors.get(node.type);
		compiler_assert(is_defined(visitor), node, `Invalid AST type "${node.type}". Expected statement.`);
		return visitor!(this, node);
	}
	visit_local_statement (node: AST, type_hint: TypeHint): WASTExpressionNode {
		const visitor = this.local_statement_visitors.get(node.type);
		compiler_assert(is_defined(visitor), node, `Invalid AST type "${node.type}". Expected statement.`);
		return visitor!(this, node, type_hint);
	}
	visit_expression (node: AST, type_hint: TypeHint): WASTExpressionNode {
		const visitor = this.expression_visitors.get(node.type);
		compiler_assert(is_defined(visitor), node, `Invalid AST type "${node.type}". Expected expression.`);
		return visitor!(this, node, type_hint);
	}
}