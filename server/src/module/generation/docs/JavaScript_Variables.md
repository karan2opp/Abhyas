# JavaScript Variables

## What is a Variable?

While writing code, we often need to store some information such as a
username, email, vehicle type, age, marks, or login status.

For storing this information, we use a container known as a
**variable**.

We can understand a variable as a **box or container** that has a name
and holds a value.

### Example

``` javascript
let message = "Hello!";
```

Here:

-   `message` is the name of the variable.
-   `"Hello!"` is the value stored in the variable.
-   `let` is the keyword used to declare the variable.

We can put different values into variables.

``` javascript
let message;

message = "Hello!";

message = "World!"; // value changed
```

When the value is changed, the variable now refers to the new value.

So, you can think of variables as **named storage locations used to
store data**.

------------------------------------------------------------------------

## Ways to Declare a Variable

There are three traditional keywords used to declare variables in
JavaScript:

-   `let`
-   `const`
-   `var`

Let's understand each one.

------------------------------------------------------------------------

# `let`

`let` is a keyword used to create variables whose values can be
reassigned.

### Declaration and Initialization

``` javascript
let name;       // declaration
name = "aman";  // initialization
```

**Declaration** means creating the variable without assigning a value.

**Initialization** means assigning the first value to a variable.

The assignment operator `=` assigns the value on the right side to the
variable on the left side.

``` javascript
name = "aman";
```

You can think of this as storing `"aman"` in the variable named `name`.

### Reassignment

The value of a `let` variable can be changed:

``` javascript
let name;       // declaration
name = "aman";  // initialization
name = "riya";  // reassignment
```

After the reassignment, `name` contains `"riya"`.

> **Note:** The technically correct term is **reassignment**, rather
> than "re-initialization", when an already initialized variable
> receives a new value.

------------------------------------------------------------------------

# `const`

As the name suggests, `const` is used when a variable should not be
reassigned.

For example, in mathematics, constants such as π represent values that
we generally treat as fixed.

In JavaScript:

``` javascript
const name = "john";
name = "michael"; // ❌ TypeError
```

A `const` variable must be initialized when it is declared:

``` javascript
const age = 19;
```

This is not allowed:

``` javascript
const age; // ❌ SyntaxError
```

A `const` variable cannot be reassigned:

``` javascript
const age = 19;
age = 20; // ❌ Error
```

### Important: `const` and Objects

`const` prevents **reassignment of the variable**, but it does not make
an object completely immutable.

``` javascript
const user = {
    name: "Aman"
};

user.name = "Riya"; // ✅ Allowed

user = {};          // ❌ Not allowed
```

The variable `user` cannot point to a different object, but the existing
object's properties can be changed.

------------------------------------------------------------------------

# `var`

`var` is another keyword used to declare variables.

A `var` variable can be reassigned:

``` javascript
var name = "aman";

name = "riya";
```

Unlike `let` and `const`, `var` also allows redeclaration in the same
scope:

``` javascript
var name = "aman";
var name = "riya";

console.log(name);
```

### Output

``` text
riya
```

The major difference is that `var` is **function-scoped**, while `let`
and `const` are **block-scoped**.

``` javascript
function test() {
    var name = "Aman";
}

console.log(name); // ❌ Error
```

Modern JavaScript generally prefers `let` and `const` over `var`.

------------------------------------------------------------------------

# `let` vs `const` vs `var`

  Feature                       `let`    `const`   `var`
  ----------------------------- -------- --------- ---------------
  Reassignment                  ✅ Yes   ❌ No     ✅ Yes
  Redeclaration in same scope   ❌ No    ❌ No     ✅ Yes
  Block scoped                  ✅ Yes   ✅ Yes    ❌ No
  Function scoped               No       No        ✅ Yes
  Must initialize immediately   ❌ No    ✅ Yes    ❌ No
  Recommended for modern JS     ✅       ✅        Usually avoid

------------------------------------------------------------------------

# How to Print the Value of Variables

We use `console.log()` to print values.

``` javascript
let name = "aman";
const age = 19;
var color = "blue";

console.log(name);
console.log(age);
console.log(color);
```

### Output

``` text
aman
19
blue
```

------------------------------------------------------------------------

# Scope

**Scope = where a variable can be accessed in your code.**

It defines the area of the program where a variable is visible and
accessible.

JavaScript mainly has:

-   Global scope
-   Function scope
-   Block scope

## Global Scope

A variable declared outside functions and blocks can generally be
accessed from many places in the program.

``` javascript
let a = 10;

function test() {
    console.log(a);
}

test();
```

### Output

``` text
10
```

The function can access `a` because `a` is in an outer scope.

------------------------------------------------------------------------

## Function Scope

A variable declared inside a function can be accessed only inside that
function.

``` javascript
function test() {
    let b = 20;
    console.log(b);
}

test();

console.log(b); // ❌ ReferenceError
```

------------------------------------------------------------------------

## Block Scope

A block is code surrounded by curly braces `{ }`.

`let` and `const` are block-scoped.

``` javascript
{
    let x = 5;
    const y = 10;

    console.log(x);
    console.log(y);
}

console.log(x); // ❌ ReferenceError
console.log(y); // ❌ ReferenceError
```

A block can be created by `if`, `for`, `while`, or simply by using
`{ }`.

``` javascript
if (true) {
    let message = "Hello";
    console.log(message);
}
```

------------------------------------------------------------------------

# Quick Summary

-   A **variable** is a named storage location used to hold a value.
-   `let` allows reassignment but not redeclaration in the same scope.
-   `const` does not allow reassignment and must be initialized when
    declared.
-   `var` allows reassignment and redeclaration and is function-scoped.
-   `console.log()` can be used to display values.
-   **Scope** determines where a variable can be accessed.
-   `let` and `const` are block-scoped.
-   `var` is function-scoped.

------------------------------------------------------------------------

# Conclusion

In this topic, we learned that **variables are named storage locations
used to store data** in JavaScript.

We explored the three variable declaration keywords --- **`let`,
`const`, and `var`** --- and understood their differences in
reassignment, redeclaration, and scope.

We also learned about **declaration, initialization, reassignment, and
`console.log()`**, and introduced **global, function, and block scope**.

Understanding variables and scope is one of the most important
foundations of JavaScript because almost every program needs to create,
read, update, and organize data.
