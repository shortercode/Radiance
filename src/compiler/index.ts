import * as WAST from "../WASTNode"
import Node from "../pratt/Node";
import { AtiumType, parse_type, F64_TYPE, VOID_TYPE, BOOL_TYPE, create_tuple_type, I32_TYPE, I64_TYPE, TupleAtiumType, StructAtiumType } from "./AtiumType";
import { Context } from "./Context";
import { FunctionDeclaration } from "./FunctionDeclaration";
import { Environment } from "./Environment";
import { Variable } from "./Variable";
import { compiler_error, type_error, compiler_assert, syntax_assert, type_assert, syntax_error } from "./error";
import { InferContext } from "./InferContext";
import { guess_expression_type } from "./inference";
import { TypePattern } from "../parser/index";
import { StructDeclaration } from "./StructDeclaration";

const MEMORY_EXPORT_NAME = "memory";
const SHOULD_EXPORT_MEMORY = true;

type TypeHint = AtiumType | null;
/*
This class is the second stage of the process after the parser. It performs type validation
on the Atium code and converts it from a Atium AST to a WebAssembly AST. The final stage
serialises this WebAssembly AST into a binary file.
*/

export default function (node: Node): WAST.WASTModuleNode {
	const ctx: Context = new Context;
	compiler_assert(node.type === "module", node, `Invalid node type ${node.type} expected a module`);
	return visit_module(node, ctx);
}

function visit_module(node: Node, ctx: Context): WAST.WASTModuleNode {
	/*
	This is entry point to the compiler
	the public exported function does some simple setup
	and input verification but this actually creates the
	module and recusively visits the source AST
	*/
	
	const ref = WAST.Ref.from_node(node);
	const module = new WAST.WASTModuleNode(ref);
	const statements = node.data as Array<Node>;

	/*
	Generate any inbuilt functions and globals that we need
	internally.
	*/
	const malloc_stmt = generate_malloc_function(ref, ctx);	
	module.statements.push(malloc_stmt);

	/*
	Before processing the bulk of the AST we visit the structs and create them so
	that they can be referred to by the functions.

	Then we visit the functions and declare them so that the body of the code can
	refer to them.
	*/

	for (const stmt of statements) {
		hoist_struct_declaration(stmt, ctx);
	}

	for (const stmt of statements) {
		hoist_function_declaration(stmt, ctx);
	}
	
	for (const stmt of statements) {
		const wast_stmts = visit_global_statement(stmt, ctx);
		for (const wast_node of wast_stmts) {
			module.statements.push(wast_node);
		}
	}

	for (const global of ctx.global_variables) {
		const initialiser = new WAST.WASTNodeList(ref);
		const value_node = default_initialiser(global.source, global.type);
		initialiser.nodes.push(value_node);
		initialiser.value_type = global.type;
		const global_stmt = new WAST.WASTGlobalNode(global.source, global.id, global.type, initialiser);
		module.statements.push(global_stmt);
	}

	if (SHOULD_EXPORT_MEMORY) {
		const memory_stmt = new WAST.WASTMemoryNode(ref, 0,"main", 1);
		ctx.define_export(ref, MEMORY_EXPORT_NAME);
		const export_memory_stmt = new WAST.WASTExportNode(ref, "memory", MEMORY_EXPORT_NAME, memory_stmt.id);
		module.statements.push(memory_stmt, export_memory_stmt);
	}
	
	
	return module;
}

function generate_malloc_function (ref: WAST.Ref, ctx: Context) {
	/*
	NOTE this function is rather intense, this is what it should be creating
		let heap_top: i32 = 0

		func malloc (size: i32): i32 {
			let ptr: i32 = heap_top;
			heap_top = heap_top + size;
			ptr
		}
	*/
	const offset_var = ctx.declare_library_global_variable(ref, "heap_top", I32_TYPE);
	const size_variable = new Variable(ref, I32_TYPE, "size", 0);
	const fn_decl = ctx.declare_function(ref, "malloc", I32_TYPE, [ size_variable ]);

	const fn_wast = initialise_function_environment(ref, ctx, fn_decl);

	const ptr_var = ctx.environment!.declare(ref, "ptr", I32_TYPE);
	const get_offset_node = new WAST.WASTGetGlobalNode(ref, offset_var.id, offset_var.name, offset_var.type);
	const get_size_node = new WAST.WASTGetLocalNode(ref, size_variable.id, size_variable.name, size_variable.type);
	const calc_new_offset_node = new WAST.WASTAddNode(ref, I32_TYPE, get_offset_node, get_size_node);
	
	const set_pointer_node = new WAST.WASTSetLocalNode(ref, ptr_var.id, ptr_var.name, get_offset_node);
	const set_offset_node = new WAST.WASTSetGlobalNode(ref, offset_var.id, offset_var.name, calc_new_offset_node);
	const get_pointer_node = new WAST.WASTGetLocalNode(ref, ptr_var.id, ptr_var.name, ptr_var.type);

	fn_wast.body.nodes.push(
		set_pointer_node,
		set_offset_node,
		get_pointer_node
	);

	complete_function_environment(ctx, fn_wast, fn_decl);
	
	return fn_wast;
}

