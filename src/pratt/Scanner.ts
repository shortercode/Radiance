import CharIterator from "./CharIterator.js";
import CharBuffer from "./CharBuffer.js";
import SyntaxError from "./SyntaxError.js";
import Token from "./Token.js";
import Trie from "./Trie.js";

export default class Scanner {
    symbols: Trie

    constructor (symbols: Trie) {        
        this.symbols = symbols;
    }

    *scan (str: string, label: string): Generator<Token> {
        const source = new CharIterator(str);
        const buffer = new CharBuffer();
        let previousToken;

        while (source.incomplete()) {
            let token = null;

            if (this.isIdentifier(source))
                token = this.scanIdentifier(source, buffer);

            else if (this.isNumber(source))
                token = this.scanNumber(source, buffer);

            else if (this.isString(source))
                token = this.scanString(source, buffer, label);

            else if (this.isSymbol(source))
                token = this.scanSymbol(source, buffer, label);

            else if (this.isWhitespace(source))
                source.consume();
                
            else
                SyntaxError.InvalidToken(source.position(), source.peek(), label);

            if (token)
                yield previousToken = this.checkNewline(previousToken, token);
        }
    }

    isIdentifier (source) {
        const ch = source.peek();
        return /^[_a-z]$/i.test(ch);
    }
    isSymbol (source) {
        const ch = source.peek();
        return this.symbols.has(ch);
    }
    isNumber (source) {
        const ch = source.peek();
        return /^[0-9]$/.test(ch);
    }
    isString (source) {
        const ch = source.peek();
        return ch === "\"";
    }
    isWhitespace (source) {
        const ch = source.peek();
        return /^\s$/.test(ch);
    }

    scanIdentifier (source, buffer) {
        const start = source.position();
        for (const ch of source) {
            buffer.push(ch);

            if (this.isIdentifier(source) === false && this.isNumber(source) === false)
                return new Token("identifier", buffer.consume(), start, source.position());
        }
    }
    scanNumber (source, buffer) {
        const start = source.position();
        for (const ch of source) {
            buffer.push(ch);

            if (!this.isNumber(source))
                break;
        }
    
        if (source.peek() === ".") {
            source.consume();
            if (this.isNumber(source))
            {
                buffer.push(".");
                if (this.isNumber(source)) {
                    for (const ch of source) {
                        buffer.push(ch);
                        
                        if (!this.isNumber(source))
                            break;
                    }
                }
            }
            else if (source.incomplete()){
                source.back()
            }
        }

        return new Token("number", buffer.consume(), start, source.position());
    }
    scanString (source, buffer, label) {
        const start = source.position();
        source.next(); // consume quote mark
        let isTextEscaped = false;

        for (const ch of source) {
            if (ch != "\"" || isTextEscaped == true) {
                if (isTextEscaped) {
                    isTextEscaped = false;
                    buffer.push(ch);
                } else {
                    if (ch == "\\")
                        isTextEscaped = true;
                    else
                        buffer.push(ch);
                }
            } else {
    
                return new Token(
                    "string",
                    buffer.consume(),
                    start,
                    source.position()
                );
            }
        }

        SyntaxError.UnterminatedStringLiteral(source.position(), label);
    }
    scanLineComment (source, buffer) {
        source.next();
        source.next();
        for (const ch of source) {
            if (ch === "\n") {
                // optional comment token here?
                return;
            }
        }
    }
    scanComment (source, buffer) {
        source.next();
        source.next();
        for (const ch of source) {
            if (ch === "*" && source.peek() === "/") {
                source.next(); // consume slash
                // optional comment token here?
                return;
            }
        }
    }
    scanSymbol (source, buffer, label) {
        let trie = this.symbols;

        if (source.peek() === "/") {
            const next = source.peekNext();

            if (next === "*")
                return this.scanComment(source, buffer);
            else if (next === "/")
                return this.scanLineComment(source, buffer);
        }

        const start = source.position();

        for (const ch of source) {
            const next = trie.get(ch);

            if (!next) {
                source.back();
                if (!trie.value)
                    SyntaxError.InvalidToken(source.position(), source.next(), label);
                break;
            }
            
            trie = next;
        }

        const value = trie.value;
        if (!value)
            SyntaxError.UnexpectedEndOfInput(source.position(), label);

        return new Token("symbol", value, start, source.position());
    }

    checkNewline (previous, token) {
        if (!previous || previous.end[0] < token.end[0])
            token.newline = true;
        return token;
    }
}