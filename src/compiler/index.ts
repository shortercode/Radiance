import * as WAST from "../WASTNode.js"
import Node from "../pratt/Node.js";
import { AtiumType, validate_atium_type, is_numeric, is_integer } from "./AtiumType.js";
import { Context } from "./Context.js";
import { FunctionDeclaration } from "./FunctionDeclaration.js";
import { Environment } from "./Environment.js";
import { Variable } from "./Variable.js";

/*
This class is the second stage of the process after the parser. It performs type validation
on the Atium code and converts it from a Atium AST to a WebAssembly AST. The final stage
serialises this WebAssembly AST into a binary file.
*/

export default function (node: Node): WAST.WASTModuleNode {
	const ctx: Context = new Context;
	if (node.type !== "module") {
		throw new Error(`Invalid node type ${node.type} expected a module`);
	}
	return visit_module(node, ctx);
}

function visit_module(node: Node, ctx: Context): WAST.WASTModuleNode {
	/*
	This is entry point to the compiler
	the public exported function does some simple setup
	and input verification but this actually creates the
	module and recusively visits the source AST
	*/
	
	const module = new WAST.WASTModuleNode;
	const statements = node.data as Array<Node>;
	
	/*
	Before processing the bulk of the AST we visit
	the functions and create them so that they can
	refer to each other in their bodies
	*/
	for (const stmt of statements) {
		hoist_declaration(stmt, ctx);
	}
	
	for (const stmt of statements) {
		const wast_stmts = visit_global_statement(stmt, ctx);
		for (const wast_node of wast_stmts) {
			module.statements.push(wast_node);
		}
	}
	
	const memory_stmt = new WAST.WASTMemoryNode("main", 1);
	
	module.statements.push(memory_stmt);
	
	return module;
}

function hoist_declaration(node: Node, ctx: Context) {
	switch (node.type) {
		case "export_function":
		case "function": {
			const data = node.data as {
				name: string
				type: string
				parameters: Array<{ name: string, type: string }>
				block: Node
			}
			
			const parameters = data.parameters.map((param, index) => {
				const type = validate_atium_type(param.type);
				return new Variable(type, param.name, index);
			});
			
			ctx.declare_function(data.name, validate_atium_type(data.type), parameters);
			break;
		}
	}
}

function visit_global_statement(node: Node, ctx: Context): Array<WAST.WASTStatementNode> {
	switch (node.type) {
		case "function": {
			const fn_wast = visit_function(node, ctx);
			
			return [fn_wast];
		}
		case "export": {
			const data = node.data as {
				name: string
			};
			
			const export_wast = export_function(data.name, ctx);
			
			return [export_wast];
		}
		case "export_function": {
			const fn_wast = visit_function(node, ctx);
			const export_wast = export_function(fn_wast.name, ctx);
			
			return [fn_wast, export_wast];
		}
		default: throw new Error(`Invalid node type ${node.type} @ ${node.start} expected a statement`);
	}
}

function visit_function(node: Node, ctx: Context) {
	/*
	NOTE prior to this "visit_declaration" has validated the
	.type and .parameter.*.type are AtiumType so we can do a
	direct cast here without the validation
	*/
	
	const data = node.data as {
		name: string
		type: AtiumType
		body: Array<Node>
		parameters: Array<{ name: string, type: string }>
	}
	
	const fn_decl = ctx.globals.get(data.name);
	
	if (!fn_decl) {
		throw new Error("Cannot locate function declaration");
	}
	
	const fn_wast = new WAST.WASTFunctionNode(data.name, data.type);
	
	ctx.environment = new Environment(fn_decl.parameters);
	
	for (const variable of fn_decl.parameters) {
		fn_wast.parameters.push(variable);
	}
	for (const node of data.body) {
		const expr = visit_local_statement(node, ctx);
		fn_wast.body.nodes.push(expr);
		fn_wast.body.value_type = expr.value_type;
	}
	
	if (data.type === "void") {
		fn_wast.body.consume_return_value();
	}
	
	const locals = ctx.environment.variables;
	ctx.environment = null;
	
	for (const local of locals) {
		fn_wast.locals.push(local);
	}
	
	return fn_wast;
}