function hoist_function_declaration(node: Node, ctx: Context) {
	const ref = WAST.Ref.from_node(node);
	switch (node.type) {
		case "import_function": {
			const data = node.data as {
				name: string,
				parameters: Array<{ name: string, type: TypePattern }>,
				type: TypePattern
			};

			const parameters = data.parameters.map((param, index) => {
				const type = parse_type(param.type, ctx);
				return new Variable(WAST.Ref.from_node(node), type, param.name, index);
			});

			const return_type = parse_type(data.type, ctx);
			ctx.declare_function(ref, data.name, return_type, parameters);
			break;
		}
		case "export_function":
		case "function": {
			const data = node.data as {
				name: string
				type: TypePattern
				parameters: Array<{ name: string, type: TypePattern }>
				block: Node
			}
			
			const parameters = data.parameters.map((param, index) => {
				const type = parse_type(param.type, ctx);
				return new Variable(WAST.Ref.from_node(node), type, param.name, index);
			});

			const return_type = parse_type(data.type, ctx);
			ctx.declare_function(ref, data.name, return_type, parameters);
			break;
		}
	}
}

function hoist_struct_declaration(node: Node, ctx: Context) {
	const ref = WAST.Ref.from_node(node);
	if (node.type === "struct") {
		const data = node.data as {
			name: string, 
			fields: Map<string, TypePattern>
		};

		syntax_assert(data.fields.size > 0, ref, `Unable to declare struct ${data.name} as it has no fields. Structs must have at least 1 field`);
		
		const fields = new Map;

		for (const [name, pattern] of data.fields) {
			const type = parse_type(pattern, ctx);
			fields.set(name, type);
		}

		ctx.declare_struct(ref, data.name, fields);
	}
}

function visit_global_statement(node: Node, ctx: Context): Array<WAST.WASTStatementNode> {
	const source_ref = WAST.Ref.from_node(node);
	switch (node.type) {
		case "function": {
			const fn_wast = visit_function(node, ctx, source_ref);
			
			return [fn_wast];
		}
		case "struct": {
			// structs don't need to emit WASTNodes
			return [];
		}
		case "import_function": {
			const import_wast = visit_import_function(node, ctx, source_ref);

			return [import_wast];
		}
		case "export": {
			const data = node.data as {
				name: string
			};
			
			const export_wast = export_function(source_ref, data.name, ctx);
			const wrapper_fn_node = wrap_exported_function(source_ref, data.name, ctx);
			
			return [export_wast, wrapper_fn_node];
		}
		case "export_function": {
			const fn_wast = visit_function(node, ctx, source_ref);
			const export_wast = export_function(source_ref, fn_wast.name, ctx);
			const wrapper_fn_node = wrap_exported_function(source_ref, fn_wast.name, ctx);

			return [fn_wast, export_wast, wrapper_fn_node];
		}
		default: compiler_error(source_ref, `Invalid node type ${node.type} expected a statement`)
	}
}

function visit_function(node: Node, ctx: Context, ref: WAST.Ref) {
	/*
	NOTE prior to this "visit_declaration" has validated the
	.type and .parameter.*.type are AtiumType so we can do a
	direct cast here without the validation
	*/
	
	const data = node.data as {
		name: string
		type: TypePattern
		body: Array<Node>
		parameters: Array<{ name: string, type: TypePattern }>
	}
	/*
	WARN this SHOULD always be defined but this unwrap should have a
	compiler_assert to check that it is defined still
	*/
	const fn_decl = ctx.get_function(data.name)!; 
	compiler_assert(fn_decl instanceof FunctionDeclaration, ref, "Cannot locate function declaration");

	const fn_wast = initialise_function_environment(ref, ctx, fn_decl);
	
	const last = data.body.slice(-1)[0];
	const rest = data.body.slice(0, -1);

	for (const node of rest) {
		const sub_ref = WAST.Ref.from_node(node);
		const expr = visit_local_statement(sub_ref, node, ctx, null);
		fn_wast.body.nodes.push(expr);
	}

	if (last) {
		const sub_ref = WAST.Ref.from_node(last);
		const expr = visit_local_statement(sub_ref, last, ctx, fn_decl.type);
		fn_wast.body.nodes.push(expr);
	}

	complete_function_environment(ctx, fn_wast, fn_decl);

	return fn_wast;
}

function visit_import_function(node: Node, ctx: Context, ref: WAST.Ref) {
	const data = node.data as {
		name: string,
		parameters: Array<{ name: string, type: TypePattern }>,
		type: TypePattern
	};

	const fn_decl = ctx.get_function(data.name)!; 
	compiler_assert(fn_decl instanceof FunctionDeclaration, ref, "Cannot locate function declaration");

	const parameters = data.parameters.map(param => parse_type(param.type, ctx));
	const return_type = parse_type(data.type, ctx);

	return new WAST.WASTImportFunctionNode(ref, fn_decl.id, data.name, return_type, parameters);
}

