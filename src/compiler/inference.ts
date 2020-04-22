import Node from "../pratt/Node"; 
import { BOOL_TYPE, AtiumType, parse_type, create_tuple_type, VOID_TYPE, TupleAtiumType, StructAtiumType, I32_TYPE, F64_TYPE } from "./AtiumType";
import { InferContext } from "./InferContext";
import { TypePattern } from "../parser/index";

type TypeHint = AtiumType | null;

export function guess_expression_type (node: Node, ctx: InferContext): TypeHint {
	switch (node.type) {
		case "expression":
		return guess_expression_type(node.data as Node, ctx);
		case "variable":
		return visit_variable_type(node, ctx);

		case "constructor":
		return guess_constructor_type(node, ctx);
		case "block":
		return guess_block_type(node, ctx);
		case "group":
		return guess_expression_type(node.data as Node, ctx);
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
		case "=":
		return guess_assignment_type(node, ctx);
		
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

function visit_variable_type (node: Node, ctx: InferContext): null {
	
	const data = node.data as {
		name: string
		type: TypePattern
		initial: Node
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

function guess_constructor_type (node: Node, ctx: InferContext): TypeHint {
	const data = node.data as {
		target: Node,
		fields: Map<string, Node>
	};

	if (data.target.type !== "identifier") {
		return null;
	}
	
	const struct_name = data.target.data as string;
	const struct_decl = ctx.ctx.get_struct(struct_name);

	if (struct_decl) {
		return struct_decl.type;
	}
	else {
		return null;
	}
}

function guess_block_type (node: Node, ctx: InferContext): TypeHint {
	const statements = node.data as Array<Node>;

	ctx.environment.push_frame();

	let result = null;
	
	for (const stmt of statements) {
		result = guess_expression_type(stmt, ctx);
	}

	ctx.environment.pop_frame();
	return result;
}

function guess_number_type (node: Node, ctx: InferContext): TypeHint {
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

function guess_tuple_type (node: Node, ctx: InferContext): TypeHint {
	const data = node.data as {
		values: Array<Node>
	};

	const value_types: Array<AtiumType> = [];
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

function guess_call_type (node: Node, ctx: InferContext): TypeHint {
	const value = node.data as {
		callee: Node,
		arguments: Array<Node>
	};
	
	// this is technically a syntax error, but leave it for the compiler
	// to throw on
	if (value.callee.type !== "identifier") {
		return null;
	}
	
	const function_name = value.callee.data as string;
	return ctx.get_function_type(function_name)!;
}

function guess_conditional_type (node: Node, ctx: InferContext): TypeHint {
	const value = node.data as {
		condition: Node
		thenBranch: Node
		elseBranch: Node | null
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

function guess_while_type (node: Node, ctx: InferContext): TypeHint {
	const value = node.data as {
		block: Node
	};

	return guess_expression_type(value.block, ctx);
}

function guess_binary_numerical_type (node: Node, ctx: InferContext): TypeHint {
	const data = node.data as {
		left: Node
		right: Node
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

function guess_identifier_type (node: Node, ctx: InferContext): TypeHint {
	const name = node.data as string;
	return ctx.get_variable_type(name);
}

function guess_member_type (node: Node, ctx: InferContext): TypeHint {
	const value = node.data as {
		target: Node,
		member: string
	};

	const target = guess_expression_type(value.target, ctx);	
	if (target === null) {
		return null;
	}

	const target_tuple_type = target.as_tuple();
	if (target_tuple_type) {
		return guess_tuple_member_type(target_tuple_type, value.member);
	}

	const target_struct_type = target.as_struct();
	if (target_struct_type) {
		return guess_struct_member_type(target_struct_type, value.member);
	}

	return null;
}

function guess_tuple_member_type (type: TupleAtiumType, member: string): TypeHint {
	const index = parseInt(member);

	if (isNaN(index)) {
		return null;
	}

	const field = type.types[index];
	
	return field ? field.type : null;
}

function guess_struct_member_type (type: StructAtiumType, member: string): TypeHint {
	const field = type.types.get(member);
	
	return field ? field.type : null;
}

function guess_assignment_type (node: Node, ctx: InferContext): TypeHint {
	const value = node.data as {
		left: Node
		right: Node
	};

	const variable_name = value.left.data as string;
	const type = ctx.get_variable_type(variable_name);

	if (type) {
		return type
	}

	// if the variable doesn't exist yet guess from the expression
	return guess_expression_type(value.right, ctx);
}