import { Variable } from "./Variable";
import { EnumDeclaration, EnumCaseDeclaration } from "./EnumDeclaration";
import { FunctionDeclaration } from "./FunctionDeclaration";
import { StructDeclaration } from "./StructDeclaration";
import { TypeAlias } from "./TypeAlias";
import { FunctionTemplateDeclaration } from "./FunctionTemplateDeclaration";
import { StructTemplateDeclaration } from "./StructTemplateDeclaration";

export type Declaration = Variable
	| EnumDeclaration
	| EnumCaseDeclaration
	| StructDeclaration
	| StructTemplateDeclaration
	| FunctionDeclaration
	| FunctionTemplateDeclaration
	| TypeAlias;