function export_function(ref: WAST.Ref, fn_name: string, ctx: Context) {
	const fn = ctx.user_globals.get(fn_name);
	
	syntax_assert(typeof fn !== "undefined", ref, `Cannot export undeclared function ${fn_name}`);
	
	if (fn instanceof FunctionDeclaration) {
		for (const { name, type } of fn.parameters) {
			syntax_assert(type.is_exportable(), ref, `Cannot export function ${fn_name} because the parameter ${name} is not an exportable type`);
		}
		syntax_assert(fn.type.is_exportable(), ref, `Cannot export function ${fn_name} because the return value is not an exportable type`);
	}
	else {
		syntax_error(ref, `Cannot export ${fn_name} as it's not a function`);
	}

	ctx.define_export(ref, fn_name);

	return new WAST.WASTExportNode(ref, "function", fn_name, fn.id);
}

function wrap_exported_function(ref: WAST.Ref, name: string, ctx: Context) {
	const fn = ctx.get_function(name)!;
	
	syntax_assert(typeof fn !== "undefined", ref, `Cannot export undeclared function ${name}`);

	const wrapper_fn_decl = ctx.declare_hidden_function(name, fn.type, fn.parameters);
	const fn_wast = initialise_function_environment(ref, ctx, wrapper_fn_decl);

	const args: Array<WAST.WASTExpressionNode> = [];

	for (const param of wrapper_fn_decl.parameters) {
		args.push(new WAST.WASTGetLocalNode(ref, param.id, param.name, param.type));
	}

	const call_node = new WAST.WASTCallNode(ref, fn.id, name, fn.type, args);

	// TODO this is intended to allow functions called by the host environment to
	// include a prefix/postfix template, but we dont' do this yet. The idea being
	// that we can use a bump allocator for malloc which resets once we exit to the
	// host environment
	fn_wast.body.nodes.push(
		call_node
	);

	complete_function_environment(ctx, fn_wast, wrapper_fn_decl);
	
	return fn_wast;
}

function visit_expression(node: Node, ctx: Context, type_hint: TypeHint): WAST.WASTExpressionNode {
	const source_ref = WAST.Ref.from_node(node);
	switch (node.type) {
		case "block": {
			return visit_block_expression(source_ref, ctx, node, type_hint);
		}
		case "group": {
			return visit_group_expression(source_ref, ctx, node, type_hint);
		}
		case "number": {
			if (type_hint !== null && type_hint.is_numeric()) {
				const value = node.data as string;
				if (type_hint.is_integer() && (!should_create_int(value))) {
					type_error(source_ref, "Inference believes this value should be an integer but it contains a fractional part");
				}
				return new WAST.WASTConstNode(source_ref, type_hint, node.data as string);
			}
			else {
				const value = node.data as string;
				const type = should_create_int(value) ? I64_TYPE : F64_TYPE;

				return new WAST.WASTConstNode(source_ref, type, node.data as string);
			}
		}
		case "constructor": {
			return visit_constructor_expression(source_ref, ctx, node);
		}
		case "tuple": {
			return visit_tuple_expression(source_ref, ctx, node, type_hint);
		}
		case "call": {
			return visit_call_expression(source_ref, ctx, node);
		}
		case "not": {
			return visit_not_expression(source_ref, ctx, node);
		}
		case "if": {
			return visit_if_expression(source_ref, ctx, node, type_hint);
		}
		case "while": {
			return visit_while_loop_expression(source_ref, ctx, node, type_hint);
		}
		case "boolean": {
			return visit_boolean_expression(source_ref, ctx, node);
		}
		case "identifier": {
			return visit_identifier_expression(source_ref, ctx, node);
		}
		case "member": {
			return visit_member_expression(source_ref, ctx, node);
		}
		case "=": {
			return visit_assignment_expression(source_ref, ctx, node);
		}
		
		case "==": {
			const { left, right } = visit_numeric_binary_expression(ctx, node, null);
			return new WAST.WASTEqualsNode(source_ref, left, right);
		}
		case "!=": {
			const { left, right } = visit_numeric_binary_expression(ctx, node, null);
			return new WAST.WASTNotEqualsNode(source_ref, left, right);
		}
		case "<": {
			const { left, right } = visit_numeric_binary_expression(ctx, node, null);
			return new WAST.WASTLessThanNode(source_ref, left, right);
		}
		case ">": {
			const { left, right } = visit_numeric_binary_expression(ctx, node, null);
			return new WAST.WASTGreaterThanNode(source_ref, left, right);
		}
		case "<=": {
			const { left, right } = visit_numeric_binary_expression(ctx, node, null);
			return new WAST.WASTLessThanEqualsNode(source_ref, left, right);
		}
		case ">=": {
			const { left, right } = visit_numeric_binary_expression(ctx, node, null);
			return new WAST.WASTGreaterThanEqualsNode(source_ref, left, right);
		}
		
		case "+": {
			const { type, left, right } = visit_numeric_binary_expression(ctx, node, type_hint);
			return new WAST.WASTAddNode(source_ref, type, left, right);
		}
		case "-": {
			const { type, left, right } = visit_numeric_binary_expression(ctx, node, type_hint);
			return new WAST.WASTSubNode(source_ref, type, left, right);
		}
		case "*": {
			const { type, left, right } = visit_numeric_binary_expression(ctx, node, type_hint);
			return new WAST.WASTMultiplyNode(source_ref, type, left, right);
		}
		case "/": {
			const { type, left, right } = visit_numeric_binary_expression(ctx, node, type_hint);
			return new WAST.WASTDivideNode(source_ref, type, left, right);
		}
		case "%": {
			const { type, left, right } = visit_integer_binary_expression(ctx, node, type_hint);
			return new WAST.WASTModuloNode(source_ref, type, left, right);
		}

		case "as": {
			return visit_as_expression(source_ref, ctx, node);
		}

		case "and": {
			return visit_logical_and_expression(source_ref, ctx, node);
		}
		case "or": {
			return  visit_logical_or_expression(source_ref, ctx, node);
		}

		case "|": {
			return visit_bitwise_or_expression(source_ref, ctx, node, type_hint);
		}
		case "&": {
			return visit_bitwise_and_expression(source_ref, ctx, node, type_hint);
		}

		case "<<": {
			const { type, left, right } = visit_integer_binary_expression(ctx, node, type_hint);

			return new WAST.WASTLeftShiftNode(source_ref, type, left, right);
		}
		case ">>": {
			const { type, left, right } = visit_integer_binary_expression(ctx, node, type_hint);
			
			return new WAST.WASTRightShiftNode(source_ref, type, left, right);
		}
		
		default: compiler_error(source_ref, `Invalid node type ${node.type} expected an expression`);
	}		
}