function export_function(fn_name: string, ctx: Context) {
	const fn = ctx.globals.get(fn_name);
	
	if (!fn) {
		throw new Error(`Cannot export ${fn_name} as it is not available in the global scope`);
	}
	
	if (fn instanceof FunctionDeclaration) {
		for (const { name, type } of fn.parameters) {
			if (is_type_exportable(type) === false) {
				throw new Error(`Cannot export ${fn_name} because the parameter ${name} is not an exportable type`);
			}
		}
		if (is_type_exportable(fn.type) === false) {
			throw new Error(`Cannot export ${fn_name} because the return type is not an exportable type`);
		}
	}
	else {
		throw new Error(`Cannot export ${fn_name} as it's not a function`);
	}
	
	return new WAST.WASTExportNode("function", fn_name, fn_name);
}
function is_type_exportable (type: AtiumType) {
	switch (type) {
		case "i64":
		return false;
		case "boolean":
		case "i32":
		case "f32":
		case "f64":
		case "void":
		return true;
		default:
		throw new Error("Invalid value type");
	}
}

function visit_expression(node: Node, ctx: Context): WAST.WASTExpressionNode {
	switch (node.type) {
		case "block": {
			return visit_block_expression(ctx, node);
		}
		case "number": {
			return new WAST.WASTConstNode("f64", node.data as string);
		}
		case "call": {
			return visit_call_expression(ctx, node);
		}
		case "if": {
			return visit_if_expression(ctx, node);
		}
		case "while": {
			return visit_while_loop_expression(ctx, node);
		}
		case "boolean": {
			return visit_boolean_expression(ctx, node);
		}
		case "identifier": {
			return visit_identifier_expression(ctx, node);
		}
		case "=": {
			return visit_assignment_expression(ctx, node);
		}
		
		case "==": {
			const { left, right } = visit_numeric_binary_expression(ctx, node);
			return new WAST.WASTEqualsNode(left, right);
		}
		case "!=": {
			const { left, right } = visit_numeric_binary_expression(ctx, node);
			return new WAST.WASTNotEqualsNode(left, right);
		}
		case "<": {
			const { left, right } = visit_numeric_binary_expression(ctx, node);
			return new WAST.WASTLessThanNode(left, right);
		}
		case ">": {
			const { left, right } = visit_numeric_binary_expression(ctx, node);
			return new WAST.WASTGreaterThanNode(left, right);
		}
		case "<=": {
			const { left, right } = visit_numeric_binary_expression(ctx, node);
			return new WAST.WASTLessThanEqualsNode(left, right);
		}
		case ">=": {
			const { left, right } = visit_numeric_binary_expression(ctx, node);
			return new WAST.WASTGreaterThanEqualsNode(left, right);
		}
		
		case "+": {
			const { type, left, right } = visit_numeric_binary_expression(ctx, node);
			return new WAST.WASTAddNode(type, left, right);
		}
		case "-": {
			const { type, left, right } = visit_numeric_binary_expression(ctx, node);
			return new WAST.WASTSubNode(type, left, right);
		}
		case "*": {
			const { type, left, right } = visit_numeric_binary_expression(ctx, node);
			return new WAST.WASTMultiplyNode(type, left, right);
		}
		case "/": {
			const { type, left, right } = visit_numeric_binary_expression(ctx, node);
			return new WAST.WASTDivideNode(type, left, right);
		}
		case "%": {
			const { type, left, right } = visit_integer_binary_expression(ctx, node);
			return new WAST.WASTModuloNode(type, left, right);
		}

		case "and": {
			return visit_logical_and_expression(ctx, node);
		}
		case "or": {
			return  visit_logical_or_expression(ctx, node);
		}
		
		default: throw new Error(`Invalid node type ${node.type} @ ${node.start} expected an expression`);;
	}		
}

