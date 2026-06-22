#!/usr/bin/env python3
"""
Universal Multi-Resolution Context Pipeline — Map Generator

Indexes Python, JavaScript, CSS, HTML/Jinja, and Markdown files into
navigable JSON manifests for AI-native code development.

Usage:
    ctx map
"""
import os
import ast
import json
import re
import sys
import subprocess
import shutil
from importlib import resources

from . import core
from .config import PipelineConfig, load_config

TARGET_DIRS = ["app", "scripts", "tests"]
ROOT_FILES = ["config.py", "run.py", "wsgi.py", "requirements.txt"]
OUTPUT_DIR = ".ai_map"
MANIFESTS_DIR = os.path.join(OUTPUT_DIR, "manifests")
MAPS_DIR = os.path.join(OUTPUT_DIR, "maps")

# Directories to always skip (relative basenames)
EXCLUDED_DIRS = {"__pycache__", "vendor", "node_modules", ".ai_map", ".git", "scratch", "prototypes"}

# File extensions we index, mapped to analyzer type
INDEXED_EXTENSIONS = {".py", ".js", ".css", ".html", ".md"}

# Human-readable descriptions for each directory — used in project_skeleton.json.
# Update these when adding new top-level directories.
DIRECTORY_DESCRIPTIONS = {
    ".": "Project root configuration and entry points",
    "scripts": "Developer tools and workflow scripts (surgical read, map generator, search helpers)",
    "tests": "Durable automated test files and pytest configurations",
    "app": "Flask app root — factory (__init__.py), auth guards, Supabase client, shared decorators",
    "app/agents": "AI agent implementations: code execution, HTML prototyping, GSAP animations, P5.js simulations, hydration, semantic search (9 files)",
    "app/components": "Reusable server-side Python component base classes (2 files)",
    "app/models": "SQLAlchemy ORM models: User, Chat, Memory, Billing, Quiz, Registry, Organization, Audit, Usage (13 files)",
    "app/prompts": "LLM system prompts and skill definitions in Markdown, organized by agents/, profiles/, shells/, skills/ (15 files)",
    "app/prompts/agents": "Per-agent system prompts: GSAP explainer, HTML prototype, P5 simulation",
    "app/prompts/profiles": "Workspace profile prompts: course lesson, outline, editorial, general",
    "app/prompts/shells": "Shell-specific prompts: course lab, lab",
    "app/prompts/skills": "Skill prompt files for dataviz, diagrams, geo, math, ML pipeline, molecule, productivity, research, simulation, STEM",
    "app/routes": "Flask Blueprint route handlers for all features: chat, auth, billing, bookmarks, course, dashboard, memory, registry, sections, settings, workbench (12 files)",
    "app/services": "Business-logic service layer: audio processing, audit logging, course progress, file handling, prompt assembly (5 files)",
    "app/static": "Static assets — JavaScript and CSS only (no subdirectories served directly)",
    "app/static/css": "CSS stylesheets: design tokens (tokens.css), component library (components.css), shell themes, sidebar reorder",
    "app/static/css/shells": "Theme-specific CSS overrides: fluid_dark.css, fluid_light.css",
    "app/static/js": "Client-side JavaScript: FluidComponents runtime, dataset loader, diagram/GSAP/math/molecule/P5 renderers, sidebar controls, visual context (11 files)",
    "app/templates": "Jinja2 HTML templates — base shells, pages, HTMX partials, registry dev tools",
    "app/templates/components": "Reusable Jinja2 template components: place cards and map",
    "app/templates/fluid": "Fluid shell templates: course and dashboard shells + section partials",
    "app/templates/labs": "Development/test HTML pages: card tests, math, molecule",
    "app/templates/pages": "Full-page templates served on first load: chat, index, landing, auth pages, billing, dashboard, settings",
    "app/templates/partials": "HTMX partial fragments for all features: chat, sidebar, messages, reasoning, auth, billing, dashboard, settings",
    "app/templates/registry": "Component registry dev tooling templates: sandbox and asset viewer",
    "app/templates/shells": "Application shell templates: public, course lab, deep sea, lab, shell base",
    "app/tools": "ADK Tool definitions registered with AI agents: chat, code execution, deep research, GSAP, HTML prototype, hydration, molecule, P5, places, registry, skill tools (12 files)",
    "app/translations": "i18n translation files (es/LC_MESSAGES) — currently empty placeholder",
    "app/utils": "Shared utilities: agent output logger, context serializer, GSAP/P5 artifact helpers, HTML stream parser, memory helpers, pipeline logger, sanitizer (10 files)",
}

JS_WARNING_EMITTED = False


def apply_config(config: PipelineConfig) -> None:
    global TARGET_DIRS, ROOT_FILES, OUTPUT_DIR, MANIFESTS_DIR, MAPS_DIR, EXCLUDED_DIRS, DIRECTORY_DESCRIPTIONS
    TARGET_DIRS = list(config.target_dirs)
    ROOT_FILES = list(config.root_files)
    OUTPUT_DIR = config.output_dir
    MANIFESTS_DIR = os.path.join(OUTPUT_DIR, "manifests")
    MAPS_DIR = os.path.join(OUTPUT_DIR, "maps")
    EXCLUDED_DIRS = set(config.excluded_dirs)
    DIRECTORY_DESCRIPTIONS = dict(config.descriptions)
    core.configure(str(config.root), config.protected_roots, config.output_dir)


def configure_from_project(root: str | None = None, config_path: str | None = None) -> PipelineConfig:
    config = load_config(root, config_path)
    apply_config(config)
    return config