function should_create_int (value: string): boolean {
	return !value.includes(".");
}

function visit_block_expression (ref: WAST.Ref, ctx: Context, node: Node, type_hint: TypeHint) {
	const node_list = new WAST.WASTNodeList(ref);
	const statements = node.data as Array<Node>;
	
	ctx.environment!.push_frame();
	
	let last_node;

	const last = statements.slice(-1)[0];
	const rest = statements.slice(0, -1);
	
	for (const stmt of rest) {
		const statement_ref = WAST.Ref.from_node(stmt);
		const result = visit_local_statement(statement_ref, stmt, ctx, null);
		node_list.nodes.push(result);
	}

	if (last) {
		const statement_ref = WAST.Ref.from_node(last);
		const result = visit_local_statement(statement_ref, last, ctx, type_hint);
		node_list.nodes.push(result);
		last_node = result;
		node_list.value_type = result.value_type;
	}
	else {
		node_list.value_type = VOID_TYPE;
	}
	
	ctx.environment!.pop_frame();
	
	return node_list;
}

function visit_group_expression (ref: WAST.Ref, ctx: Context, node: Node, type_hint: AtiumType | null) {
	const inner = node.data as Node;
	return visit_expression(inner, ctx, type_hint);
}

function visit_constructor_expression (ref: WAST.Ref, ctx: Context, node: Node): WAST.WASTExpressionNode {
	const data = node.data as {
		target: Node,
		fields: Map<string, Node>
	};

	type_assert(data.target.type === "identifier", ref, `${data.target.type} is not a function`);
	
	const struct_name = data.target.data as string;
	const struct_decl = ctx.get_struct(struct_name)!;
	
	syntax_assert(struct_decl instanceof StructDeclaration, ref, `Cannot construct undeclared struct ${struct_name}`);

	const struct_type = struct_decl.type;

	const pointer = ctx.environment!.declare_hidden(ref, "struct_pointer", I32_TYPE);
	const get_pointer_expr = new WAST.WASTGetLocalNode(ref, pointer.id, pointer.name, pointer.type);
	const result = new WAST.WASTNodeList(ref);

	for (const [name, { offset, type }] of struct_type.types) {
		const value_node = data.fields.get(name)!;
		syntax_assert(value_node instanceof Node, ref, `Field ${name} is missing on constructor`);
		const value = visit_expression(value_node, ctx, type);
		type_assert(value.value_type.equals(type), ref, `Unable to assign field ${name} to type ${value.value_type.name}`);
		const init = new WAST.WASTStoreNode(ref, get_pointer_expr, offset, value);
		result.nodes.push(init);
	}

	syntax_assert(struct_type.types.size === data.fields.size, ref, `Expected ${struct_type.types.size} fields but has ${data.fields.size}`);
	
	result.value_type = struct_type;

	const malloc_fn = ctx.get_function("malloc")!;
	compiler_assert(malloc_fn instanceof FunctionDeclaration, ref, "Unable to locate malloc function");

	const call_malloc_expr = new WAST.WASTCallNode(ref, malloc_fn.id, "malloc_temp", struct_type, [
		new WAST.WASTConstNode(ref, I32_TYPE, struct_decl.size.toString())
	]);
	const set_pointer_expr = new WAST.WASTSetLocalNode(ref, pointer.id, pointer.name, call_malloc_expr);

	result.nodes.unshift(set_pointer_expr); // add to FRONT
	result.nodes.push(get_pointer_expr);

	/*
		set_local "pointer" ( call malloc (i32.const VALUE_OFFSET))
		for value of tuple {
			store (get_local "pointer") (VALUE_EXPR) VALUE_OFFSET 
		}
		get_local "pointer"
	*/
	
	return result;
}

