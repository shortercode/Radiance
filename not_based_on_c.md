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
The addition of the power operator in ES2016 was a breath of fresh air. It isn't technically needed, as `Math.pow` did exactly the same thing. But it always felt odd that a basic mathmatical concept wasnt' an operator! I'd love to implement this in Radiance, but upsettingly the WASM binary format doesn't have an opcode for it. So we would have to patch through to JS land anyway. At some point I'm meaning to look into better JS integration, which would allow us to add this.

## C style for loops
Do you know that JS has 3 different types of `for` loops?
```javascript
const arr = [1,2,3]
for (let i = 0; i < arr.length; i++) {
  const value = arr[i];
  console.log(value);
}

for (let i in arr) {
  const value = arr[i];
  console.log(value);
}

for (let value of arr) {
  console.log(value);
}
```
Trying to parse that is great fun by the way, as my experiments in parsing JS found. The newest one, `for..of` is great, does exactly what you want most of the time. It calls whatever the objects iteration method is and gives you value. Awesome. It's a bit awkward if you want to also have the index, but you can work around that.

`for..in` is a bit older. It enumerates over the indecies of an object. Down side is back in the wild west days of JS objects sometimes had random enumerable properties tagged on via their prototype, leading to fun code like this:

```javascript
function forEach(dict, fn) {
    for (key in dict) {
        if (dict.hasOwnProperty(key))
            fn(key, dict[key]);
    }
}
```

Mmm not so great. Oh it does it's job, but using iterators is much more powerful and avoid funky enumerability problems.|

Last and definitely least we have a carbon copy of the c style for loop ( unsurprisingly ). The syntax is goofy, and requires a lot of boilerplate to do simple array iteration.

As Radiance is a new language, we don't have to support c style for loops. Notably Rust doesn't support them either. Instead it just has iteration based loops, and Radiance is going down exactly the same path. It's not the simplist route for us to implement, but it's the best for the developer.

## Switch with default fallthrough
There's a lot I don't like about C style switch statements. They have weird scoping rules, they are verbose and then there's default fallthrough... which is a quiet and frustrating source of errors, and almost never the behaviour you actually want.

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