def _node_env() -> dict:
    env = os.environ.copy()
    node_paths = []
    if os.environ.get("CTXPIPE_NODE_PATH"):
        node_paths.append(os.environ["CTXPIPE_NODE_PATH"])
    project_node_modules = os.path.join(core.repo_root(), "node_modules")
    if os.path.isdir(project_node_modules):
        node_paths.append(project_node_modules)
    if node_paths:
        existing = env.get("NODE_PATH")
        env["NODE_PATH"] = os.pathsep.join(node_paths + ([existing] if existing else []))
    return env


def js_analyzer_status() -> tuple[bool, str]:
    if not shutil.which("node"):
        return False, "Node is unavailable"
    try:
        result = subprocess.run(
            ["node", "-e", "require('@babel/parser'); require('@babel/traverse');"],
            capture_output=True,
            text=True,
            check=False,
            env=_node_env(),
        )
    except OSError as exc:
        return False, str(exc)
    if result.returncode != 0:
        return False, "missing @babel/parser or @babel/traverse"
    return True, "available"


def _dir_to_map_key(rel_dir):
    """Convert a directory relative path to a map file key.

    Maps the directory to the top-level app/ subdirectory it belongs to,
    so all files under app/routes/* share the key 'app-routes'.

    Special case: files directly in 'app' get key 'app'.
    """
    if rel_dir == ".":
        return "root"
    parts = rel_dir.replace("\\", "/").split("/")
    if len(parts) == 1:
        return parts[0]
    # Group everything under app/<subdir>/... into 'app-<subdir>' or 'tests-<subdir>'
    return f"{parts[0]}-{parts[1]}"


# ---------------------------------------------------------------------------
# Helper: Python AST argument signature reconstruction
# ---------------------------------------------------------------------------
def get_args_string(node):
    """Helper to reconstruct argument signature for functions/methods."""
    try:
        # If ast.unparse is available (Python 3.9+), use it!
        return ast.unparse(node.args)
    except Exception:
        # Fallback manual reconstruction
        parts = []
        # Positional-only args (Python 3.8+)
        posonlyargs = getattr(node.args, "posonlyargs", [])
        for arg in posonlyargs:
            parts.append(arg.arg)
        if posonlyargs:
            parts.append("/")
        
        # Standard args
        for arg in node.args.args:
            parts.append(arg.arg)
            
        # *args
        if node.args.vararg:
            parts.append(f"*{node.args.vararg.arg}")
            
        # Keyword-only args
        kwonlyargs = getattr(node.args, "kwonlyargs", [])
        for arg in kwonlyargs:
            parts.append(arg.arg)
            
        # **kwargs
        if node.args.kwarg:
            parts.append(f"**{node.args.kwarg.arg}")
            
        return ", ".join(parts)


# ===================================================================
# ANALYZER 1: Python (AST-based)
# ===================================================================
class PythonAnalyzer:
    """Uses Python's ast module for precise structural indexing."""

    def __init__(self, file_path):
        self.file_path = file_path
        self.imports = []
        self.classes = []
        self.functions = []
        self.docstring = ""
        
    def analyze(self):
        if not os.path.exists(self.file_path):
            return False
            
        with open(self.file_path, "r", encoding="utf-8") as f:
            source = f.read()
            
        try:
            tree = ast.parse(source, filename=self.file_path)
        except SyntaxError as e:
            print(f"Skipping {self.file_path} due to syntax error: {e}", file=sys.stderr)
            return False
            
        self.docstring = ast.get_docstring(tree) or ""
        
        for node in tree.body:
            # 1. Extract Imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    self.imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                # Handle relative imports (dots)
                dots = "." * (node.level or 0)
                full_module = f"{dots}{module}"
                for alias in node.names:
                    if alias.name == "*":
                        self.imports.append(f"from {full_module} import *")
                    else:
                        self.imports.append(f"{full_module}.{alias.name}")
                        
            # 2. Extract Top-level Functions (now with line numbers)
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                is_async = isinstance(node, ast.AsyncFunctionDef)
                args_str = get_args_string(node)
                self.functions.append({
                    "name": node.name,
                    "type": "async_function" if is_async else "function",
                    "signature": f"async def {node.name}({args_str})" if is_async else f"def {node.name}({args_str})",
                    "docstring": ast.get_docstring(node) or "",
                    "start_line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno)
                })
                
            # 3. Extract Classes (now with line numbers)
            elif isinstance(node, ast.ClassDef):
                class_doc = ast.get_docstring(node) or ""
                bases = []
                for base in node.bases:
                    try:
                        bases.append(ast.unparse(base))
                    except Exception:
                        if isinstance(base, ast.Name):
                            bases.append(base.id)
                        elif isinstance(base, ast.Attribute):
                            bases.append(f"{base.value.id}.{base.attr}")
                
                methods = []
                for child in node.body:
                    if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        is_async = isinstance(child, ast.AsyncFunctionDef)
                        args_str = get_args_string(child)
                        methods.append({
                            "name": child.name,
                            "type": "async_method" if is_async else "method",
                            "signature": f"async def {child.name}({args_str})" if is_async else f"def {child.name}({args_str})",
                            "docstring": ast.get_docstring(child) or "",
                            "start_line": child.lineno,
                            "end_line": getattr(child, "end_lineno", child.lineno)
                        })
                        
                self.classes.append({
                    "name": node.name,
                    "bases": bases,
                    "docstring": class_doc,
                    "start_line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                    "methods": methods
                })
        return True

    def to_manifest(self, rel_path):
        return {
            "file_path": rel_path,
            "language": "python",
            "docstring": self.docstring,
            "classes": self.classes,
            "functions": self.functions
        }

    def to_project_entry(self):
        return {
            "imports": self.imports,
            "exports": {
                "classes": [c["name"] for c in self.classes],
                "functions": [f["name"] for f in self.functions]
            }
        }


