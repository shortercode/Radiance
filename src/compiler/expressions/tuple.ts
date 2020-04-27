import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTNodeList, WASTGetLocalNode, WASTStoreNode, WASTSetLocalNode, WASTCallNode, WASTConstNode } from "../../WASTNode";
import { I32_TYPE, AtiumType, create_tuple_type } from "../AtiumType";
import { is_defined, compiler_assert } from "../error";

function read_node_data (node: AST) {
	return node.data as {
		values: Array<AST>
	};
}

export function visit_tuple_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const data = read_node_data(node);

	if (data.values.length === 0) {
		return new WASTNodeList(node); // this is equivilent to returning a void value, without actually returning one ( as void is the abscense of a value )
	}

	const pointer = compiler.ctx.environment!.declare_hidden(node, "tuple_pointer", I32_TYPE);

	const get_pointer_expr = new WASTGetLocalNode(node, pointer.id, pointer.name, pointer.type);

	const value_types: Array<AtiumType> = []; 
	const result = new WASTNodeList(node);
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
		const value = compiler.visit_expression(sub_expr, type_hint);
		const type = value.value_type;
		value_types.push(type);
		const value_init = new WASTStoreNode(node, get_pointer_expr, value_offset, value);
		value_offset += type.size;
		result.nodes.push(value_init);
	}

	const tuple_type = create_tuple_type(value_types);
	result.value_type = tuple_type;

	const malloc_fn = compiler.ctx.get_function("malloc")!;
	compiler_assert(is_defined(malloc_fn), node, "Unable to locate malloc function");

	const call_malloc_expr = new WASTCallNode(node, malloc_fn.id, "malloc_temp", tuple_type, [
		new WASTConstNode(node, I32_TYPE, value_offset.toString())
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