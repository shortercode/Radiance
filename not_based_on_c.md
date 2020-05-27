# Not based on C

This document discusses the blog post [Let's stop copying C](https://eev.ee/blog/2016/12/01/lets-stop-copying-c/) and how it has inspired Radiance. The OP covers many aspects of the C language which are disliked by some programmers, and which have spread out to other languages. So it's an opinion piece, but the interesting part is that it compares these in context with other languages and what variations exist to solve the problems. Making it quite an interesting piece when considering the syntax and behaviour of a new language. 

As a disclaimer, I don't use C very often. But I don't mind it. Many things I see in it are in part the obvious solutions to implement a language. Obvious solutions are not always the best way, but without C we would likely not know the downsides related to these solutions.

## Textual inclusion
Including other files in a surprising number of languages breaks down to compiling the file and dropping it into the current scope. Without the concept of a namespace you end up with the possibility of conflicting definitions, and it can be quite hard to discover where the symbol is definied. The other side of this coin is that you can end up with quite complex imports if you have to specify exactly which symbol you want to import from another file.

We haven't come up with a definitive answer to the module system for Radiance, but we are expecting some form of namespacing and explicit exports for modules. One possible answer could be the following:

*main.rad*
```rust
import Math from math

export fn main () {
  Math.pow(2, 16)
}
```

*math.rad*
```rust
export fn pow (base: f64, power: u32) -> f64 {
  let result = base
  for i of 0...power {
    result = result * base
  }
}
```

But this could be confused with our syntax for import/exporting from the host environment. Should all modules be allowed to expose/include functions to the host or should it only be done through the entry module of the program? Is it okay to have similar syntax for these 2 subtly different concepts?

## Optional Block delimiter
When parsing statements that include a block in C or it's decendants ( such as `if` and `while` ) the body can be any statement like so `if (CONDITION) STATEMENT`, hence allowing the 2 common forms:

```javascript
while (true) {
  console.log("uh oh I think I'm stuck in a loop");
}

while (true)
  console.log("uh oh I think I'm stuck in a loop");
```

It's not so much that there are 2 forms. Its just in one case we have a block statement and in the other an expression statement. The average IDE can get pretty confused about indentation if you use the latter style, leading to potentially dangerous code like the following:

```c
if ((err = SSLHashSHA1.update(&hashCtx, &signedParams)) != 0)
    goto fail;
    goto fail;  /* MISTAKE! THIS LINE SHOULD NOT BE HERE */
if ((err = SSLHashSHA1.final(&hashCtx, &hashOut)) != 0)
    goto fail;
```

The new hotness which the likes of Rust and Swift use is `if CONDITION { STATEMENT* }`, note how parentheses are not required around the condition any more but the braces must be used. This reduces the visual noise, and enforces a safer form of the body. The only downside being a slightly more complicated parsing logic, but it's much easier for humans! So this is a bit of a no brainer for Radiance. 

```
while true {
  console.log("uh oh I think I'm stuck in a loop");
}
```

## Bitwise operator precedence
If you've ever been bitten by the following, after you've figured out what's going on you probably just think "well that's stupid".

```c
1 + 2 == 3  // (1 + 2) == 3
1 * 2 == 3  // (1 * 2) == 3
1 | 2 == 3  // 1 | (2 == 3)
```

The precedence of `|` and `&` is not the same as the standard arithmetic operators, as so not to confuse programmers coming from B. Although nowadays it probably causes much more confusion! It's an easy decision to correct the precedence for Radiance. This usage is uncommon enough that most people won't make the assumption about the precedence being like C.  

## Negative Modulo
In C style languages the result of a negative modulo operation is also negative. Which isn't much of a surprise, but is perhaps less useful.

## Leading zero for octal
Languages should not treat `013` as `11`. It's just inviting errors from developers who want their numbers to line up in a pretty way. The JS syntax of 0o13 for Octal is much better, and having different letters allows definition of other bases as well such as hexadecimal (0xFF) and binary (0b10). Wether or not having a leading zero should be a syntax error or not... well that an exercise for the reader.

## No power operator


## C style for loops
## Switch with default fallthrough
## Type first
## Weak typing
## Integer division
## Bytestrings
## Increment or Decrement
## `!`
## Single return
## Silent errors
## Nulls
## Assignment as expression
## No hyphens in expressions
## Braces and semicolons 
