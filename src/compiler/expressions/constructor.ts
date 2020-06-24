import { AST, Compiler, TypeHint } from "../core";
import { type_assert, syntax_assert, is_defined, syntax_error, type_error } from "../error";
import { WASTExpressionNode, Ref, WASTConstNode } from "../../WASTNode";
import { create_object } from "./object";
import { StructDeclaration } from "../StructDeclaration";
import { EnumDeclaration, EnumCaseDeclaration } from "../EnumDeclaration";
import { I32_TYPE, StructLangType } from "../LangType";

function read_constructor_node_data (node: AST) {
	return node.data as {
		target: AST,
		fields: Map<string, AST>
	};
}

function read_identifier_node_data (node: AST) {
	return node.data as string;
}

function read_member_node_data (node: AST) {
	return node.data as {
		target: AST,
		member: string
	};
}

export function visit_constructor_expression (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const data = read_constructor_node_data(node);
	const ref = Ref.from_node(node);
	const values = [];

	const declaration = resolve_declaration(compiler, ref, data.target);
	let struct_type: StructLangType;

	if (declaration instanceof EnumCaseDeclaration) {
		struct_type = declaration.type.type;
		const case_index = declaration.type.case_index;

		values.push(new WASTConstNode(ref, I32_TYPE, case_index.toString()));
	}
	else if (declaration instanceof StructDeclaration) {
		struct_type = declaration.type;
	}
	else {
		type_error(ref, `Expected a struct or enum variant`);
	}

	for (const [name, { type }] of struct_type.types) {
		const value_node = data.fields.get(name)!;
		syntax_assert(is_defined(value_node), ref, `Field ${name} is missing on constructor`);
		const value = compiler.visit_expression(value_node, type);
		type_assert(value.value_type.equals(type), ref, `Unable to assign field ${name} to type ${value.value_type.name}`);
		values.push(value);
	}

	syntax_assert(struct_type.types.size === data.fields.size, ref, `Expected ${struct_type.types.size} fields but has ${data.fields.size}`);

	return create_object(compiler, ref, declaration.type, values, declaration.size);
}

type Declaration = StructDeclaration | EnumDeclaration | EnumCaseDeclaration;

function resolve_declaration (compiler: Compiler, ref: Ref, node: AST): Declaration {
	switch (node.type) {
		case "identifier": {
			const name = read_identifier_node_data(node);
			const declaration = compiler.ctx.get_struct(name) || compiler.ctx.get_enum(name)!;
			syntax_assert(is_defined(declaration), ref, `Cannot use undeclared constructor ${name}`);
			return declaration;
		}
		case "member": {
			const { target, member } = read_member_node_data(node);
			const obj = resolve_declaration(compiler, ref, target);
			
			type_assert(obj instanceof EnumDeclaration, ref, `Cannot access member constructor ${member} of non-enumurable declaration`);
			
			const enum_case_declaration = (obj as EnumDeclaration).cases.get(member);
			syntax_assert(is_defined(enum_case_declaration), ref, `Cannot use undeclared constructor ${member}`)

			return enum_case_declaration!;
		}
		default: {
			syntax_error(ref, `Invalid constructor type ${node.type}`);
		}
	}
}