import { AST, Compiler, TypeHint } from "../core";
import { type_assert, syntax_assert, is_defined, compiler_assert } from "../error";
import { WASTExpressionNode, WASTGetLocalNode, WASTNodeList, WASTStoreNode, WASTConstNode, WASTCallNode, WASTSetLocalNode } from "../../WASTNode";
import { I32_TYPE } from "../AtiumType";

function read_node_data (node: AST) {
	return node.data as {
		target: AST,
		fields: Map<string, AST>
	};
}

export function visit_constructor_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const ctx = compiler.ctx;
	const data = read_node_data(node);

	type_assert(data.target.type === "identifier", node, `${data.target.type} is not a function`);
	
	const struct_name = data.target.data as string;
	const struct_decl = ctx.get_struct(struct_name)!;
	
	syntax_assert(is_defined(struct_decl), node, `Cannot construct undeclared struct ${struct_name}`);

	const struct_type = struct_decl.type;

	const pointer = ctx.environment!.declare_hidden(node, "struct_pointer", I32_TYPE);
	const get_pointer_expr = new WASTGetLocalNode(node, pointer.id, pointer.name, pointer.type);
	const result = new WASTNodeList(node);

	for (const [name, { offset, type }] of struct_type.types) {
		const value_node = data.fields.get(name)!;
		syntax_assert(is_defined(value_node), node, `Field ${name} is missing on constructor`);
		const value = compiler.visit_expression(value_node, type);
		type_assert(value.value_type.equals(type), node, `Unable to assign field ${name} to type ${value.value_type.name}`);
		const init = new WASTStoreNode(node, get_pointer_expr, offset, value);
		result.nodes.push(init);
	}

	syntax_assert(struct_type.types.size === data.fields.size, node, `Expected ${struct_type.types.size} fields but has ${data.fields.size}`);
	
	result.value_type = struct_type;

	const malloc_fn = ctx.get_function("malloc")!;
	compiler_assert(is_defined(malloc_fn), node, "Unable to locate malloc function");

	const call_malloc_expr = new WASTCallNode(node, malloc_fn.id, "malloc_temp", struct_type, [
		new WASTConstNode(node, I32_TYPE, struct_decl.size.toString())
	]);
	const set_pointer_expr = new WASTSetLocalNode(node, pointer.id, pointer.name, call_malloc_expr);

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