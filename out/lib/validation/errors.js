"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatZodError = formatZodError;
function formatZodError(err) {
    const flattened = err.flatten();
    const issues = err.issues.map((i) => ({
        path: i.path.map(String),
        code: i.code,
        message: i.message,
    }));
    const fieldErrors = {};
    for (const [k, v] of Object.entries(flattened.fieldErrors)) {
        fieldErrors[k] = (v || []).filter(Boolean);
    }
    if (flattened.formErrors && flattened.formErrors.length) {
        fieldErrors._form = flattened.formErrors;
    }
    return { fieldErrors, issues };
}
