import { BOOL_TYPE, LangType, parse_type, create_tuple_type, VOID_TYPE, TupleLangType, StructLangType, I32_TYPE, F64_TYPE, create_array_type, EnumCaseLangType } from "./LangType";
import { InferContext } from "./InferContext";
import { TypePattern } from "../parser/index";
import { AST } from "./core";
import { StructDeclaration } from "./StructDeclaration";
import { EnumDeclaration, EnumCaseDeclaration } from "./EnumDeclaration";

type TypeHint = LangType | null;
type Declaration = StructDeclaration | EnumDeclaration | EnumCaseDeclaration;

export function guess_expression_type (node: AST, ctx: InferContext): TypeHint {
	switch (node.type) {
		case "expression":
		return guess_expression_type(node.data as AST, ctx);
		case "variable":
		return visit_variable_type(node, ctx);

		case "constructor":
		return guess_constructor_type(node, ctx);
		case "block":
		return guess_block_type(node, ctx);
		case "group":
		return guess_expression_type(node.data as AST, ctx);
		case "number":
		return guess_number_type(node, ctx);
		case "tuple": 
		return guess_tuple_type(node, ctx);
		case "call": 
		return guess_call_type(node, ctx);
		case "not":
		return BOOL_TYPE;
		case "if": 
		return guess_conditional_type(node, ctx);
		case "while":
		return guess_while_type(node, ctx);
		case "boolean":
		return BOOL_TYPE;
		case "identifier":
		return guess_identifier_type(node, ctx);
		case "member":
		return guess_member_type(node, ctx);
		case "subscript":
		return guess_subscript_type(node, ctx);
		case "=":
		return VOID_TYPE; // assignment doesn't return value
		case "unsafe":
		return guess_unsafe_type(node, ctx);
		case "array":
		return guess_array_type(node, ctx);
		
		case "==":
		case "!=":
		case "<":
		case ">":
		case "<=":
		case ">=":
		return BOOL_TYPE;
		
		case "+":
		case "-":
		case "*":
		case "/":
		case "%": // maybe use a different check for only int?
		return guess_binary_numerical_type(node, ctx);

		case "and":
		case "or":
		return BOOL_TYPE;

		case "as":
		return guess_type_cast_type(node, ctx);

		case "&":
		case "|":
		return null

		case "<<":
		case ">>":
		return guess_binary_numerical_type(node, ctx);

		default: 
		return null;
	}		
}

function visit_variable_type (node: AST, ctx: InferContext): null {
	
	const data = node.data as {
		name: string
		type: TypePattern
		initial: AST
	};

	// TODO this needs adapting if the type has not been specified
	// to infer the value from the intial expression

	const type = parse_type(data.type, ctx.ctx);
	ctx.environment.declare(data.name, type);

	/*
	const inferred_type = guess_expression_type(data.initial, ctx);
	*/
	
	return null;
}

function guess_constructor_type (node: AST, ctx: InferContext): TypeHint {
	const data = node.data as {
		target: AST,
		fields: Map<string, AST>
	};

	const decl = resolve_declaration(data.target, ctx);
	
	if (decl) {
		return decl.type;
	}
	else {
		return null;
	}
}

function resolve_declaration (node: AST, ctx: InferContext): Declaration | null {
	switch (node.type) {
		case "identifier": {
			const name = node.data as string;
			const declaration = ctx.ctx.get_struct(name) || ctx.ctx.get_enum(name)!;
			
			if (declaration) {
				return declaration
			}
			return null;
		}
		case "member": {
			const { target, member } = node.data as {
				target: AST,
				member: string
			};

			const obj = resolve_declaration(target, ctx);
			
			if (obj instanceof EnumDeclaration) {
				const enum_case_declaration = obj.cases.get(member);
				if (enum_case_declaration) {
					return enum_case_declaration;
				}
			}
			return null;
		}
		default:
		return null;
	}
}

function guess_block_type (node: AST, ctx: InferContext): TypeHint {
	const statements = node.data as Array<AST>;

	ctx.environment.push_frame();

	let result = null;
	
	for (const stmt of statements) {
		result = guess_expression_type(stmt, ctx);
	}

	ctx.environment.pop_frame();
	return result;
}

function guess_unsafe_type (node: AST, ctx: InferContext): TypeHint {
	const block = node.data as AST;
	return guess_block_type(block, ctx);
}

function guess_array_type (node: AST, ctx: InferContext): TypeHint {
	const statements = node.data as Array<AST>;
	
	let inner_type: TypeHint = null;

	if (statements.length > 0) {
		const first = statements.slice(0, 1)[0];
		const rest = statements.slice(1);

		const first_type = guess_expression_type(first, ctx);

		/*
			If the type hint is a loose type that the inner type matches, then make
			the type of the array be that loose type. Otherwise use the strict type
			of the first value.

			This allows for an array of enum variants, provided a hint for the enum
			is used.

			An additional system could be to modify the inner type if the second
			value was inconsistent with the strict type, but they had a common loose
			type ( such as enum vs variants again ). This allows literal arrays of a
			common loose type to be created without type hints.
		*/

		inner_type = first_type;

		if (inner_type !== null) {
			for (let i = 0; i < rest.length; i++) {
				const stmt = rest[i];
				const result_type = guess_expression_type(stmt, ctx);
				if (result_type === null) {
					return null;
				}
				if (inner_type.equals(result_type) === false) {
					const common_type = find_common_type(inner_type, result_type);
					if (common_type === null) {
						return null;
					}
					inner_type = common_type;
				}
			}
		}
	}
	else {
		return null;
	}

	if (!inner_type || inner_type.is_void()) {
		return null;
	}
	else {
		return create_array_type(inner_type, statements.length);
	}
}