function visit_tuple_expression (ref: WAST.Ref, ctx: Context, node: Node, type_hint: TypeHint) {
	const data = node.data as {
		values: Array<Node>
	};

	if (data.values.length === 0) {
		return new WAST.WASTNodeList(ref); // this is equivilent to returning a void value, without actually returning one ( as void is the abscense of a value )
	}

	const pointer = ctx.environment!.declare_hidden(ref, "tuple_pointer", I32_TYPE);

	const get_pointer_expr = new WAST.WASTGetLocalNode(ref, pointer.id, pointer.name, pointer.type);

	const value_types: Array<AtiumType> = []; 
	const result = new WAST.WASTNodeList(ref);
	let type_hints: Array<AtiumType> | null = null;

	if (type_hint?.as_tuple() !== null) {
		const types = type_hint!.as_tuple()!.types;
		if (types.length === data.values.length) {
			type_hints = [];
			for (const { type } of types) {
				type_hints.push(type);
			}
		}
	}

	let value_offset = 0;
	for (const sub_expr of data.values) {
		const type_hint = type_hints ? type_hints.shift()! : null;
		const value = visit_expression(sub_expr, ctx, type_hint);
		const type = value.value_type;
		value_types.push(type);
		const value_init = new WAST.WASTStoreNode(ref, get_pointer_expr, value_offset, value);
		value_offset += type.size;
		result.nodes.push(value_init);
	}

	const tuple_type = create_tuple_type(value_types);
	result.value_type = tuple_type;

	const malloc_fn = ctx.get_function("malloc")!;
	compiler_assert(malloc_fn instanceof FunctionDeclaration, ref, "Unable to locate malloc function");

	const call_malloc_expr = new WAST.WASTCallNode(ref, malloc_fn.id, "malloc_temp", tuple_type, [
		new WAST.WASTConstNode(ref, I32_TYPE, value_offset.toString())
	]);
	const set_pointer_expr = new WAST.WASTSetLocalNode(ref, pointer.id, pointer.name, call_malloc_expr);

	result.nodes.unshift(set_pointer_expr); // add to FRONT
	result.nodes.push(get_pointer_expr);

	/*
		set_local "pointer" ( call malloc (i32.const VALUE_OFFSET))
		for value of tuple {
			store (get_local "pointer") (VALUE_EXPR) VALUE_OFFSET 
		}
		get_local "pointer"
	*/
	
	return result;
}

function visit_call_expression (ref: WAST.Ref, ctx: Context, node: Node) {
	const value = node.data as {
		callee: Node,
		arguments: Array<Node>
	};
	
	type_assert(value.callee.type === "identifier", ref, `${value.callee.type} is not a function`);
	
	const function_name = value.callee.data as string;
	const fn = ctx.get_function(function_name)!;
	
	syntax_assert(fn instanceof FunctionDeclaration, ref, `Cannot call undeclared function ${function_name}`)

	const args: Array<WAST.WASTExpressionNode> = [];
	
	const arg_count = value.arguments.length;
	const param_count = fn.parameters.length;

	syntax_assert(arg_count === param_count, ref, `Function ${function_name} expects ${param_count} arguments but ${arg_count} were given`);

	for (let i = 0; i < param_count; i++) {
		const arg = value.arguments[i];
		const param = fn.parameters[i];
		const expr = visit_expression(arg, ctx, param.type);

		type_assert(expr.value_type.equals(param.type), ref, `Argument of type ${arg.type} is not assignable to parameter of type ${param.type.name}`);
		
		args.push(expr);
	}
	
	return new WAST.WASTCallNode(ref, fn.id, function_name, fn.type, args)
}

function visit_not_expression (ref: WAST.Ref, ctx: Context, node: Node) {
	const value = node.data as {
		subnode: Node
	};

	const inner = visit_expression(value.subnode, ctx, BOOL_TYPE);
	return invert_boolean_expression(ref, inner);
}

function visit_if_expression (ref: WAST.Ref, ctx: Context, node: Node, type_hint: TypeHint) {
	const value = node.data as {
		condition: Node
		thenBranch: Node
		elseBranch: Node | null
	};

	let condition = visit_expression(value.condition, ctx, BOOL_TYPE);
	condition = ensure_expression_emits_boolean(condition);
	
	const then_branch = visit_expression(value.thenBranch, ctx, type_hint) as WAST.WASTNodeList;
	let value_type = then_branch.value_type;

	if (value.elseBranch !== null) {
		const else_branch = visit_expression(value.elseBranch, ctx, type_hint) as WAST.WASTNodeList;
		if (else_branch.value_type.equals(value_type) === false) {
			value_type = VOID_TYPE;
		}
		return new WAST.WASTConditionalNode(ref, value_type, condition, then_branch, else_branch);
	}
	else {
		const else_branch = new WAST.WASTNodeList(ref);
		return new WAST.WASTConditionalNode(ref, value_type, condition, then_branch, else_branch);
	}
}