# ===================================================================
# ANALYZER 2: JavaScript (regex-based)
# ===================================================================
class JSAnalyzer:
    """Regex-based parser for JavaScript files.
    
    Extracts:
    - Top-level objects: window.X = { ... }, if (!window.X) { window.X = { ... } }
    - Methods inside objects: methodName(args) {
    - Standalone function declarations
    - const/let/var name = function patterns
    """

    def __init__(self, file_path):
        self.file_path = file_path
        self.objects = []      # Top-level window.X assignments
        self.functions = []    # Standalone functions
        self.docstring = ""
    """AST-based parser for JavaScript files utilizing Babel."""

    def __init__(self, file_path):
        self.file_path = file_path
        self.objects = []
        self.functions = []
        self.classes = []
        self.imports = []
        self.exports = []
        self.docstring = ""

    def analyze(self):
        if not os.path.exists(self.file_path):
            return False

        # Extract file docstring (quick manual pass for the first block comment)
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                if lines and lines[0].strip().startswith("/**"):
                    doc_lines = []
                    for line in lines:
                        doc_lines.append(line.strip())
                        if "*/" in line:
                            break
                    self.docstring = "\n".join(doc_lines)
        except Exception:
            pass

        try:
            global JS_WARNING_EMITTED
            available, reason = js_analyzer_status()
            if not available:
                if not JS_WARNING_EMITTED:
                    print(f"{reason}; skipping JavaScript AST mapping.", file=sys.stderr)
                    JS_WARNING_EMITTED = True
                return True
            with resources.as_file(resources.files("context_pipeline.resources").joinpath("ast_mapper.js")) as mapper_script:
                result = subprocess.run(
                    ["node", str(mapper_script), self.file_path],
                    capture_output=True, text=True, check=True, env=_node_env()
                )
            data = json.loads(result.stdout)
            
            if "error" in data:
                print(f"Babel parse error in {self.file_path}: {data['error']}", file=sys.stderr)
                # Keep returning True so we don't break the whole map generation, just empty context
                return True

            self.imports = data.get("imports", [])
            self.exports = data.get("exports", [])
            self.functions = data.get("functions", [])
            self.objects = data.get("objects", [])
            self.classes = data.get("classes", [])
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"Error running ast_mapper.js on {self.file_path}: {e.stderr}", file=sys.stderr)
            return True
        except Exception as e:
            print(f"Failed to parse Babel AST output for {self.file_path}: {e}", file=sys.stderr)
            return True

    def to_manifest(self, rel_path):
        return {
            "file_path": rel_path,
            "language": "javascript",
            "docstring": self.docstring,
            "imports": self.imports,
            "exports": self.exports,
            "objects": self.objects,
            "functions": self.functions,
            "classes": self.classes
        }

    def to_project_entry(self):
        symbols = []
        for obj in self.objects:
            symbols.append(obj["name"])
            for m in obj.get("methods", []):
                symbols.append(f"{obj['name']}.{m['name']}")
        for func in self.functions:
            symbols.append(func["name"])
        for cls in self.classes:
            symbols.append(cls["name"])
        return {
            "imports": [imp.get("source") for imp in self.imports],
            "exports": {
                "symbols": symbols,
                "exported": [exp.get("name") for exp in self.exports]
            }
        }


# ===================================================================
# ANALYZER 3: CSS (regex-based)
# ===================================================================
class CSSAnalyzer:
    """Regex-based parser for CSS files.
    
    Extracts:
    - Section comment headers (/* === NAME === */)
    - Top-level selectors/rulesets with line ranges
    - @keyframes, @media blocks
    """

    def __init__(self, file_path):
        self.file_path = file_path
        self.sections = []
        self.docstring = ""

    def analyze(self):
        if not os.path.exists(self.file_path):
            return False

        with open(self.file_path, "r", encoding="utf-8") as f:
            self.lines = f.readlines()

        if not self.lines:
            return True

        self._extract_file_docstring()
        self._extract_sections()
        return True

    def _extract_file_docstring(self):
        """Extract leading block comment as file docstring."""
        if self.lines and self.lines[0].strip().startswith("/**"):
            doc_lines = []
            for line in self.lines:
                doc_lines.append(line.strip())
                if "*/" in line and len(doc_lines) > 1:
                    break
            self.docstring = "\n".join(doc_lines)

    def _extract_sections(self):
        """Parse CSS into sections delimited by comment headers."""
        section_header = re.compile(r'^/\*\s*=+\s*(.*?)\s*=*\s*\*/')
        # Matches selectors at column 0: .class, :root, [attr], @keyframes, @media, element
        selector_pattern = re.compile(r'^([.:#@\[\w][^{]*)\{')

        current_section = {"name": "(top)", "start_line": 1, "selectors": []}
        
        i = 0
        while i < len(self.lines):
            line = self.lines[i].rstrip()

            # Check for section header comment
            m = section_header.match(line)
            if m:
                # Close previous section
                if current_section["selectors"]:
                    current_section["end_line"] = i  # line before this header (1-indexed)
                    self.sections.append(current_section)
                current_section = {
                    "name": m.group(1).strip(),
                    "start_line": i + 1,
                    "selectors": []
                }
                i += 1
                continue

            # Check for selector
            m = selector_pattern.match(line)
            if m:
                selector_text = m.group(1).strip()
                # Handle multi-line selectors (selector,\n selector {)
                sel_start = i
                while "{" not in self.lines[i]:
                    i += 1
                    if i >= len(self.lines):
                        break
                    selector_text += " " + self.lines[i].strip().rstrip("{").strip()
                
                start_line = sel_start + 1  # 1-indexed
                end_line = self._find_closing_brace(i)
                
                current_section["selectors"].append({
                    "selector": selector_text.strip().rstrip(","),
                    "start_line": start_line,
                    "end_line": end_line
                })
                i = end_line  # Jump past this block (0-indexed = end_line - 1, next iter adds 1)
                continue

            i += 1

        # Close last section
        if current_section["selectors"]:
            current_section["end_line"] = len(self.lines)
            self.sections.append(current_section)

    def _find_closing_brace(self, start_idx):
        """Count brace depth from start_idx to find matching close. Returns 1-indexed."""
        depth = 0
        found_open = False
        for i in range(start_idx, len(self.lines)):
            for ch in self.lines[i]:
                if ch == "{":
                    depth += 1
                    found_open = True
                elif ch == "}":
                    depth -= 1
                    if found_open and depth <= 0:
                        return i + 1
        return len(self.lines)

    def to_manifest(self, rel_path):
        return {
            "file_path": rel_path,
            "language": "css",
            "docstring": self.docstring,
            "sections": self.sections
        }

    def to_project_entry(self):
        all_selectors = []
        for section in self.sections:
            for sel in section.get("selectors", []):
                all_selectors.append(sel["selector"])
        return {"exports": {"selectors": all_selectors[:30]}}  # Cap for project_map readability