function find_common_type (a: LangType, b: LangType): TypeHint {

	if (a.is_enum() && b.is_enum()) {
		if (a instanceof EnumCaseLangType) {
			a = a.parent;
		}
		if (b instanceof EnumCaseLangType) {
			b = b.parent;
		}

		if (a.equals(b)) {
			return a;
		}
	}
	else if (a.is_array() && b.is_array()) {
		let count = a.count;
		let common_type: TypeHint = a.type;

		if (a.count !== b.count) {
			count = -1;
		}
		if (a.type.equals(b.type) === false) {
			common_type = find_common_type(a.type, b.type);
		}

		if (common_type) {
			return create_array_type(common_type, count);
		}
	}

	return null;
}

function guess_number_type (node: AST, _ctx: InferContext): TypeHint {
	if (should_create_int(node.data as string)) {
		return I32_TYPE;
	}
	else {
		return F64_TYPE;
	}
}

function should_create_int (value: string): boolean {
	return !value.includes(".");
}

function guess_tuple_type (node: AST, ctx: InferContext): TypeHint {
	const data = node.data as {
		values: Array<AST>
	};

	const value_types: Array<LangType> = [];
	for (const sub_expr of data.values) {
		const type = guess_expression_type(sub_expr, ctx);
		// if any part isn't obvious we have to return null
		if (type === null) {
			return null;
		}
		value_types.push(type);
	}

	return create_tuple_type(value_types);
}

function guess_call_type (node: AST, ctx: InferContext): TypeHint {
	const value = node.data as {
		callee: AST,
		arguments: Array<AST>
	};
	
	// this is technically a syntax error, but leave it for the compiler
	// to throw on
	if (value.callee.type !== "identifier") {
		return null;
	}
	
	const function_name = value.callee.data as string;
	return ctx.get_function_type(function_name)!;
}

function guess_conditional_type (node: AST, ctx: InferContext): TypeHint {
	const value = node.data as {
		condition: AST
		thenBranch: AST
		elseBranch: AST | null
	};

	const then_type = guess_expression_type(value.thenBranch, ctx)
	if (then_type === null) {
		return null;
	}

	if (value.elseBranch !== null) {
		const else_type = guess_expression_type(value.elseBranch, ctx);
		if (else_type === null) {
			return null;
		}
		if (else_type.equals(then_type) === false) {
			return VOID_TYPE;
		}
		return then_type;
	}
	else {
		return then_type;
	}
}

function guess_while_type (node: AST, ctx: InferContext): TypeHint {
	const value = node.data as {
		block: AST
	};

	return guess_expression_type(value.block, ctx);
}

function guess_binary_numerical_type (node: AST, ctx: InferContext): TypeHint {
	const data = node.data as {
		left: AST
		right: AST
	};

	const left = guess_expression_type(data.left, ctx);
	const right = guess_expression_type(data.right, ctx);

	if (left) {
		if (right) {
			if (left.equals(right)) {
				return left;
			}
			else {
				return null;
			}
		}
		else {
			return left;
		}
	}
	else if (right) {
		return right;
	}
	else {
		return null
	}
}

function guess_type_cast_type (node: AST, ctx: InferContext): TypeHint {
	const data = node.data as { expr: AST, type: TypePattern };
	// WARN this does not return null for invalid conversions!
	return parse_type(data.type, ctx.ctx);
}

function guess_identifier_type (node: AST, ctx: InferContext): TypeHint {
	const name = node.data as string;
	return ctx.get_variable_type(name);
}

function guess_member_type (node: AST, ctx: InferContext): TypeHint {
	const value = node.data as {
		target: AST,
		member: string
	};

	const target = guess_expression_type(value.target, ctx);	
	if (target === null) {
		return null;
	}

	if (target.is_tuple()) {
		return guess_tuple_member_type(target, value.member);
	}

	if (target.is_struct()) {
		return guess_struct_member_type(target, value.member);
	}

	return null;
}

function guess_subscript_type (node: AST, ctx: InferContext): TypeHint {
	const value = node.data as {
		target: AST,
		accessor: AST
	};

	const type = guess_expression_type(value.target, ctx);

	if (type) {
		if (type.is_array()) {
			return type.type;
		}
	
		if (type.is_string()) {
			return null;
			// NOT IMPLEMENTED
		}
	}

	return null;
}

function guess_tuple_member_type (type: TupleLangType, member: string): TypeHint {
	const index = parseInt(member);

	if (isNaN(index)) {
		return null;
	}

	const field = type.types[index];
	
	return field ? field.type : null;
}

function guess_struct_member_type (type: StructLangType, member: string): TypeHint {
	const field = type.types.get(member);
	
	return field ? field.type : null;
}