function visit_while_loop_expression (ref: WAST.Ref, ctx: Context, node: Node, type_hint: TypeHint) {
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
	const while_body = visit_expression(value.block, ctx, type_hint) as WAST.WASTBlockNode;
	const return_value_type = while_body.value_type;
	const emits_value = return_value_type.is_void() === false;
	
	const node_list = new WAST.WASTNodeList(ref);
	
	// NOTE if we do return a value we need to add a temporary var to hold it
	let temp_variable = null;
	if (emits_value) {
		temp_variable = ctx.environment!.declare_hidden(ref, "while_temp_variable", while_body.value_type);
		const init_value_node = default_initialiser(ref, return_value_type);
		const init_node = new WAST.WASTSetLocalNode(ref, temp_variable.id, temp_variable.name, init_value_node);
		node_list.nodes.push(init_node);
	}
	
	{
		const block_node = new WAST.WASTBlockNode(ref);
		const loop_block = new WAST.WASTLoopNode(ref);
		block_node.body.nodes.push(loop_block);
		
		// NOTE we need to massage the condition a bit to get what we want
		{
			let condition = visit_expression(value.condition, ctx, BOOL_TYPE);
			condition = invert_boolean_expression(ref, condition);
			
			// NOTE finally wrap the condition in a conditional branch Op
			condition = new WAST.WASTConditionalBranchNode(ref, condition, 1);
			loop_block.body.push(condition);
		}
		
		// NOTE if we're emitting a value wrap the block in a set local
		// to stash it in our temp var
		if (emits_value) {
			const set_temp_node = new WAST.WASTSetLocalNode(ref, temp_variable!.id, temp_variable!.name, while_body);
			loop_block.body.push(set_temp_node);
		}
		else {
			loop_block.body.push(while_body)
		}
		
		// NOTE we need to add a branch 0 here to ensure the loop continues
		loop_block.body.push(new WAST.WASTBranchNode(ref, 0));
		
		node_list.nodes.push(block_node);
	}
	
	// NOTE finally if we're emitting a value then read back our output
	// from the temp variable
	if (emits_value) {
		const get_temp_node = new WAST.WASTGetLocalNode(ref, temp_variable!.id, temp_variable!.name, return_value_type);
		node_list.nodes.push(get_temp_node);
		node_list.value_type = get_temp_node.value_type;
	}
	
	return node_list;
}

function invert_boolean_expression (ref: WAST.Ref, expr: WAST.WASTExpressionNode) {
	// NOTE as an optmisation if it's
	// already inverted (e.g. while !false {} ) then we just remove that
	// inversion
	if (expr instanceof WAST.WASTNotNode) {
		return expr.inner;
	}
	else {
		// NOTE otherwise ensure that we have a boolean value then invert
		// invert it
		const boolean_expr = ensure_expression_emits_boolean(expr);
		return new WAST.WASTNotNode(ref, boolean_expr);
	}
}

function visit_boolean_expression (ref: WAST.Ref, ctx: Context, node: Node) {
	const value = node.data as string;
	const type = BOOL_TYPE
	if (value === "false") {
		return new WAST.WASTConstNode(ref, type, "0");
	}
	else if (value === "true") {
		return new WAST.WASTConstNode(ref, type, "1");
	}
	else {
		compiler_error(ref, "Invalid boolean value");
	}
}

function visit_identifier_expression (ref: WAST.Ref, ctx: Context, node: Node) {
	const name = node.data as string;
	const variable = ctx.get_variable(name)!;

	syntax_assert(variable !== null, ref, `Use of undeclared variable ${name}`);

	return new WAST.WASTGetLocalNode(ref, variable.id, name, variable.type);
}

function visit_member_expression (ref: WAST.Ref, ctx: Context, node: Node) {
	const value = node.data as {
		target: Node,
		member: string
	};

	const target = visit_expression(value.target, ctx, null);
	const target_tuple_type = target.value_type.as_tuple();

	if (target_tuple_type) {
		return visit_tuple_member_expression(ref, ctx, target, target_tuple_type, value.member);
	}
	
	const target_struct_type = target.value_type.as_struct();

	if (target_struct_type) {
		return visit_struct_member_expression(ref, ctx, target, target_struct_type, value.member);
	}

	type_error(ref, `Target does not have any properties`);
}

function visit_tuple_member_expression (ref: WAST.Ref, ctx: Context, target: WAST.WASTExpressionNode, target_type: TupleAtiumType, member: string) {
	const index = parseInt(member);

	compiler_assert(isFinite(index), ref, `Expected index to be a finite number`);

	const type_count = target_type.types.length;

	type_assert(index >= 0 && index < type_count, ref, `Cannot read member ${index} of tuple, as it only contains ${type_count} members.`);

	const { type, offset } = target_type.types[index]!;

	return new WAST.WASTLoadNode(ref, type, target, offset);
}

function visit_struct_member_expression (ref: WAST.Ref, ctx: Context, target: WAST.WASTExpressionNode, target_type: StructAtiumType, member: string) {
	const member_type = target_type.types.get(member)!;

	type_assert(member_type !== null, ref, `Cannot read member ${member} of tuple, as it doesn't contain a field of that name.`);
	// TODO add a "did you mean .blah_blah?"

	const { type, offset } = member_type;
	return new WAST.WASTLoadNode(ref, type, target, offset);
}