# ===================================================================
# ANALYZER 4: HTML/Jinja Templates
# ===================================================================
class TemplateAnalyzer:
    """Parser for HTML/Jinja template files.

    Extracts:
    - <script> block boundaries
    - Alpine.data() component registrations
    - Alpine properties nested inside script tags
    - Alpine methods nested inside script tags
    - Major HTML landmarks and DOM bindings (id, x-ref, x-show, x-model, x-data)
    - Jinja {% block %} / {% macro %} tags
    """

    def __init__(self, file_path):
        self.file_path = file_path
        self.script_blocks = []
        self.alpine_components = []
        self.alpine_properties = []
        self.alpine_methods = []
        self.dom_bindings = []
        self.landmarks = []
        self.jinja_blocks = []

    def analyze(self):
        if not os.path.exists(self.file_path):
            return False

        with open(self.file_path, "r", encoding="utf-8") as f:
            self.lines = f.readlines()

        if not self.lines:
            return True

        self._extract_script_blocks()
        self._extract_alpine_components()
        self._extract_alpine_properties_methods()
        self._extract_dom_bindings()
        self._extract_landmarks()
        self._extract_jinja_blocks()
        return True

    def _extract_script_blocks(self):
        """Find <script> ... </script> boundaries."""
        script_open = re.compile(r'<script[^>]*>', re.IGNORECASE)
        script_close = re.compile(r'</script>', re.IGNORECASE)

        i = 0
        while i < len(self.lines):
            if script_open.search(self.lines[i]):
                start = i + 1  # 1-indexed
                # Check if it's an external script (src=)
                if 'src=' in self.lines[i]:
                    i += 1
                    continue
                # Find closing </script>
                for j in range(i + 1, len(self.lines)):
                    if script_close.search(self.lines[j]):
                        end = j + 1  # 1-indexed
                        # Determine a label from content
                        label = self._label_script_block(i, j)
                        self.script_blocks.append({
                            "label": label,
                            "start_line": start,
                            "end_line": end
                        })
                        i = j
                        break
            i += 1

    def _label_script_block(self, start_idx, end_idx):
        """Try to give a descriptive label to a script block based on content."""
        content = "".join(self.lines[start_idx:end_idx + 1])
        
        if "Alpine.data(" in content:
            # Extract the component name
            m = re.search(r"Alpine\.data\(['\"](\w+)['\"]", content)
            if m:
                return f"Alpine.data('{m.group(1)}')"
            return "Alpine.data registration"
        if "alpine:init" in content:
            return "Alpine initialization"
        if "htmx:configRequest" in content or "csrf" in content.lower():
            return "HTMX/CSRF configuration"
        if "addEventListener" in content:
            return "Event listeners"
        if "FluidRuns" in content or "FluidTabs" in content:
            return "Fluid runtime"
        if "document.write" in content:
            return "Dynamic asset loading"
        if "localStorage" in content and len(content) < 500:
            return "Theme initialization"
        return "Inline script"

    def _extract_alpine_components(self):
        """Find Alpine.data('componentName', ...) registrations."""
        pattern = re.compile(r"Alpine\.data\(\s*['\"](\w+)['\"]")
        for i, line in enumerate(self.lines):
            m = pattern.search(line)
            if m:
                name = m.group(1)
                start_line = i + 1
                # Find the end by brace counting from this line
                end_line = self._find_closing_paren_brace(i)
                self.alpine_components.append({
                    "name": name,
                    "start_line": start_line,
                    "end_line": end_line
                })

    def _extract_alpine_properties_methods(self):
        """Extract Alpine properties and methods nested inside script tags."""
        prop_pat = re.compile(r'^\s*(\w+)\s*:\s*')
        method_pat = re.compile(r'^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{')
        script_open = re.compile(r'<script[^>]*>', re.IGNORECASE)
        script_close = re.compile(r'</script>', re.IGNORECASE)

        in_script = False
        for i, line in enumerate(self.lines):
            if script_open.search(line) and 'src=' not in line:
                in_script = True
            if script_close.search(line):
                in_script = False

            if in_script:
                m_prop = prop_pat.search(line)
                if m_prop:
                    name = m_prop.group(1)
                    if name not in ("const", "let", "var", "return", "if", "for", "while", "switch", "case"):
                        start_line = i + 1
                        end_line = min(len(self.lines), start_line + 9)
                        self.alpine_properties.append({
                            "name": name,
                            "start_line": start_line,
                            "end_line": end_line
                        })
                else:
                    m_meth = method_pat.search(line)
                    if m_meth:
                        name = m_meth.group(1)
                        if name not in ("if", "for", "while", "switch", "catch"):
                            start_line = i + 1
                            end_line = self._find_closing_brace(i)
                            self.alpine_methods.append({
                                "name": name,
                                "start_line": start_line,
                                "end_line": end_line
                            })

    def _extract_dom_bindings(self):
        """Extract id, x-ref, x-show, x-model, x-data bindings."""
        id_pat = re.compile(r'id\s*=\s*["\']([^"\']+)["\']')
        attr_pat = re.compile(r'(x-ref|x-show|x-model|x-data)\s*=\s*["\']([^"\']+)["\']')

        for i, line in enumerate(self.lines):
            # Find all ids
            for m_id in id_pat.finditer(line):
                name = m_id.group(1)
                self.dom_bindings.append({
                    "name": name,
                    "type": "id",
                    "start_line": i + 1,
                    "end_line": i + 1
                })

            # Find all attributes
            for m_attr in attr_pat.finditer(line):
                attr_type = m_attr.group(1)
                name = m_attr.group(2)
                start_line = max(1, i + 1 - 4)
                end_line = min(len(self.lines), i + 1 + 10)
                self.dom_bindings.append({
                    "name": name,
                    "type": attr_type,
                    "start_line": start_line,
                    "end_line": end_line
                })

    def _extract_landmarks(self):
        """Extract elements with id attributes as navigational landmarks."""
        id_pattern = re.compile(r'id\s*=\s*["\']([^"\']+)["\']')
        for i, line in enumerate(self.lines):
            m = id_pattern.search(line)
            if m:
                self.landmarks.append({
                    "id": m.group(1),
                    "line": i + 1
                })

    def _extract_jinja_blocks(self):
        """Extract {% block name %} and {% macro name(...) %} tags."""
        block_pattern = re.compile(r'\{%-?\s*block\s+(\w+)')
        macro_pattern = re.compile(r'\{%-?\s*macro\s+(\w+)\s*\(([^)]*)\)')
        endblock_pattern = re.compile(r'\{%-?\s*endblock')
        endmacro_pattern = re.compile(r'\{%-?\s*endmacro')

        # Stack-based matching for blocks
        block_stack = []
        for i, line in enumerate(self.lines):
            m = block_pattern.search(line)
            if m:
                block_stack.append({"name": m.group(1), "type": "block", "start_line": i + 1})
            
            m = macro_pattern.search(line)
            if m:
                block_stack.append({
                    "name": m.group(1),
                    "type": "macro",
                    "args": m.group(2).strip(),
                    "start_line": i + 1
                })

            if endblock_pattern.search(line) or endmacro_pattern.search(line):
                if block_stack:
                    entry = block_stack.pop()
                    entry["end_line"] = i + 1
                    self.jinja_blocks.append(entry)

        # Any unclosed blocks
        for entry in block_stack:
            entry["end_line"] = len(self.lines)
            self.jinja_blocks.append(entry)

    def _find_closing_paren_brace(self, start_idx):
        """Count combined paren+brace depth to find the end of an Alpine.data() registration, ignoring Jinja constructs."""
        depth_paren = 0
        depth_brace = 0
        found_open = False
        in_jinja_block = False
        in_jinja_expr = False
        in_jinja_comment = False

        for i in range(start_idx, len(self.lines)):
            line = self.lines[i]
            j = 0
            n = len(line)
            while j < n:
                if in_jinja_block:
                    if j + 1 < n and line[j] == '%' and line[j+1] == '}':
                        in_jinja_block = False
                        j += 2
                        continue
                    j += 1
                    continue
                elif in_jinja_expr:
                    if j + 1 < n and line[j] == '}' and line[j+1] == '}':
                        in_jinja_expr = False
                        j += 2
                        continue
                    j += 1
                    continue
                elif in_jinja_comment:
                    if j + 1 < n and line[j] == '#' and line[j+1] == '}':
                        in_jinja_comment = False
                        j += 2
                        continue
                    j += 1
                    continue

                if j + 1 < n and line[j] == '{' and line[j+1] == '%':
                    in_jinja_block = True
                    j += 2
                    continue
                elif j + 1 < n and line[j] == '{' and line[j+1] == '{':
                    in_jinja_expr = True
                    j += 2
                    continue
                elif j + 1 < n and line[j] == '{' and line[j+1] == '#':
                    in_jinja_comment = True
                    j += 2
                    continue

                ch = line[j]
                if ch == "(":
                    depth_paren += 1
                    found_open = True
                elif ch == ")":
                    depth_paren -= 1
                elif ch == "{":
                    depth_brace += 1
                    found_open = True
                elif ch == "}":
                    depth_brace -= 1

                if found_open and depth_paren <= 0 and depth_brace <= 0:
                    return i + 1
                j += 1
        return len(self.lines)

    def _find_closing_brace(self, start_idx):
        """Count brace depth from start_idx to find matching close, ignoring Jinja constructs. Returns 1-indexed."""
        depth = 0
        found_open = False
        in_jinja_block = False
        in_jinja_expr = False
        in_jinja_comment = False

        for i in range(start_idx, len(self.lines)):
            line = self.lines[i]
            j = 0
            n = len(line)
            while j < n:
                if in_jinja_block:
                    if j + 1 < n and line[j] == '%' and line[j+1] == '}':
                        in_jinja_block = False
                        j += 2
                        continue
                    j += 1
                    continue
                elif in_jinja_expr:
                    if j + 1 < n and line[j] == '}' and line[j+1] == '}':
                        in_jinja_expr = False
                        j += 2
                        continue
                    j += 1
                    continue
                elif in_jinja_comment:
                    if j + 1 < n and line[j] == '#' and line[j+1] == '}':
                        in_jinja_comment = False
                        j += 2
                        continue
                    j += 1
                    continue

                if j + 1 < n and line[j] == '{' and line[j+1] == '%':
                    in_jinja_block = True
                    j += 2
                    continue
                elif j + 1 < n and line[j] == '{' and line[j+1] == '{':
                    in_jinja_expr = True
                    j += 2
                    continue
                elif j + 1 < n and line[j] == '{' and line[j+1] == '#':
                    in_jinja_comment = True
                    j += 2
                    continue

                ch = line[j]
                if ch == "{":
                    depth += 1
                    found_open = True
                elif ch == "}":
                    depth -= 1
                    if found_open and depth <= 0:
                        return i + 1
                j += 1
        return len(self.lines)

    def to_manifest(self, rel_path):
        return {
            "file_path": rel_path,
            "language": "html",
            "script_blocks": self.script_blocks,
            "alpine_components": self.alpine_components,
            "alpine_properties": self.alpine_properties,
            "alpine_methods": self.alpine_methods,
            "dom_bindings": self.dom_bindings,
            "landmarks": self.landmarks,
            "jinja_blocks": self.jinja_blocks
        }

    def to_project_entry(self):
        symbols = []
        for comp in self.alpine_components:
            symbols.append(f"Alpine:{comp['name']}")
        for prop in self.alpine_properties:
            symbols.append(f"AlpineProp:{prop['name']}")
        for meth in self.alpine_methods:
            symbols.append(f"AlpineMethod:{meth['name']}")
        for db in self.dom_bindings:
            symbols.append(f"DOMBinding:{db['name']}")
        for block in self.jinja_blocks:
            symbols.append(f"{block['type']}:{block['name']}")
        return {"exports": {"symbols": symbols}}


