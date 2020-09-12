import { AST, Compiler, TypeHint } from "../core";
import { type_assert, syntax_assert, is_defined, syntax_error, type_error, compiler_assert } from "../error";
import { WASTExpressionNode, Ref, WASTConstNode } from "../../WASTNode";
import { create_object } from "./object";
import { StructDeclaration } from "../StructDeclaration";
import { EnumDeclaration, EnumCaseDeclaration } from "../EnumDeclaration";
import { I32_TYPE, StructLangType, LangType, parse_type } from "../LangType";
import { StructTemplateDeclaration } from "../StructTemplateDeclaration";
import { TypePattern } from "../../parser/index";
import { Declaration } from "../Declaration";
import { EnumTemplateDeclaration, EnumCaseTemplateDeclaration } from "../EnumTemplateDeclaration";

function read_constructor_node_data (node: AST) {
	return node.data as {
		target: AST,
		fields: Map<string, AST>,
		generics: TypePattern[]
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
	let type: LangType;
	let struct_type: StructLangType;
	let size: number;

	if (declaration instanceof EnumCaseDeclaration) {
		type = declaration.type;
		struct_type = declaration.type.type;
		size = type.size;
		const case_index = declaration.type.case_index;

		values.push(new WASTConstNode(ref, I32_TYPE, case_index.toString()));
	}
	else if (declaration instanceof EnumCaseTemplateDeclaration) {
		const generic_parameters = data.generics.map(pattern => parse_type(pattern, compiler.ctx));
		const inst = declaration.instance(ref, compiler.ctx, generic_parameters)!;
		compiler_assert(!!inst, ref, `Unable to instantiate enum variant`);
		type = inst.type;
		struct_type = inst.type.type;
		size = type.size;
		const case_index = inst.type.case_index;

		values.push(new WASTConstNode(ref, I32_TYPE, case_index.toString()));
	}
	else if (declaration instanceof StructDeclaration) {
		type = struct_type = declaration.type;
		size = type.size;
	}
	else if (declaration instanceof StructTemplateDeclaration) {
		const generic_parameters = data.generics.map(pattern => parse_type(pattern, compiler.ctx));
		const inst = declaration.instance(ref, compiler.ctx, generic_parameters);
		type = struct_type = inst.type;
		size = type.size;
	}
	else {
		type_error(ref, `Expected a struct or enum variant`);
	}

	for (const [name, { type }] of struct_type.types) {
		const value_node = data.fields.get(name)!;
		syntax_assert(is_defined(value_node), ref, `Field ${name} is missing on constructor`);
		const value = compiler.visit_expression(value_node, type);
		type_assert(type.equals(value.value_type), ref, `Unable to assign field "${name}" to type ${value.value_type.name}`);
		values.push(value);
	}

	syntax_assert(struct_type.types.size === data.fields.size, ref, `Expected ${struct_type.types.size} fields but has ${data.fields.size}`);

	return create_object(compiler, ref, type, values, size);
}

function resolve_declaration (compiler: Compiler, ref: Ref, node: AST): Declaration {
	switch (node.type) {
		case "identifier": {
			const name = read_identifier_node_data(node);
			const declaration = compiler.ctx.get_declaration(name)!;
			const is_enum = declaration instanceof EnumDeclaration;
			const is_enum_template = declaration instanceof EnumTemplateDeclaration
			const is_struct = declaration instanceof StructDeclaration;
			const is_struct_template = declaration instanceof StructTemplateDeclaration;

			syntax_assert(is_enum || is_enum_template || is_struct || is_struct_template, ref, `Cannot use undeclared constructor ${name}`);

			return declaration;
		}
		case "member": {
			const { target, member } = read_member_node_data(node);
			const obj = resolve_declaration(compiler, ref, target);
			
			if (obj instanceof EnumDeclaration) {
				const enum_case_declaration = obj.cases.get(member);
				syntax_assert(is_defined(enum_case_declaration), ref, `Cannot use undeclared constructor ${member}`)
	
				return enum_case_declaration!;
			}
			else if (obj instanceof EnumTemplateDeclaration) {
				const enum_case_declaration = obj.cases.get(member);
				syntax_assert(is_defined(enum_case_declaration), ref, `Cannot use undeclared constructor ${member}`)
	
				return enum_case_declaration!;
			}
			else {
				type_error(ref, `Cannot access member constructor ${member} of non-enumurable declaration`);
			}
		}
		case "generic_parameters": {
			const data = node.data as { left: AST, parameters: Array<TypePattern>};
			return resolve_declaration(compiler, ref, data.left);
		}
		default: {
			syntax_error(ref, `Invalid constructor type ${node.type}`);
		}
	}
}