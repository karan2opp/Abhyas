# JavaScript Template Literals

In this blog, we are going to learn about **template literals** and
understand the problems with traditional string syntax that template
literals solve.

------------------------------------------------------------------------

# Problem with Traditional String Syntax

Suppose we have two variables:

``` javascript
let name = "karan";
let age = 23;
```

Now we want to print a sentence containing the values of both variables.

We might try:

``` javascript
console.log("My name is name and my age is age");
```

### Output

``` text
My name is name and my age is age
```

But this is not what we wanted.

We wanted:

``` text
My name is karan and my age is 23
```

The problem is that when we use normal strings with double quotes or
single quotes, JavaScript treats everything inside the quotes as
**literal text**.

It does not automatically understand that `name` and `age` refer to
variables.

This is where **template literals** solve the problem.

------------------------------------------------------------------------

# Template Literals

Template literals provide a convenient way to create strings and **embed
variables or expressions directly inside them**.

Template literals use **backticks**:

``` text
`
```

Instead of:

``` text
" "
```

or:

``` text
' '
```

To insert a variable or expression inside a template literal, we use:

``` javascript
${}
```

Let's see an example.

``` javascript
let name = "karan";
let age = 23;

console.log(`My name is ${name} and my age is ${age}`);
```

### Output

``` text
My name is karan and my age is 23
```

Here:

``` javascript
${name}
```

means:

> Insert the value of the `name` variable here.

And:

``` javascript
${age}
```

means:

> Insert the value of the `age` variable here.

So the template literal:

``` javascript
`My name is ${name} and my age is ${age}`
```

becomes:

``` text
My name is karan and my age is 23
```

------------------------------------------------------------------------

# Syntax of a Template Literal

The basic syntax is:

``` javascript
`Hello ${variable}`
```

For example:

``` javascript
let username = "Karan";

console.log(`Hello ${username}`);
```

### Output

``` text
Hello Karan
```

So remember:

``` text
Backticks → ``
Variable/expression → ${}
```

------------------------------------------------------------------------

# Multi-Line Strings

Another advantage of using backticks is that they allow a string to span
**multiple lines**.

For example:

``` javascript
let guestList = `Guests:
 * John
 * Pete
 * Mary
`;

console.log(guestList);
```

### Output

``` text
Guests:
 * John
 * Pete
 * Mary
```

The line breaks written inside the template literal are preserved.

This makes template literals very convenient for writing multi-line
strings.

------------------------------------------------------------------------

# Multi-Line Strings Without Template Literals

With traditional strings, we cannot simply write a string across
multiple lines like this:

``` javascript
const guestList = "Guests:
* John
* Pete";
```

This produces a syntax error.

However, we can create a multi-line string using special escape
characters.

The newline character is:

``` text
\n
```

Example:

``` javascript
let guestList = "Guests:\n * John\n * Pete\n * Mary";

console.log(guestList);
```

### Output

``` text
Guests:
 * John
 * Pete
 * Mary
```

So traditional strings can create multi-line output using `\n`, but
template literals make it much cleaner and easier to read.

------------------------------------------------------------------------

# Expressions Inside Template Literals

Template literals can contain not only variables but also
**expressions**.

For example:

``` javascript
let a = 5;
let b = 10;

console.log(`Sum is ${a + b}`);
```

### Output

``` text
Sum is 15
```

JavaScript evaluates the expression:

``` javascript
a + b
```

and inserts the result into the string.

------------------------------------------------------------------------

# More Examples of Expressions

We can use different expressions inside `${}`.

### Arithmetic

``` javascript
let price = 100;
let quantity = 3;

console.log(`Total price is ${price * quantity}`);
```

### Output

``` text
Total price is 300
```

### Function Call

``` javascript
function greet() {
    return "Namaste";
}

console.log(`Message: ${greet()}`);
```

### Output

``` text
Message: Namaste
```

### Conditional Expression

``` javascript
let age = 20;

