# JavaScript `this`, `call()`, `apply()`, and `bind()`

In the previous blog, **[Arrow
Function](https://karan2opp.hashnode.dev/mastering-arrow-functions-in-js)**,
we studied arrow functions. In this blog, we are going to learn about
the `this` keyword and the `call()`, `apply()`, and `bind()` methods.

------------------------------------------------------------------------

# Understanding `this` with an Analogy

One day, an uncle in my colony asked me to go to the grocery shop and
bring a toothpaste. He didn't give me any money and told me:

> "Just tell the shopkeeper to write it in the account."

So I went to the shop and asked the shopkeeper for a toothpaste. After
giving it to me, he asked:

> "Whose account should I write it in?"

At that moment, I said my uncle's name.

Suddenly, I realized something interesting --- this situation is very
similar to the concept of **`this` in JavaScript**.

In JavaScript, the value of `this` in a regular function is determined
by **how the function is called**.

Just like the shopkeeper needed to know **who sent me** so he could
write the toothpaste in the correct account, JavaScript also determines
the value of `this` from the way a function is invoked.

A useful beginner-friendly way to remember this is:

> **`this` means: who called you?**

However, remember that this is a mental model. The exact behavior of
`this` depends on the function type and how the function is invoked.

------------------------------------------------------------------------

# `this` in a Regular Function

When a regular function is called normally, the value of `this` depends
on the JavaScript environment and whether strict mode is being used.

``` javascript
function abc() {
    console.log(this);
}

abc();
```

In a browser's non-module, non-strict context, a normal function call
can have `this` refer to the global `window` object.

In Node.js, the behavior depends on the execution context and module
system. In strict mode, a normal function call has:

``` javascript
this === undefined
```

For example:

``` javascript
"use strict";

function abc() {
    console.log(this);
}

abc();
```

### Output

``` text
undefined
```

The important concept to remember is:

> For a regular function, `this` is determined by **how the function is
> called**.

------------------------------------------------------------------------

# `this` Inside Objects

Let's understand `this` using the same uncle analogy.

``` javascript
const uncle = {
    name: "Mr. Sharma",

    buyToothpaste: function () {
        console.log(`Writing toothpaste in ${this.name}'s account.`);
    }
};

uncle.buyToothpaste();
```

### Output

``` text
Writing toothpaste in Mr. Sharma's account.
```

Inside the object, we call the function like this:

``` javascript
uncle.buyToothpaste();
```

The function is being called as a method of `uncle`.

Therefore, inside the regular function:

``` text
this → uncle
```

That is why:

``` javascript
this.name
```

gives:

``` text
Mr. Sharma
```

This matches our analogy: **the shopkeeper writes the toothpaste in the
account of the person who sent you.**

------------------------------------------------------------------------

# Arrow Functions Work Differently

Arrow functions do **not have their own `this`**.

Instead, they inherit `this` from their surrounding **lexical scope**.

Consider this example:

``` javascript
const uncle = {
    name: "Mr. Sharma",

    buyToothpaste: () => {
        console.log(`Writing toothpaste in ${this.name}'s account.`);
    }
};

uncle.buyToothpaste();
```

The arrow function does not bind `this` to the `uncle` object.

Instead, it takes `this` from its surrounding scope.

Therefore, `this.name` does not refer to:

``` javascript
uncle.name
```

and the result can be:

``` text
undefined
```

### Important Point

The important difference is:

> **Regular function → `this` depends on how the function is called.**

> **Arrow function → `this` comes from the surrounding lexical scope.**

This is one of the most important differences between regular functions
and arrow functions.

------------------------------------------------------------------------

# A Tricky Example

Let's look at another example that shows why arrow functions can
sometimes be useful.

``` javascript
const uncle = {
    name: "Mr. Sharma",
    brand: "colgate",

    buyToothpaste: function () {
        function brandName() {
            console.log(
                `Writing ${this.brand} toothpaste in ${this.name}'s account.`
            );
        }

        brandName();
    }
};

