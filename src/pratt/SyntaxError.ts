import Token from "./Token";

class SyntaxError extends Error {
  constructor (ln: number, column: number, msg: string, label: string) {
    super(`${msg} @ ${ln}:${column} "${label}"`);
  }
  toString () {
    return `SyntaxError: ${this.message}`;
  }
  static UnexpectedToken (token: Token, label: string): never {
    const { type, value, start: [ln, column] } = token;
    throw new SyntaxError(ln, column, `unexpected token "${type}:${value}"`, label);
  }
  static InvalidToken ([ln, column]: [number, number], value: string, label: string): never {
    throw new SyntaxError(ln, column, `invalid or unexpected token "${value}"`, label);
  }
  static UnexpectedEndOfInput ([ln, column]: [number, number], label: string): never {
    throw new SyntaxError(ln, column, "unexpected end of input", label);
  }
  static UnterminatedStringLiteral ([ln, column]: [number, number], label: string): never {
    throw new SyntaxError(ln, column, "unterminated string literal", label);
  }
}

export default SyntaxError;