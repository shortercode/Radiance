class SyntaxError extends Error {
  constructor (ln: number, column: number, msg: string, label: string) {
    super(`${msg} @ ${ln}:${column} "${label}"`);
  }
  toString () {
    return `SyntaxError: ${this.message}`;
  }
  static UnexpectedToken (token, label) {
    const { type, value, start: [ln, column] } = token;
    throw new SyntaxError(ln, column, `unexpected token "${type}:${value}"`, label);
  }
  static InvalidToken ([ln, column], value, label) {
    throw new SyntaxError(ln, column, `invalid or unexpected token "${value}"`, label);
  }
  static UnexpectedEndOfInput ([ln, column], label) {
    throw new SyntaxError(ln, column, "unexpected end of input", label);
  }
  static UnterminatedStringLiteral ([ln, column], label) {
    throw new SyntaxError(ln, column, "unterminated string literal", label);
  }
}

export default SyntaxError;