uncle.buyToothpaste();
```

### Output in a non-strict normal-function context

``` text
Writing undefined toothpaste in undefined's account.
```

------------------------------------------------------------------------

# Why Does This Happen?

Inside `buyToothpaste`, we created another **regular function**:

``` javascript
function brandName() {
    // ...
}
```

And we called it like this:

``` javascript
brandName();
```

This is a **normal function call**, not an object method call.

Since `this` in a regular function depends on how the function is
called, `brandName()` does not receive `uncle` as its `this`.

In strict mode, `this` inside `brandName()` would be:

``` javascript
undefined
```

In a non-strict browser-style context, it can refer to the global
object.

Because the global object does not contain the required `brand` and
`name` properties, the values are not the values from `uncle`.

------------------------------------------------------------------------

# Fixing It Using an Arrow Function

Now let's rewrite the inner function using an arrow function.

``` javascript
const uncle = {
    name: "Mr. Sharma",
    brand: "colgate",

    buyToothpaste: function () {
        const brandName = () => {
            console.log(
                `Writing ${this.brand} toothpaste in ${this.name}'s account.`
            );
        };

        brandName();
    }
};

uncle.buyToothpaste();
```

### Output

``` text
Writing colgate toothpaste in Mr. Sharma's account.
```

------------------------------------------------------------------------

# Why Does the Arrow Function Work Here?

Arrow functions do **not create their own `this`**.

Instead, they inherit `this` from their surrounding lexical scope.

Here, the surrounding scope is the `buyToothpaste` regular function.

When we call:

``` javascript
uncle.buyToothpaste();
```

the regular function gets:

``` text
this → uncle
```

The arrow function then inherits that same `this`.

So inside the arrow function:

``` text
this → uncle
```

Therefore:

``` javascript
this.brand
```

is:

``` text
colgate
```

and:

``` javascript
this.name
```

is:

``` text
Mr. Sharma
```

------------------------------------------------------------------------

# Key Takeaway

Keep this rule in mind:

> **Regular function → `this` depends on how the function is called.**

> **Arrow function → `this` comes from the surrounding lexical scope.**

This is why arrow functions are often useful inside object methods when
we need access to the parent function's `this`.

------------------------------------------------------------------------

# `call()`, `apply()`, and `bind()`

Now that we understand `this`, let's explore three important methods
that allow us to **manually control the value of `this`** for regular
functions:

-   `call()`
-   `apply()`
-   `bind()`

------------------------------------------------------------------------

# The Problem

Suppose we have an object representing our uncle:

``` javascript
const uncle = {
    name: "Mr. Sharma"
};
```

And a function that writes the toothpaste purchase in the account:

``` javascript
function buyToothpaste(brand, size) {
    console.log(
        `Writing ${brand} ${size} size toothpaste in ${this.name}'s account.`
    );
}

buyToothpaste("colgate", "small");
```

### Output in a non-strict normal-function context

``` text
Writing colgate small size toothpaste in undefined's account.
```

The normal function call does not use `uncle` as `this`.

So:

``` javascript
this.name
```

does not give:

``` text
Mr. Sharma
```

------------------------------------------------------------------------

# Fixing It Using `call()`

We can explicitly specify what `this` should refer to by using `call()`.

``` javascript
const uncle = {
    name: "Mr. Sharma"
};

function buyToothpaste(brand, size) {
    console.log(
        `Writing ${brand} ${size} size toothpaste in ${this.name}'s account.`
    );
}

buyToothpaste.call(uncle, "colgate", "small");
```

### Output

``` text
Writing colgate small size toothpaste in Mr. Sharma's account.
```

Here we are telling JavaScript:

``` text
Use uncle as this
```

The first argument to `call()` becomes the function's `this` value.

The remaining arguments are passed to the function individually.

------------------------------------------------------------------------

# `call()` Syntax

``` javascript
functionName.call(thisValue, argument1, argument2, ...);
```

For example:

``` javascript
buyToothpaste.call(uncle, "colgate", "small");
```

Here:

-   `uncle` → value of `this`
-   `"colgate"` → first argument
-   `"small"` → second argument

`call()` **executes the function immediately**.

------------------------------------------------------------------------

# Using `apply()`

`apply()` works almost the same as `call()`.

The main difference is how arguments are passed.

### With `call()`

Arguments are passed separately:

``` javascript
buyToothpaste.call(uncle, "colgate", "small");
```

### With `apply()`

Arguments are passed as an array:

``` javascript
buyToothpaste.apply(uncle, ["colgate", "small"]);
```

### Output

``` text
Writing colgate small size toothpaste in Mr. Sharma's account.
```

------------------------------------------------------------------------

# `apply()` Syntax

``` javascript
functionName.apply(thisValue, [argument1, argument2, ...]);
```

Here:

-   First argument → value of `this`
-   Second argument → array-like collection of arguments

Like `call()`, `apply()` **executes the function immediately**.

------------------------------------------------------------------------

# Using `bind()`

`bind()` works slightly differently.

Instead of executing the function immediately, `bind()` **returns a new
function with `this` bound to the specified object**.

### Example

``` javascript
const uncle = {
    name: "Mr. Sharma"
};