# ===================================================================
# ANALYZER 5: Markdown (prompt files)
class MarkdownAnalyzer:
    """Parser for Markdown files (primarily prompt/skill files).
    
    Extracts:
    - Heading hierarchy with line numbers
    - Fenced code blocks with language and line ranges
    """

    def __init__(self, file_path):
        self.file_path = file_path
        self.headings = []
        self.code_blocks = []

    def analyze(self):
        if not os.path.exists(self.file_path):
            return False

        with open(self.file_path, "r", encoding="utf-8") as f:
            self.lines = f.readlines()

        if not self.lines:
            return True

        self._extract_headings()
        self._extract_code_blocks()
        return True

    def _extract_headings(self):
        """Extract markdown headings with their levels and line numbers."""
        heading_pattern = re.compile(r'^(#{1,6})\s+(.+)')
        in_code_block = False
        
        for i, line in enumerate(self.lines):
            stripped = line.strip()
            if stripped.startswith("```"):
                in_code_block = not in_code_block
                continue
            if in_code_block:
                continue
                
            m = heading_pattern.match(stripped)
            if m:
                level = len(m.group(1))
                text = m.group(2).strip()
                self.headings.append({
                    "level": level,
                    "text": text,
                    "start_line": i + 1
                })

    def _extract_code_blocks(self):
        """Extract fenced code blocks with language and line ranges."""
        fence_open = re.compile(r'^```(\w*)')
        fence_close = re.compile(r'^```\s*$')
        
        i = 0
        while i < len(self.lines):
            m = fence_open.match(self.lines[i].strip())
            if m and m.group(0) != "```" or (m and i == 0) or (m and m.group(1)):
                language = m.group(1) or "text"
                start = i + 1  # 1-indexed
                # Find closing fence
                for j in range(i + 1, len(self.lines)):
                    if fence_close.match(self.lines[j].strip()):
                        self.code_blocks.append({
                            "language": language,
                            "start_line": start,
                            "end_line": j + 1
                        })
                        i = j
                        break
            i += 1

    def to_manifest(self, rel_path):
        return {
            "file_path": rel_path,
            "language": "markdown",
            "headings": self.headings,
            "code_blocks": self.code_blocks
        }

    def to_project_entry(self):
        top_headings = [h["text"] for h in self.headings if h["level"] <= 2]
        return {"exports": {"headings": top_headings}}


