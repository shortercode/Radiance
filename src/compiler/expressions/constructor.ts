import { AST, Compiler, TypeHint } from "../core";
import { type_assert, syntax_assert, is_defined } from "../error";
import { WASTExpressionNode } from "../../WASTNode";
import { create_object } from "./object";

function read_node_data (node: AST) {
	return node.data as {
		target: AST,
		fields: Map<string, AST>
	};
}

export function visit_constructor_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const ctx = compiler.ctx;
	const data = read_node_data(node);
	const values = [];

	type_assert(data.target.type === "identifier", node, `${data.target.type} is not a function`);
	
	const struct_name = data.target.data as string;
	const struct_decl = ctx.get_struct(struct_name)!;
	
	syntax_assert(is_defined(struct_decl), node, `Cannot construct undeclared struct ${struct_name}`);

	const struct_type = struct_decl.type;

	for (const [name, { type }] of struct_type.types) {
		const value_node = data.fields.get(name)!;
		syntax_assert(is_defined(value_node), node, `Field ${name} is missing on constructor`);
		const value = compiler.visit_expression(value_node, type);
		type_assert(value.value_type.equals(type), node, `Unable to assign field ${name} to type ${value.value_type.name}`);
		values.push(value);
	}

	syntax_assert(struct_type.types.size === data.fields.size, node, `Expected ${struct_type.types.size} fields but has ${data.fields.size}`);
	
	return create_object(compiler, node, struct_type, values);
}