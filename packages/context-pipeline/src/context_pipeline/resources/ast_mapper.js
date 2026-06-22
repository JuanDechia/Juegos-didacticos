const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error(JSON.stringify({ error: "No file path provided" }));
    process.exit(1);
}

const filePath = args[0];

try {
    const code = fs.readFileSync(filePath, 'utf-8');
    
    const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        errorRecovery: true
    });

    const manifest = {
        file_path: filePath,
        language: "javascript",
        imports: [],
        exports: [],
        functions: [],
        objects: [],
        classes: []
    };

    // Helper to extract docstrings
    function getDocstring(node) {
        if (node.leadingComments && node.leadingComments.length > 0) {
            // Get the last comment block before the node
            const comment = node.leadingComments[node.leadingComments.length - 1];
            if (comment.type === 'CommentBlock' && comment.value.startsWith('*')) {
                return comment.value.split('\n')
                    .map(line => line.replace(/^\s*\*\s?/, '').trim())
                    .filter(line => line.length > 0)
                    .join('\n');
            }
        }
        return "";
    }

    traverse(ast, {
        ImportDeclaration(path) {
            manifest.imports.push({
                source: path.node.source.value,
                specifiers: path.node.specifiers.map(s => s.local.name),
                start: path.node.start,
                end: path.node.end,
                start_line: path.node.loc.start.line,
                end_line: path.node.loc.end.line
            });
        },
        ExportNamedDeclaration(path) {
            if (path.node.declaration) {
                let name = "unknown";
                if (path.node.declaration.id) name = path.node.declaration.id.name;
                else if (path.node.declaration.declarations) name = path.node.declaration.declarations[0].id.name;
                
                manifest.exports.push({
                    name: name,
                    type: "named",
                    start: path.node.start,
                    end: path.node.end,
                    start_line: path.node.loc.start.line,
                    end_line: path.node.loc.end.line
                });
            } else if (path.node.specifiers) {
                path.node.specifiers.forEach(spec => {
                    manifest.exports.push({
                        name: spec.exported.name,
                        type: "named",
                        start: path.node.start,
                        end: path.node.end,
                        start_line: path.node.loc.start.line,
                        end_line: path.node.loc.end.line
                    });
                });
            }
        },
        ExportDefaultDeclaration(path) {
            let name = "default";
            if (path.node.declaration && path.node.declaration.id) {
                name = path.node.declaration.id.name;
            }
            manifest.exports.push({
                name: name,
                type: "default",
                start: path.node.start,
                end: path.node.end,
                start_line: path.node.loc.start.line,
                end_line: path.node.loc.end.line
            });
        },
        FunctionDeclaration(path) {
            manifest.functions.push({
                name: path.node.id ? path.node.id.name : "anonymous",
                type: path.node.async ? "async_function" : "function",
                start: path.node.start,
                end: path.node.end,
                start_line: path.node.loc.start.line,
                end_line: path.node.loc.end.line,
                docstring: getDocstring(path.node)
            });
        },
        VariableDeclarator(path) {
            // Catch const fn = () => {} or const fn = function() {}
            if (path.node.init && (path.node.init.type === 'ArrowFunctionExpression' || path.node.init.type === 'FunctionExpression')) {
                // If it's part of an export, the parent export will catch it, but we still want it as a function
                manifest.functions.push({
                    name: path.node.id.name,
                    type: path.node.init.async ? "async_function" : "function",
                    start: path.parent.start, // Use parent to include the 'const' keyword
                    end: path.parent.end,
                    start_line: path.parent.loc.start.line,
                    end_line: path.parent.loc.end.line,
                    docstring: getDocstring(path.parent)
                });
            }
        },
        AssignmentExpression(path) {
            // Catch window.X = { ... } or window.X = function() { ... }
            if (path.node.left.type === 'MemberExpression' && 
                path.node.left.object.name === 'window') {
                
                const objName = path.node.left.property.name;
                
                if (path.node.right.type === 'ObjectExpression') {
                    const methods = [];
                    path.node.right.properties.forEach(prop => {
                        if (prop.type === 'ObjectMethod' || 
                            (prop.type === 'ObjectProperty' && (prop.value.type === 'FunctionExpression' || prop.value.type === 'ArrowFunctionExpression'))) {
                            const methodName = prop.key.name || prop.key.value;
                            methods.push({
                                name: methodName,
                                type: prop.method || prop.value?.type === 'FunctionExpression' ? "method" : "property",
                                start: prop.start,
                                end: prop.end,
                                start_line: prop.loc.start.line,
                                end_line: prop.loc.end.line
                            });
                        }
                    });
                    
                    manifest.objects.push({
                        name: objName,
                        type: "object",
                        start: path.parent.start, // ExpressionStatement
                        end: path.parent.end,
                        start_line: path.parent.loc.start.line,
                        end_line: path.parent.loc.end.line,
                        methods: methods
                    });
                } else if (path.node.right.type === 'FunctionExpression' || path.node.right.type === 'ArrowFunctionExpression') {
                    manifest.functions.push({
                        name: "window." + objName,
                        type: path.node.right.async ? "async_function" : "function",
                        start: path.parent.start,
                        end: path.parent.end,
                        start_line: path.parent.loc.start.line,
                        end_line: path.parent.loc.end.line
                    });
                }
            }
        },
        ClassDeclaration(path) {
            const methods = [];
            if (path.node.body && path.node.body.body) {
                path.node.body.body.forEach(method => {
                    if (method.type === 'ClassMethod' || method.type === 'ClassPrivateMethod') {
                        methods.push({
                            name: method.key.name,
                            type: method.kind === 'constructor' ? 'constructor' : (method.async ? 'async_method' : 'method'),
                            start: method.start,
                            end: method.end,
                            start_line: method.loc.start.line,
                            end_line: method.loc.end.line,
                            docstring: getDocstring(method)
                        });
                    }
                });
            }
            manifest.classes.push({
                name: path.node.id ? path.node.id.name : "anonymous",
                start: path.node.start,
                end: path.node.end,
                start_line: path.node.loc.start.line,
                end_line: path.node.loc.end.line,
                methods: methods,
                docstring: getDocstring(path.node)
            });
        }
    });

    console.log(JSON.stringify(manifest, null, 2));

} catch (err) {
    console.error(JSON.stringify({ error: err.message, stack: err.stack }));
    process.exit(1);
}