# ===================================================================
# MAIN GENERATOR
# ===================================================================
def should_index_md(rel_path):
    """Only index .md files under app/prompts/."""
    return rel_path.replace("\\", "/").startswith("app/prompts/")


def get_analyzer(file_path, rel_path):
    """Return the appropriate analyzer for a file based on its extension."""
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".py":
        return PythonAnalyzer(file_path)
    elif ext == ".js":
        return JSAnalyzer(file_path)
    elif ext == ".css":
        return CSSAnalyzer(file_path)
    elif ext == ".html":
        return TemplateAnalyzer(file_path)
    elif ext == ".md" and should_index_md(rel_path):
        return MarkdownAnalyzer(file_path)
    
    return None


def _merge_existing_docstrings(new_manifest, existing_manifest_path):
    """Merge docstrings from an existing manifest into a freshly generated one.

    Matches symbols by 'name' field so line-number drift is irrelevant.
    Only back-fills docstrings that are empty in the new manifest but
    non-empty in the old one — never overwrites a fresh AST-extracted docstring.
    """
    if not os.path.isfile(existing_manifest_path):
        return new_manifest

    try:
        with open(existing_manifest_path, "r", encoding="utf-8") as f:
            old = json.load(f)
    except (json.JSONDecodeError, OSError):
        return new_manifest

    # Build lookup: name -> docstring  (for top-level symbols)
    old_docs = {}
    for key in ("functions", "classes", "objects"):
        for item in old.get(key, []):
            if item.get("docstring"):
                old_docs[item["name"]] = item["docstring"]
            # Also index methods inside classes/objects
            for method in item.get("methods", []):
                if method.get("docstring"):
                    compound_key = f"{item['name']}.{method['name']}"
                    old_docs[compound_key] = method["docstring"]

    # Merge into new manifest
    for key in ("functions", "classes", "objects"):
        for item in new_manifest.get(key, []):
            if not item.get("docstring") and item["name"] in old_docs:
                item["docstring"] = old_docs[item["name"]]
            # Merge methods
            for method in item.get("methods", []):
                compound_key = f"{item['name']}.{method['name']}"
                if not method.get("docstring") and compound_key in old_docs:
                    method["docstring"] = old_docs[compound_key]

    # File-level docstring
    if not new_manifest.get("docstring") and old.get("docstring"):
        new_manifest["docstring"] = old["docstring"]

    return new_manifest