function visit_block_expression (ctx: Context, node: Node) {
	const node_list = new WAST.WASTNodeList;
	const statements = node.data as Array<Node>;
	
	ctx.environment!.push_frame();
	
	let last_node;
	
	for (const stmt of statements) {
		const result = visit_local_statement(stmt, ctx);
		node_list.nodes.push(result);
		last_node = result;
	}
	
	ctx.environment!.pop_frame();
	
	const block_value_type = last_node ? last_node.value_type : "void";
	node_list.value_type = block_value_type;
	
	return node_list;
}

function visit_call_expression (ctx: Context, node: Node) {
	const value = node.data as {
		callee: Node,
		arguments: Array<Node>
	};
	
	if (value.callee.type !== "identifier") {
		throw new Error(`${value.callee.type} is not a function`);
	}
	
	const function_name = value.callee.data as string;
	const fn = ctx.globals.get(function_name);
	
	if (!fn) {
		throw new Error(`Undefined function ${function_name}`);
	}
	const args: Array<WAST.WASTExpressionNode> = [];
	
	const arg_count = value.arguments.length;
	const param_count = fn.parameters.length;

	if (arg_count != param_count) {
		throw new Error(`Function ${function_name} expects ${param_count} arguments but ${arg_count} were given`);
	}

	for (let i = 0; i < param_count; i++) {
		const arg = value.arguments[i];
		const param = fn.parameters[i];
		const expr = visit_expression(arg, ctx);
		if (expr.value_type !== param.type) {
			throw new Error(`Expected ${param.type} but recieved ${expr.value_type}`);
		}
		args.push(expr);
	}
	
	return new WAST.WASTCallNode(function_name, fn.type, args)
}

function visit_if_expression (ctx: Context, node: Node) {
	const value = node.data as {
		condition: Node
		thenBranch: Node
		elseBranch: Node | null
	};

	let condition = visit_expression(value.condition, ctx);
	condition = ensure_expression_emits_boolean(condition);
	
	const then_branch = visit_expression(value.thenBranch, ctx) as WAST.WASTNodeList;
	let value_type = then_branch.value_type;

	if (value.elseBranch !== null) {
		const else_branch = visit_expression(value.elseBranch, ctx) as WAST.WASTNodeList;
		if (else_branch.value_type !== value_type) {
			value_type = "void";
		}
		return new WAST.WASTConditionalNode(value_type, condition, then_branch, else_branch);
	}
	else {
		const else_branch = new WAST.WASTNodeList;
		return new WAST.WASTConditionalNode(value_type, condition, then_branch, else_branch);
	}
}

