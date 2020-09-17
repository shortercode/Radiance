import type AST from "../pratt/Node";
import type { TypePattern } from "./index";

interface FunctionContents {
	name: string;
	type: TypePattern;
	parameters: {
		name: string;
		type: TypePattern;
	}[];
	generics: string[];
	body: AST[]
};

export type FunctionNode = AST<FunctionContents, "function">;
export type ExportNode = AST<{
	name: string;
}, "export">;
export type ExportFunctionNode = AST<FunctionContents, "export_function">;
export type ImportFunctionNode = AST<{
	name: string;
	parameters: {
		name: string;
		type: TypePattern;
	}[];
	type: TypePattern;
}, "import_function">;
export type StructNode = AST<{
	name: string;
	fields: Map<string, TypePattern>;
	generics: string[];
}, "struct">;
export type EnumNode = AST<{
	name: string;
	cases: Map<string, Map<string, TypePattern>>;
	generics: string[];
}, "enum">
export type VariableNode = AST<{
	name: string;
	initial: AST | null;
	type: TypePattern | null;
}, "variable">;
export type ReturnNode = AST<AST | null, "return">;
export type TypeNode = AST<{
	name: string;
	type: TypePattern;
}, "type">;
export type BlockNode = AST<AST[], "block">;
export type ArrayNode = AST<AST[], "array">;
export type AssignmentNode = AST<{
	left: AST;
	right: AST;
}, "=">;
export type CallNode = AST<{
	callee: AST;
	generics: TypePattern[];
	arguments: AST[];
}, "call">;
export type ConstructorNode = AST<{
	target: AST;
	fields: Map<string, AST>;
	generics: TypePattern[];
}, "constructor">;
export type SubscriptNode = AST<{
	target: AST;
	accessor: AST;
}, "subscript">;
export type MemberNode = AST<{
	target: AST;
	member: string;
}, "member">;
export type GenericParametersNode = AST<{
	left: AST;
	parameters: TypePattern[];
}, "generic_parameters">;
export type GroupingNode = AST<AST, "group">
export type TypeCastNode = AST<{
	expr: AST;
	type: TypePattern;
}, "as">;
export type TupleNode = AST<{
	values: AST[]
}, "tuple">;
export type WhileNode = AST<{
	condition: AST;
	block: BlockNode;
}, "while">;
export type UnsafeNode = AST<BlockNode, "unsafe">;

type Case = { block: AST[], conditions: AST[] } & ({ style: "match" } | { style: "cast", identifier: string } | { style: "destructure", fields: string[] });

export type SwitchNode = AST<{
	parameter: AST;
	default: BlockNode | null;
	cases: Case[];
}, "switch">;
export type NotNode = AST<{
	subnode: AST;
}, "not">;
export type IfNode = AST<{
	condition: AST;
	thenBranch: BlockNode;
	elseBranch: BlockNode | null;
}, "if">;
export type IfLetNode = AST<{
	name: string;
	expr: AST;
	thenBranch: BlockNode;
	elseBranch: BlockNode | null;
}, "if_let">;
export type BinaryNode<T extends string = string> = AST<{ left: AST; right: AST }, T>;
export type UnaryNode<T extends string = string> = AST<AST, T>;
export type LiteralNode<T extends string = string> = AST<string, T>; 
export type BasicNode = AST;
