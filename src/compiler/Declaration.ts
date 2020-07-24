import { Variable } from "./Variable";
import { EnumDeclaration, EnumCaseDeclaration } from "./EnumDeclaration";
import { FunctionDeclaration } from "./FunctionDeclaration";
import { StructDeclaration } from "./StructDeclaration";
import { TypeAlias } from "./TypeAlias";
import { FunctionTemplateDeclaration } from "./FunctionTemplateDeclaration";
import { StructTemplateDeclaration } from "./StructTemplateDeclaration";
import { EnumTemplateDeclaration, EnumCaseTemplateDeclaration } from "./EnumTemplateDeclaration";

export type Declaration = Variable
	| EnumDeclaration
	| EnumCaseDeclaration
	| EnumTemplateDeclaration
	| EnumCaseTemplateDeclaration
	| StructDeclaration
	| StructTemplateDeclaration
	| FunctionDeclaration
	| FunctionTemplateDeclaration
	| TypeAlias;