function visit_while_loop_expression (ctx: Context, node: Node) {
	const value = node.data as {
		condition: Node
		block: Node
	};
	
	/*
	NOTE WASM doesn't have a "while" instruction only a "loop". Curiously loops
	exit after each iteration by default, so to continue a "branch" operation
	must be executed. To emulate a while loop we use the following structure
	
	(local temp)
	(block (void)
	(loop (void)
	(if_br (eqz CONDITION) 1)
	(local.set BLOCK)
	(br 0)
	)
	)
	(local.get temp)
	*/
	
	// NOTE before starting we must know if the inner body returns a value
	const while_body = visit_expression(value.block, ctx) as WAST.WASTBlockNode;
	const return_value_type = while_body.value_type
	const emits_value = return_value_type !== "void";
	
	const node_list = new WAST.WASTNodeList;
	
	// NOTE if we do return a value we need to add a temporary var to hold it
	let temp_variable = null;
	if (emits_value) {
		temp_variable = ctx.environment!.declare_hidden("while_temp_variable", while_body.value_type);
		const init_value_node = default_initialiser(return_value_type);
		const init_node = new WAST.WASTSetLocalNode(temp_variable.id, temp_variable.name, init_value_node);
		node_list.nodes.push(init_node);
	}
	
	{
		const block_node = new WAST.WASTBlockNode;
		const loop_block = new WAST.WASTLoopNode;
		block_node.body.nodes.push(loop_block);
		
		// NOTE we need to massage the condition a bit to get what we want
		{
			let condition = visit_expression(value.condition, ctx);
			
			// NOTE we want to invert the condition. as an optmisation if it's
			// already inverted (e.g. while !false {} ) then we just remove that
			// inversion
			if (condition instanceof WAST.WASTNotNode) {
				condition = condition.inner;
			}
			else {
				// NOTE otherwise ensure that we have a boolean value then invert
				// invert it
				condition = ensure_expression_emits_boolean(condition);
				condition = new WAST.WASTNotNode(condition);
			}
			
			// NOTE finally wrap the condition in a conditional branch Op
			condition = new WAST.WASTConditionalBranchNode(condition, 1);
			loop_block.body.push(condition);
		}
		
		// NOTE if we're emitting a value wrap the block in a set local
		// to stash it in our temp var
		if (emits_value) {
			const set_temp_node = new WAST.WASTSetLocalNode(temp_variable!.id, temp_variable!.name, while_body);
			loop_block.body.push(set_temp_node);
		}
		else {
			loop_block.body.push(while_body)
		}
		
		// NOTE we need to add a branch 0 here to ensure the loop continues
		loop_block.body.push(new WAST.WASTBranchNode(0));
		
		node_list.nodes.push(block_node);
	}
	
	// NOTE finally if we're emitting a value then read back our output
	// from the temp variable
	if (emits_value) {
		const get_temp_node = new WAST.WASTGetLocalNode(temp_variable!.id, temp_variable!.name, return_value_type);
		node_list.nodes.push(get_temp_node);
		node_list.value_type = get_temp_node.value_type;
	}
	
	return node_list;
}

function visit_boolean_expression (ctx: Context, node: Node) {
	const value = node.data as string;
	if (value === "false") {
		return new WAST.WASTConstNode("boolean", "0");
	}
	else if (value === "true") {
		return new WAST.WASTConstNode("boolean", "1");
	}
	else {
		throw new Error(`Invalid boolean value`);
	}
}

function visit_identifier_expression (ctx: Context, node: Node) {
	const name = node.data as string;
	const variable = ctx.get_variable(name);
	if (!variable)  {
		throw new Error(`Undefined variable ${name}`);
	}
	return new WAST.WASTGetLocalNode(variable.id, name, variable.type);
}

function visit_assignment_expression (ctx: Context, node: Node) {
	const value = node.data as {
		left: Node
		right: Node
	};
	
	if (value.left.type !== "identifier") {
		throw new Error(`Invalid left hand side of assignment`);
	}
	
	const variable_name = value.left.data as string;
	const variable = ctx.get_variable(variable_name);
	
	if (!variable) {
		throw new Error(`Undefined variable ${variable_name}`);
	}
	
	const new_value = visit_expression(value.right, ctx);
	
	if (variable.type !== new_value.value_type) {
		throw new Error("Assignment doesn't match variable type");
	}
	
	return new WAST.WASTTeeLocalNode(variable.id, variable.name, new_value, variable.type);
}

function visit_logical_and_expression (ctx: Context, node: Node) {
	const {left, right } = visit_boolean_binary_expression(ctx, node);

	/*
	(left)
	(if
		(right)
	else
		false
	end)
	*/

	const then_branch = new WAST.WASTNodeList;
	then_branch.nodes.push(right);
	const else_branch = new WAST.WASTNodeList;
	const false_node = new WAST.WASTConstNode("boolean", "0");
	else_branch.nodes.push(false_node);

	return new WAST.WASTConditionalNode("boolean", left, then_branch, else_branch);
}

