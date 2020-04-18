import Node from "../pratt/Node"; 
import { BOOL_TYPE, AtiumType, TypePattern, parse_type, create_tuple_type, VOID_TYPE } from "./AtiumType";
import { InferContext } from "./InferContext";

type TypeHint = AtiumType | null;

export function guess_expression_type (node: Node, ctx: InferContext): TypeHint {
	switch (node.type) {
		case "expression":
		return guess_expression_type(node.data as Node, ctx);
		case "variable":
		return visit_variable_type(node, ctx);

		case "block":
		return guess_block_type(node, ctx);
		case "grouping":
		return guess_expression_type(node.data as Node, ctx);
		case "number":
		return null;
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

	const type = parse_type(data.type);
	ctx.environment.declare(data.name, type);

	/*
	const inferred_type = guess_expression_type(data.initial, ctx);
	*/
	
	return null;
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

	const index = parseInt(value.member);
	const target = guess_expression_type(value.target, ctx);
	const target_type = target ? target.as_tuple() : null;

	if (target_type === null || isNaN(index)) {
		return null;
	}
	
	return target_type.types[index] || null;
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