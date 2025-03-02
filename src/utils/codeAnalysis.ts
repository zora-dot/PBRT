import { format } from 'prettier';
import * as prettierPlugins from 'prettier/plugins/babel';

// Language-specific linting rules
const lintingRules = {
  javascript: {
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'no-undef': 'error'
  },
  typescript: {
    'no-explicit-any': 'warn',
    'no-unused-vars': 'warn',
    'no-empty-interface': 'warn'
  },
  python: {
    'no-global-vars': 'warn',
    'no-bare-except': 'warn',
    'f-string-required': 'warn'
  }
};

// Format code using prettier
export const formatCode = async (code: string, language: string) => {
  try {
    const formatted = await format(code, {
      parser: language === 'typescript' ? 'typescript' : 'babel',
      plugins: [prettierPlugins],
      semi: true,
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2,
      trailingComma: 'es5'
    });
    return { formatted, error: null };
  } catch (error) {
    return { 
      formatted: null, 
      error: error instanceof Error ? error.message : 'Formatting failed' 
    };
  }
};

// Basic code analysis
export const analyzeCode = (code: string, language: string) => {
  const analysis = {
    errors: [] as string[],
    warnings: [] as string[],
    suggestions: [] as string[]
  };

  // Common patterns to check
  const patterns = {
    debugStatements: /console\.(log|debug|info|warn|error)|debugger/g,
    todoComments: /\/\/\s*TODO|#\s*TODO/g,
    hardcodedSecrets: /(password|secret|key|token)\s*=\s*['"][^'"]+['"]/gi,
    longLines: /.{100,}/g
  };

  // Check for debug statements
  const debugMatches = code.match(patterns.debugStatements);
  if (debugMatches) {
    analysis.warnings.push(`Found ${debugMatches.length} debug statement(s)`);
  }

  // Check for TODO comments
  const todoMatches = code.match(patterns.todoComments);
  if (todoMatches) {
    analysis.warnings.push(`Found ${todoMatches.length} TODO comment(s)`);
  }

  // Check for potentially hardcoded secrets
  const secretMatches = code.match(patterns.hardcodedSecrets);
  if (secretMatches) {
    analysis.errors.push('Found potentially hardcoded secrets');
  }

  // Check for long lines
  const longLines = code.match(patterns.longLines);
  if (longLines) {
    analysis.warnings.push(`Found ${longLines.length} line(s) exceeding 100 characters`);
  }

  // Language-specific checks
  if (language === 'javascript' || language === 'typescript') {
    // Check for undefined variables
    if (code.match(/\b(undefined|null)\b/g)) {
      analysis.warnings.push('Consider adding null checks');
    }

    // Check for empty catch blocks
    if (code.match(/catch\s*\([^)]*\)\s*{\s*}/g)) {
      analysis.warnings.push('Empty catch block detected');
    }
  }

  if (language === 'python') {
    // Check for bare except clauses
    if (code.match(/except:/g)) {
      analysis.warnings.push('Bare except clause detected');
    }

    // Check for f-string usage
    if (code.match(/%s|\.format\(/g)) {
      analysis.suggestions.push('Consider using f-strings for string formatting');
    }
  }

  return analysis;
};

// Generate suggestions for code improvements
export const generateSuggestions = (code: string, language: string) => {
  const suggestions = [];

  // Check code complexity
  const lines = code.split('\n');
  if (lines.length > 50) {
    suggestions.push('Consider breaking down this code into smaller functions');
  }

  // Check function length
  const functionMatches = code.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g);
  if (functionMatches) {
    functionMatches.forEach(func => {
      if (func.split('\n').length > 20) {
        suggestions.push('Consider breaking down large functions into smaller ones');
      }
    });
  }

  // Check for magic numbers
  const numberLiterals = code.match(/\b\d+\b/g);
  if (numberLiterals && numberLiterals.length > 5) {
    suggestions.push('Consider using named constants instead of magic numbers');
  }

  // Language-specific suggestions
  if (language === 'javascript' || language === 'typescript') {
    // Check for callback hell
    if ((code.match(/}\)\s*=>/g) || []).length > 2) {
      suggestions.push('Consider using async/await to improve code readability');
    }

    // Check for proper error handling
    if (!code.includes('try') && !code.includes('catch')) {
      suggestions.push('Consider adding error handling with try/catch blocks');
    }
  }

  if (language === 'python') {
    // Check for list comprehension opportunities
    if (code.includes('for') && code.includes('append')) {
      suggestions.push('Consider using list comprehension for better readability');
    }

    // Check for context manager usage
    if (code.includes('.open(') && !code.includes('with')) {
      suggestions.push('Consider using context managers (with statement) for file operations');
    }
  }

  return suggestions;
};