function visit_logical_or_expression (ctx: Context, node: Node) {
	const {left, right } = visit_boolean_binary_expression(ctx, node);

	/*
	(left)
	(if
		true
	else
		(right)
	end)
	*/

	const then_branch = new WAST.WASTNodeList;
	const true_node = new WAST.WASTConstNode("boolean", "1"); 
	then_branch.nodes.push(true_node);
	const else_branch = new WAST.WASTNodeList;
	else_branch.nodes.push(right);

	return new WAST.WASTConditionalNode("boolean", left, then_branch, else_branch);
}

function visit_numeric_binary_expression (ctx: Context, node: Node) {
	const result = visit_binary_expresson(ctx, node);
	const type = result.type;
	const operand = node.type;
	
	if (is_numeric(result.type) === false) {
		throw new Error(`Unable to perform operation ${operand} on non-numeric types ${type} ${type}`);
	}
	
	return result;
}

function visit_integer_binary_expression (ctx: Context, node: Node) {
	const result = visit_binary_expresson(ctx, node);
	const type = result.type;
	const operand = node.type;
	
	if (is_integer(result.type) === false) {
		throw new Error(`Unable to perform operation ${operand} on non-integer types ${type} ${type}`);
	}
	
	return result;
}

function visit_boolean_binary_expression (ctx: Context, node: Node) {
	const result = visit_binary_expresson(ctx, node);
	const left = ensure_expression_emits_boolean(result.left);
	const right = ensure_expression_emits_boolean(result.right);

	return {
		left,
		right
	};
}

function visit_binary_expresson (ctx: Context, node: Node) {
	const data = node.data as {
		left: Node
		right: Node
	};
	
	const left = visit_expression(data.left, ctx);
	const right = visit_expression(data.right, ctx);
	
	const operand = node.type;
	if (left.value_type !== right.value_type) {
		throw new Error(`Mismatched operand types for (${operand} ${left.value_type}  ${right.value_type})`);
	}
	
	return {
		type: left.value_type,
		left,
		right
	};
}

function visit_local_statement(node: Node, ctx: Context): WAST.WASTExpressionNode {
	switch (node.type) {
		case "expression":
		return visit_expression(node.data as Node, ctx);
		case "variable": {
			const data = node.data as {
				name: string
				type: string
				initial: Node
			};
			const type = validate_atium_type(data.type);
			const variable = ctx.declare_variable(data.name, type);
			const value = visit_expression(data.initial, ctx);
			
			if (value.value_type !== type)
			throw new Error("Initialiser type doesn't match variable type");
			
			return new WAST.WASTSetLocalNode(variable.id, data.name, value);
		}
		default: throw new Error(`Invalid node type ${node.type} @ ${node.start} expected a statement`);
	}
}

function ensure_expression_emits_boolean(expr: WAST.WASTExpressionNode): WAST.WASTExpressionNode {
	if (expr.value_type !== "boolean") {
		return wrap_boolean_cast(expr);
	}
	else {
		return expr;
	}
}

function wrap_boolean_cast(expr: WAST.WASTExpressionNode): WAST.WASTExpressionNode {
	switch (expr.value_type) {
		case "i64":
		case "i32":
		case "f32":
		case "f64":
		const zero = new WAST.WASTConstNode(expr.value_type, "0");
		return new WAST.WASTNotEqualsNode(zero, expr);
		case "boolean":
		return expr;
		case "void":
		default:
		throw new Error(`Unable to cast ${expr.value_type} to boolean value`);
	}
}

function default_initialiser(value_type: AtiumType): WAST.WASTExpressionNode {
	switch (value_type) {
		case "i64":
		case "i32":
		case "f32":
		case "f64":
		case "boolean":
		return new WAST.WASTConstNode(value_type, "0");
		case "void":
		default:
		throw new Error(`Unable to zero initialise ${value_type}`);
	}
}