console.log(`Status: ${age >= 18 ? "Adult" : "Minor"}`);
```

### Output

``` text
Status: Adult
```

------------------------------------------------------------------------

# Use Cases in Modern JavaScript

Template literals are commonly useful whenever we need to create dynamic
strings.

## 1. Dynamic HTML

We can generate HTML strings using template literals.

``` javascript
let name = "Karan";

let html = `<h1>Hello ${name}</h1>`;

console.log(html);
```

### Output

``` html
<h1>Hello Karan</h1>
```

This approach is commonly used in JavaScript when constructing HTML
strings dynamically.

> **Note:** React uses JSX, which is a separate syntax that looks
> similar in some ways but is not simply the same thing as template
> literals.

------------------------------------------------------------------------

# 2. API Responses and Logs

Template literals are useful for creating dynamic log messages.

``` javascript
let user = "Karan";

console.log(`User ${user} logged in at ${new Date()}`);
```

Example output:

``` text
User Karan logged in at [current date and time]
```

The values of `user` and `new Date()` are inserted into the string
automatically.

------------------------------------------------------------------------

# 3. Creating URLs

Template literals are useful for constructing URLs containing dynamic
values.

``` javascript
let id = 101;

let url = `https://api.com/user/${id}`;

console.log(url);
```

### Output

``` text
https://api.com/user/101
```

This is useful when the URL contains values that change dynamically.

------------------------------------------------------------------------

# 4. Expressions Inside Strings

We can directly perform calculations inside `${}`.

``` javascript
let a = 5;
let b = 10;

console.log(`Sum is ${a + b}`);
```

### Output

``` text
Sum is 15
```

------------------------------------------------------------------------

# Template Literals vs Traditional Strings

  Feature                    Traditional Strings      Template Literals
  -------------------------- ------------------------ ---------------------
  Quotes                     `' '` or `" "`           Backticks `` ` ` ``
  Embed variables directly   ❌                       ✅
  `${}` expressions          ❌                       ✅
  Multi-line strings         Requires `\n`            ✅ Directly
  Dynamic strings            More difficult to read   Cleaner and easier

------------------------------------------------------------------------

# Quick Revision

### Traditional String

``` javascript
let name = "Karan";

console.log("Hello name");
```

### Output

``` text
Hello name
```

### Template Literal

``` javascript
let name = "Karan";

console.log(`Hello ${name}`);
```

### Output

``` text
Hello Karan
```

### Multi-Line Template Literal

``` javascript
let message = `Hello Karan,
Welcome to JavaScript!
Keep learning.`;

console.log(message);
```

### Expression

``` javascript
let a = 10;
let b = 20;

console.log(`The sum is ${a + b}`);
```

### Output

``` text
The sum is 30
```

------------------------------------------------------------------------

# Important Points to Remember

-   Template literals use **backticks** instead of single or double
    quotes.
-   Variables can be embedded using `${}`.
-   Expressions can also be placed inside `${}`.
-   Template literals make dynamic strings easier to read.
-   Template literals support multi-line strings without manually adding
    `\n`.
-   They are useful for dynamic HTML strings, logs, URLs, messages, and
    other dynamic text.
-   `${}` can contain variables, arithmetic expressions, function calls,
    and other JavaScript expressions.

------------------------------------------------------------------------

# Conclusion

Template literals make working with strings in JavaScript much easier
and cleaner.

They allow us to:

-   **Embed variables directly** using `${}`.
-   **Embed expressions** inside strings.
-   **Write multi-line strings** without extra newline characters.
-   Improve code **readability and maintainability**.

For example:

``` javascript
let name = "Karan";
let age = 23;

console.log(`My name is ${name} and I am ${age} years old.`);
```

Instead of manually joining strings and variables, template literals let
us write the sentence naturally.

Understanding template literals is important because dynamic strings are
used frequently in modern JavaScript applications.