def _normalized_output_path(path):
    return os.path.normcase(os.path.normpath(path))


def _remove_empty_dirs(root_dir):
    if not os.path.isdir(root_dir):
        return
    for root, dirs, files in os.walk(root_dir, topdown=False):
        if root == root_dir:
            continue
        if not dirs and not files:
            try:
                os.rmdir(root)
            except OSError:
                pass


def _prune_stale_manifests(current_manifest_paths):
    if not os.path.isdir(MANIFESTS_DIR):
        return 0

    current = {_normalized_output_path(path) for path in current_manifest_paths}
    pruned = 0
    for root, _, files in os.walk(MANIFESTS_DIR):
        for file in files:
            if not file.endswith(".json"):
                continue
            manifest_path = os.path.join(root, file)
            normalized = _normalized_output_path(manifest_path)
            stale = normalized not in current
            if not stale:
                try:
                    with open(manifest_path, "r", encoding="utf-8") as f:
                        manifest = json.load(f)
                    source_file = manifest.get("file_path")
                except Exception:
                    source_file = None
                if source_file and not os.path.exists(source_file):
                    stale = True
            if stale:
                try:
                    os.remove(manifest_path)
                    pruned += 1
                except OSError:
                    pass

    _remove_empty_dirs(MANIFESTS_DIR)
    return pruned


def _prune_stale_maps(current_map_paths):
    if not os.path.isdir(MAPS_DIR):
        return 0

    current = {_normalized_output_path(path) for path in current_map_paths}
    pruned = 0
    for file in os.listdir(MAPS_DIR):
        if not file.endswith("_map.json"):
            continue
        map_path = os.path.join(MAPS_DIR, file)
        if _normalized_output_path(map_path) in current:
            continue
        try:
            os.remove(map_path)
            pruned += 1
        except OSError:
            pass
    return pruned


def _update_agents_md(skeleton_dirs):
    """Updates the Directory Map section in AGENTS.md if it exists."""
    if not os.path.exists("AGENTS.md"):
        return

    lines = []
    for path, info in sorted(skeleton_dirs.items()):
        if path == ".":
            lines.append(f"- `.` — {info['description']}")
        else:
            indent = "  " * path.count("/")
            lines.append(f"{indent}- `{path}/` — {info['description']}")
            
    map_text = "\n".join(lines)
    
    try:
        with open("AGENTS.md", "r", encoding="utf-8") as f:
            content = f.read()
            
        marker_start = "## Directory Map"
        marker_end = "*Auto-generated by `ctx map`.*"
        
        idx_start = content.find(marker_start)
        idx_end = content.find(marker_end)
        
        if idx_start != -1 and idx_end != -1:
            new_content = (
                content[:idx_start + len(marker_start)] + 
                "\n\n" + map_text + "\n\n" + 
                content[idx_end:]
            )
            with open("AGENTS.md", "w", encoding="utf-8") as f:
                f.write(new_content)
    except Exception as e:
        print(f"  Warning: failed to update AGENTS.md map: {e}")