function buyToothpaste(brand, size) {
    console.log(
        `Writing ${brand} ${size} size toothpaste in ${this.name}'s account.`
    );
}

const buyForUncle = buyToothpaste.bind(uncle);

buyForUncle("colgate", "small");
```

### Output

``` text
Writing colgate small size toothpaste in Mr. Sharma's account.
```

Here:

``` javascript
const buyForUncle = buyToothpaste.bind(uncle);
```

creates a **new function**.

When that new function is called, `this` is bound to `uncle`.

------------------------------------------------------------------------

# `bind()` Can Also Bind Arguments

`bind()` can bind both `this` and some arguments in advance.

``` javascript
const uncle = {
    name: "Mr. Sharma"
};

function buyToothpaste(brand, size) {
    console.log(
        `Writing ${brand} ${size} size toothpaste in ${this.name}'s account.`
    );
}

const buySmallColgateForUncle =
    buyToothpaste.bind(uncle, "colgate", "small");

buySmallColgateForUncle();
```

### Output

``` text
Writing colgate small size toothpaste in Mr. Sharma's account.
```

This is useful when you want to create a specialized function from an
existing function.

------------------------------------------------------------------------

# `call()` vs `apply()` vs `bind()`

  -----------------------------------------------------------------------
  Method            Executes          How Arguments Are What It Returns
                    Immediately       Passed            
  ----------------- ----------------- ----------------- -----------------
  `call()`          Yes               Individually      Function's return
                                                        value

  `apply()`         Yes               As an array       Function's return
                                                        value

  `bind()`          No                Individually or   A new bound
                                      partially in      function
                                      advance           
  -----------------------------------------------------------------------

### Example

``` javascript
buyToothpaste.call(uncle, "colgate", "small");
```

``` javascript
buyToothpaste.apply(uncle, ["colgate", "small"]);
```

``` javascript
const buyForUncle = buyToothpaste.bind(uncle);
buyForUncle("colgate", "small");
```

------------------------------------------------------------------------

# A Simple Mental Model

You can remember these three methods using the toothpaste analogy:

### `call()`

> "Go to the shop **right now**, and write this purchase in Uncle's
> account."

``` javascript
buyToothpaste.call(uncle, "colgate", "small");
```

### `apply()`

> "Go to the shop **right now**, but here is the list of arguments in an
> array."

``` javascript
buyToothpaste.apply(uncle, ["colgate", "small"]);
```

### `bind()`

> "Create a new function that is permanently prepared to use Uncle's
> account. We'll call it later."

``` javascript
const buyForUncle = buyToothpaste.bind(uncle);
```

------------------------------------------------------------------------

# Important Points to Remember

-   `this` in a regular function depends on how the function is called.
-   A method call such as `uncle.buyToothpaste()` gives the regular
    function `this === uncle`.
-   Arrow functions do not have their own `this`.
-   Arrow functions inherit `this` from their lexical scope.
-   `call()` invokes a function immediately with a specified `this`.
-   `apply()` invokes a function immediately with a specified `this` and
    arguments supplied as an array.
-   `bind()` does not invoke the function immediately.
-   `bind()` returns a new function with `this` bound to the specified
    value.
-   `bind()` can also pre-fill arguments.
-   `call()` and `apply()` are useful when you need immediate execution.
-   `bind()` is useful when you need a reusable function with a fixed
    `this`.

------------------------------------------------------------------------

# Conclusion

The `this` keyword in JavaScript helps determine **which object a
regular function is operating on when it is called**.

A useful beginner-friendly way to think about it is:

> **"Who called the function?"**

Just like the shopkeeper in our story needed to know **whose account to
write the toothpaste in**, JavaScript determines the value of `this`
from the function's invocation.

We learned that in **regular functions**, the value of `this` depends on
**how the function is called**, while **arrow functions inherit `this`
from their surrounding lexical scope**.

We also learned how `call()`, `apply()`, and `bind()` allow us to
explicitly control the `this` value of regular functions:

-   **`call()`** → executes immediately and accepts arguments
    individually.
-   **`apply()`** → executes immediately and accepts arguments as an
    array.
-   **`bind()`** → returns a new function with `this` bound for later
    execution.

Understanding `this`, `call()`, `apply()`, and `bind()` is important for
working with JavaScript objects, methods, callbacks, and more advanced
JavaScript patterns.