function visit_as_expression (ref: WAST.Ref, ctx: Context, node: Node ): WAST.WASTExpressionNode {
	const value = node.data as {
		expr: Node, 
		type: TypePattern
	};

	const target_type = parse_type(value.type, ctx);
	const new_value = visit_expression(value.expr, ctx, target_type);

	if (target_type.equals(new_value.value_type)) {
		return new_value;
	}

	if (target_type.is_float()) {
		type_assert(new_value.value_type.is_numeric(), ref, `Unable to cast non-numeric type ${new_value.value_type.name} to ${target_type.name}`);

		return new WAST.WASTConvertToFloat(ref, target_type, new_value);
	}
	else if (target_type.is_integer()) {
		type_assert(new_value.value_type.is_numeric(), ref, `Unable to cast non-numeric type ${new_value.value_type.name} to ${target_type.name}`);

		return new WAST.WASTConvertToInt(ref, target_type, new_value);
	}
	else if (target_type.is_boolean()) {
		return wrap_boolean_cast(new_value);
	}
	else {
		type_error(ref, `Unable to cast to type ${target_type.name}`);
	}
}

function visit_assignment_expression (ref: WAST.Ref, ctx: Context, node: Node) {
	const value = node.data as {
		left: Node
		right: Node
	};
	
	syntax_assert(value.left.type === "identifier", ref, `Invalid left hand side of assignment`);
	
	const variable_name = value.left.data as string;
	const variable = ctx.get_variable(variable_name)!;
	
	syntax_assert(variable !== null, ref, `Unable to assign to undeclared variable ${variable_name}`);
	
	// TODO in the future we may support type inference, in this case we would not pass the variable type in here
	const new_value = visit_expression(value.right, ctx, variable.type);
	
	// TODO improve error message
	type_assert(variable.type.equals(new_value.value_type), ref, `Assignment value doesn't match variable type`);
	
	return new WAST.WASTTeeLocalNode(ref, variable.id, variable.name, new_value, variable.type);
}

function visit_logical_and_expression (ref: WAST.Ref, ctx: Context, node: Node) {
	const {left, right } = visit_boolean_binary_expression(ctx, node);

	/*
	(left)
	(if
		(right)
	else
		false
	end)
	*/

	const boolean_type = BOOL_TYPE;

	const then_branch = new WAST.WASTNodeList(ref);
	then_branch.nodes.push(right);
	const else_branch = new WAST.WASTNodeList(ref);
	const false_node = new WAST.WASTConstNode(ref, boolean_type, "0");
	else_branch.nodes.push(false_node);

	return new WAST.WASTConditionalNode(ref, boolean_type, left, then_branch, else_branch);
}

function visit_logical_or_expression (ref: WAST.Ref, ctx: Context, node: Node) {
	const {left, right } = visit_boolean_binary_expression(ctx, node);

	/*
	(left)
	(if
		true
	else
		(right)
	end)
	*/
	
	const boolean_type = BOOL_TYPE;

	const then_branch = new WAST.WASTNodeList(ref);
	const true_node = new WAST.WASTConstNode(ref, boolean_type, "1"); 
	then_branch.nodes.push(true_node);
	const else_branch = new WAST.WASTNodeList(ref);
	else_branch.nodes.push(right);

	return new WAST.WASTConditionalNode(ref, boolean_type, left, then_branch, else_branch);
}

function visit_bitwise_or_expression (ref: WAST.Ref, ctx: Context, node: Node, type_hint: TypeHint) {
	const checked_type_hint = type_hint?.is_integer() || type_hint?.is_boolean() ? type_hint : null;
	const { left, right, type } = visit_binary_expresson(ctx, node, checked_type_hint);
	const operand = node.type;

	type_assert(type.is_integer() || type.is_boolean(), ref, `Unable to perform operation ${operand} on non-integer or non-boolean types ${type.name} ${type.name}`);

	return new WAST.WASTBitwiseOrNode(ref, type, left, right);
}

function visit_bitwise_and_expression (ref: WAST.Ref, ctx: Context, node: Node, type_hint: TypeHint) {
	const checked_type_hint = type_hint?.is_integer() || type_hint?.is_boolean() ? type_hint : null;
	const { left, right, type } = visit_binary_expresson(ctx, node, checked_type_hint);
	const operand = node.type;
	
	type_assert(type.is_integer() || type.is_boolean(), ref, `Unable to perform operation ${operand} on non-integer or non-boolean types ${type.name} ${type.name}`);

	return new WAST.WASTBitwiseAndNode(ref, type, left, right);
}

function visit_numeric_binary_expression (ctx: Context, node: Node, type_hint: TypeHint) {
	const result = visit_binary_expresson(ctx, node, type_hint);
	const type = result.type;
	const operand = node.type;
	
	type_assert(result.type.is_numeric(), node,`Unable to perform operation ${operand} on non-numeric types ${type.name} ${type.name}`);

	return result;
}

