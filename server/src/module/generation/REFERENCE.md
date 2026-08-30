# Knowledge Base Markdown Format

Files added to the knowledge base (uploaded, or dropped into
`server/src/module/generation/docs/` and indexed) must be **Markdown (`.md` / `.markdown`)**.
PDFs are also supported. This is the recommended structure for Markdown files.

## File naming

The batch indexer derives subject/topic from the filename:

```
<Subject>_<Topic>.md
```

e.g. `JavaScript_Variables.md` → subject `JavaScript`, topic `Variables`.

## Heading structure

| Heading | Meaning |
| --- | --- |
| First `# Heading` | File **title** (not a section) |
| `#` or `##` after the title | **Section** (parent chunk) |
| `###` (or deeper) | **Subsection** (child chunk of the section) |

- A section spans from its heading to the next `#`/`##` heading.
- Subsections (`###`) are grouped under their parent section.
- Body text is split into ~500-token child chunks with ~100-token overlap.

## Example

~~~markdown
# JavaScript Variables

A variable is a named storage location used to hold a value that can change.

## What is a Variable?

While writing code, we often need to store information such as a username,
email, or age. For that we use a variable.

### Example

```javascript
let message = "Hello!";
```

Here:
- `message` is the name of the variable.
- `"Hello!"` is the value stored in the variable.
- `let` is the keyword used to declare the variable.

## Ways to Declare a Variable

There are three keywords used to declare variables in JavaScript:

- `let`
- `const`
- `var`

## Scoping Rules

- `let` and `const` are block scoped.
- `var` is function scoped.
~~~

## Notes

- The first `#` is the document title; it does **not** become its own section.
- A mid-document `#` heading also starts a new section (the title rule applies
  only to the very first heading).
- Content before the first section heading becomes an "Introduction" section.
- Everything from a `## Tasks` heading onward is stripped (treated as solved
  exercises).
- Code blocks, lists, tables and `###` subsections are supported and preserved.