def generate_maps():
    print("Initializing Universal Multi-Resolution Context Pipeline maps (3-layer)...")

    # Create output directories
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(MANIFESTS_DIR, exist_ok=True)
    os.makedirs(MAPS_DIR, exist_ok=True)

    # ------------------------------------------------------------------
    # Data structures we build during the walk
    # ------------------------------------------------------------------
    # skeleton_dirs: dir_key -> {description, subdirectories, files, map_file}
    skeleton_dirs = {}

    # dir_maps: map_key -> {directory, description, files: {path -> project_entry}}
    dir_maps = {}

    current_manifest_paths = set()

    stats = {"py": 0, "js": 0, "css": 0, "html": 0, "md": 0}

    # ------------------------------------------------------------------
    # Walk the source tree for each target directory
    # ------------------------------------------------------------------
    for target_dir in TARGET_DIRS:
        if not os.path.exists(target_dir):
            continue
        for root, dirs, files in os.walk(target_dir):
            # Skip excluded directories in-place so os.walk doesn't recurse into them
            dirs[:] = sorted(d for d in dirs if d not in EXCLUDED_DIRS)

            relative_root = os.path.relpath(root, ".").replace("\\", "/")
            indexable = [f for f in files if os.path.splitext(f)[1].lower() in INDEXED_EXTENSIONS]

            # --- Skeleton entry for this directory ---
            map_key = _dir_to_map_key(relative_root)
            map_file_ref = f".ai_map/maps/{map_key}_map.json"
            description = DIRECTORY_DESCRIPTIONS.get(relative_root, f"{relative_root} directory")
            skeleton_dirs[relative_root] = {
                "description": description,
                "subdirectories": list(dirs),
                "files": indexable,
                "map_file": map_file_ref,
            }

            # --- Ensure this map key exists in dir_maps ---
            if map_key not in dir_maps:
                if map_key == "root":
                    covered = "."
                elif "-" in map_key:
                    prefix, suffix = map_key.split("-", 1)
                    covered = f"{prefix}/{suffix}"
                else:
                    covered = map_key
                dir_maps[map_key] = {
                    "directory": covered,
                    "description": DIRECTORY_DESCRIPTIONS.get(covered, f"{covered} directory"),
                    "files": {},
                }

            # --- Analyze each file ---
            for file in files:
                file_path = os.path.join(root, file)
                rel_file_path = os.path.relpath(file_path, ".").replace("\\", "/")

                analyzer = get_analyzer(file_path, rel_file_path)
                if analyzer is None:
                    continue
                if not analyzer.analyze():
                    continue

                ext = os.path.splitext(file)[1].lower()

                # Add import/export summary to the appropriate directory map
                dir_maps[map_key]["files"][rel_file_path] = analyzer.to_project_entry()
                stats[ext.lstrip(".")] += 1

                # Write the individual file manifest
                manifest_data = analyzer.to_manifest(rel_file_path)
                manifest_file_dir = os.path.join(MANIFESTS_DIR, os.path.dirname(rel_file_path))
                os.makedirs(manifest_file_dir, exist_ok=True)
                manifest_file_path = os.path.join(MANIFESTS_DIR, f"{rel_file_path}.json")
                manifest_data = _merge_existing_docstrings(manifest_data, manifest_file_path)
                with open(manifest_file_path, "w", encoding="utf-8") as f:
                    json.dump(manifest_data, f, indent=2, ensure_ascii=False)
                current_manifest_paths.add(manifest_file_path)

    # ------------------------------------------------------------------
    # Process Virtual Root Files
    # ------------------------------------------------------------------
    root_indexable = []
    for file in ROOT_FILES:
        if os.path.exists(file):
            root_indexable.append(file)
            rel_file_path = file

            analyzer = get_analyzer(file, rel_file_path)
            if analyzer is None:
                continue
            if not analyzer.analyze():
                continue

            ext = os.path.splitext(file)[1].lower()

            # Ensure "root" key exists in dir_maps
            if "root" not in dir_maps:
                dir_maps["root"] = {
                    "directory": ".",
                    "description": "Project root configuration and entry points",
                    "files": {},
                }

            dir_maps["root"]["files"][rel_file_path] = analyzer.to_project_entry()
            stats[ext.lstrip(".")] += 1

            # Write the individual file manifest
            manifest_data = analyzer.to_manifest(rel_file_path)
            manifest_file_dir = MANIFESTS_DIR
            os.makedirs(manifest_file_dir, exist_ok=True)
            manifest_file_path = os.path.join(MANIFESTS_DIR, f"{rel_file_path}.json")
            manifest_data = _merge_existing_docstrings(manifest_data, manifest_file_path)
            with open(manifest_file_path, "w", encoding="utf-8") as f:
                json.dump(manifest_data, f, indent=2, ensure_ascii=False)
            current_manifest_paths.add(manifest_file_path)

    if root_indexable:
        skeleton_dirs["."] = {
            "description": "Project root configuration and entry points",
            "subdirectories": [d for d in TARGET_DIRS if os.path.exists(d)],
            "files": root_indexable,
            "map_file": ".ai_map/maps/root_map.json"
        }

    # ------------------------------------------------------------------
    # Write Layer 1: project_skeleton.json
    # ------------------------------------------------------------------
    import datetime
    generated_at = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    skeleton = {
        "project_root": os.path.abspath("."),
        "generated_at": generated_at,
        "nav_hint": (
            "AGENT NAVIGATION — Read this file first (Layer 1). "
            "Then read '.ai_map/maps/<dir>_map.json' for the relevant directory (Layer 2). "
            "Then read '.ai_map/manifests/<path>.json' for a specific file (Layer 3). "
            "Then open only the exact line range in the source file (Layer 4)."
        ),
        "directories": skeleton_dirs,
    }
    skeleton_path = os.path.join(OUTPUT_DIR, "project_skeleton.json")
    with open(skeleton_path, "w", encoding="utf-8") as f:
        json.dump(skeleton, f, indent=2, ensure_ascii=False)

    # Project guidance files are installed by `ctx init`, not by map generation.
    _update_agents_md(skeleton_dirs)



    # ------------------------------------------------------------------
    # Write Layer 2: .ai_map/maps/{key}_map.json  (one per top-level dir)
    # ------------------------------------------------------------------
    map_files_written = []
    for map_key, map_data in sorted(dir_maps.items()):
        if not map_data["files"]:  # Skip empty buckets (e.g. translations)
            continue
        map_data["generated_at"] = generated_at
        map_file_path = os.path.join(MAPS_DIR, f"{map_key}_map.json")
        with open(map_file_path, "w", encoding="utf-8") as f:
            json.dump(map_data, f, indent=2, ensure_ascii=False)
        map_files_written.append(map_file_path)

    pruned_manifests = _prune_stale_manifests(current_manifest_paths)
    pruned_maps = _prune_stale_maps(map_files_written)

    # ------------------------------------------------------------------
    # Remove legacy project_map.json if it still exists
    # ------------------------------------------------------------------
    legacy_map = os.path.join(OUTPUT_DIR, "project_map.json")
    if os.path.exists(legacy_map):
        os.remove(legacy_map)
        print(f"  Removed legacy: {legacy_map}")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    total = sum(stats.values())
    print(f"\nMaps updated successfully! ({generated_at})")
    print(f"  Layer 1 — Skeleton : {skeleton_path}")
    print(f"  Layer 2 — Dir maps : {len(map_files_written)} files in {MAPS_DIR}/")
    for mf in map_files_written:
        print(f"             {mf}")
    print(f"  Layer 3 — Manifests: {len(current_manifest_paths)} current in {MANIFESTS_DIR}/")
    print(f"  Pruned stale manifests: {pruned_manifests}")
    print(f"  Pruned stale maps: {pruned_maps}")
    print(f"  Total files indexed: {total}")
    print(f"    Python: {stats['py']}  JavaScript: {stats['js']}  "
          f"CSS: {stats['css']}  HTML: {stats['html']}  Markdown: {stats['md']}")


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description="Generate Multi-Resolution Context Pipeline maps.")
    parser.add_argument("--root", help="Project root")
    parser.add_argument("--config", help="Path to .ctxpipe.toml")
    parser.add_argument("--check", action="store_true", help="Check map health without regenerating")
    args = parser.parse_args(argv)
    config = configure_from_project(args.root, args.config)
    os.chdir(config.root)
    if args.check:
        from . import health
        health.ROOT = str(config.root)
        return health.main([])
    generate_maps()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