function visit_integer_binary_expression (ctx: Context, node: Node, type_hint: TypeHint) {
	const checked_type_hint = type_hint?.is_integer() ? type_hint : null;
	const result = visit_binary_expresson(ctx, node, checked_type_hint);
	const type = result.type;
	const operand = node.type;
	
	type_assert(result.type.is_integer(), node,`Unable to perform operation ${operand} on non-integer types ${type.name} ${type.name}`);
	
	return result;
}

function visit_boolean_binary_expression (ctx: Context, node: Node) {
	const result = visit_binary_expresson(ctx, node, BOOL_TYPE);
	const left = ensure_expression_emits_boolean(result.left);
	const right = ensure_expression_emits_boolean(result.right);

	return {
		left,
		right
	};
}

function visit_binary_expresson (ctx: Context, node: Node, type_hint: TypeHint) {
	const data = node.data as {
		left: Node
		right: Node
	};

	if (!type_hint) {
		const infer_ctx = new InferContext(ctx);
		const left_type = guess_expression_type(data.left, infer_ctx);
		const right_type = guess_expression_type(data.right, infer_ctx);
		// FIXME this needs fixing up; if left is an i32 literal and right is a f64
		// literal then it will hint both should be ints and loose the fractional
		// part with no warnings
		type_hint = left_type || right_type;
	}
	
	const left = visit_expression(data.left, ctx, type_hint);
	const right = visit_expression(data.right, ctx, type_hint);
	
	const operand = node.type;
	type_assert(left.value_type.equals(right.value_type), node, `Mismatched operand types for "${operand}" ${left.value_type.name} != ${right.value_type.name})`)
	
	return {
		type: left.value_type,
		left,
		right
	};
}

function visit_local_statement(ref: WAST.Ref, node: Node, ctx: Context, type_hint: TypeHint): WAST.WASTExpressionNode {
	switch (node.type) {
		case "expression":
		return visit_expression(node.data as Node, ctx, type_hint);
		case "variable": {
			const data = node.data as {
				name: string
				type: TypePattern | null
				initial: Node
			};

			let type;

			if (data.type) {
				type = parse_type(data.type, ctx)!;
			}
			else {
				const infer_ctx = new InferContext(ctx);
				type = guess_expression_type(data.initial, infer_ctx)!;
			}

			type_assert(type !== null, ref, `Unable to infer type of ${data.name} please include an explicit type`);

			const variable = ctx.declare_variable(ref, data.name, type);
			const value = visit_expression(data.initial, ctx, variable.type);
			
			type_assert(value.value_type.equals(type), node, `Initialiser type ${type.name} doesn't match variable type ${value.value_type.name}`);
			
			return new WAST.WASTSetLocalNode(ref, variable.id, data.name, value);
		}
		default: compiler_error(ref, `Invalid node type ${node.type} expected a statement`);
	}
}

function ensure_expression_emits_boolean(expr: WAST.WASTExpressionNode): WAST.WASTExpressionNode {
	if (expr.value_type.is_boolean()) {
		return wrap_boolean_cast(expr);
	}
	else {
		return expr;
	}
}

function wrap_boolean_cast(expr: WAST.WASTExpressionNode): WAST.WASTExpressionNode {
	const type = expr.value_type;
	if (type.is_boolean()) {
		return expr;
	}
	else if (type.is_numeric()) {
		const zero = new WAST.WASTConstNode(expr.source, type, "0");
		return new WAST.WASTNotEqualsNode(expr.source, zero, expr);
	}

	type_error(expr.source, `unable to cast expression to boolean`);
}

function default_initialiser(ref: WAST.Ref, value_type: AtiumType): WAST.WASTExpressionNode {
	if (value_type.is_boolean() || value_type.is_numeric()) {
		return new WAST.WASTConstNode(ref, value_type, "0");
	}

	compiler_error(ref, `Unable to zero initialise`);
}

function initialise_function_environment (ref: WAST.Ref, ctx: Context, fn_decl: FunctionDeclaration) {
	const fn_wast = new WAST.WASTFunctionNode(ref, fn_decl.id, fn_decl.name, fn_decl.type);
	
	ctx.environment = new Environment(fn_decl.parameters);
	
	for (const variable of fn_decl.parameters) {
		fn_wast.parameters.push(variable);
	}

	return fn_wast;
}

function complete_function_environment (ctx: Context, fn_wast: WAST.WASTFunctionNode, fn_decl: FunctionDeclaration) {
	const fn_body = fn_wast.body;
	const body_node_count = fn_body.nodes.length;

	if (body_node_count > 0) {
		const last_node = fn_body.nodes[body_node_count - 1];
		fn_body.value_type = last_node.value_type;
	}
	
	if (fn_decl.type.is_void()) {
		fn_wast.body.consume_return_value();
	}
	else {
		type_assert(fn_wast.body.value_type.equals(fn_decl.type), fn_wast.source, `Unable to return ${fn_wast.body.value_type.name} from ${fn_decl.name}`);
	}
	
	const locals = ctx.environment!.variables;

	for (const local of locals) {
		fn_wast.locals.push(local);
	}

	ctx.environment = null;
}