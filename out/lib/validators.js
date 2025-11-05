"use strict";
/**
 * API Request Validator
 *
 * Dieses Modul bietet Funktionen zur typsicheren Validierung von API-Request-Daten.
 * Es unterstützt JSON-Requests, FormData und URL-Parameter mit einem einheitlichen Interface.
 *
 * Features:
 * - Typsichere Schema-Definitionen mit TypeScript
 * - Konsistente Fehlerbehandlung und Fehlermeldungen
 * - Einfache Integration in API-Middleware oder direkte Verwendung in Endpunkten
 * - Unterstützung für komplexe Validierungsregeln (Länge, Format, bedingte Validierung)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationRules = exports.ValidationException = void 0;
exports.createValidator = createValidator;
exports.parseAndValidateJson = parseAndValidateJson;
exports.parseAndValidateFormData = parseAndValidateFormData;
exports.validateRequest = validateRequest;
exports.isValidationError = isValidationError;
/**
 * Erstellt einen Schema-Validator für den angegebenen Schema-Typ
 * @param schema Das Validierungsschema
 * @returns Ein Validator-Objekt für den Schema-Typ
 */
function createValidator(schema) {
    return {
        validate(value) {
            const errors = [];
            if (!value || typeof value !== 'object') {
                errors.push({ path: '$', message: 'Value must be an object' });
                return { valid: false, errors };
            }
            for (const [key, definition] of Object.entries(schema)) {
                const def = definition;
                const inputValue = value[key];
                const path = key;
                // Prüfe, ob das Feld erforderlich ist
                if (def.required &&
                    (inputValue === undefined || inputValue === null || inputValue === '')) {
                    errors.push({ path, message: `${key} is required` });
                    continue;
                }
                // Wenn kein Wert vorhanden ist und das Feld nicht erforderlich ist, überspringen
                if (inputValue === undefined || inputValue === null) {
                    continue;
                }
                // Typ-Validierung
                if (def.type) {
                    const expectedType = def.type;
                    let validType = true;
                    switch (expectedType) {
                        case 'string':
                            validType = typeof inputValue === 'string';
                            break;
                        case 'number':
                            validType =
                                typeof inputValue === 'number' ||
                                    (typeof inputValue === 'string' && !isNaN(Number(inputValue)));
                            break;
                        case 'boolean':
                            validType =
                                typeof inputValue === 'boolean' || inputValue === 'true' || inputValue === 'false';
                            break;
                        case 'object':
                            validType = typeof inputValue === 'object' && !Array.isArray(inputValue);
                            break;
                        case 'array':
                            validType = Array.isArray(inputValue);
                            break;
                    }
                    if (!validType) {
                        errors.push({ path, message: `${key} must be of type ${expectedType}` });
                        continue;
                    }
                }
                // Regeln anwenden
                if (def.rules && def.rules.length > 0) {
                    for (const rule of def.rules) {
                        if (!rule.validate(inputValue)) {
                            errors.push({ path, message: rule.errorMessage });
                        }
                    }
                }
                // Verschachtelte Validierung
                if (def.nested && typeof inputValue === 'object') {
                    const nestedValidator = createValidator(def.nested);
                    const nestedResult = nestedValidator.validate(inputValue);
                    if (!nestedResult.valid) {
                        for (const nestedError of nestedResult.errors) {
                            errors.push({
                                path: `${path}.${nestedError.path}`,
                                message: nestedError.message,
                            });
                        }
                    }
                }
            }
            return { valid: errors.length === 0, errors };
        },
        validateOrThrow(value) {
            const result = this.validate(value);
            if (!result.valid) {
                throw new ValidationException('Validation failed', result.errors);
            }
            return value;
        },
    };
}
/**
 * Validierungs-Exception für fehlerhafte Daten
 */
class ValidationException extends Error {
    constructor(message, errors) {
        super(message);
        this.name = 'ValidationException';
        this.errors = errors;
    }
}
exports.ValidationException = ValidationException;
/**
 * Standard-Validierungsregeln für häufig verwendete Muster
 */
exports.ValidationRules = {
    // String-Regeln
    string: {
        email: () => ({
            validate: (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            errorMessage: 'Must be a valid email address',
        }),
        minLength: (min) => ({
            validate: (value) => typeof value === 'string' && value.length >= min,
            errorMessage: `Must be at least ${min} characters long`,
        }),
        maxLength: (max) => ({
            validate: (value) => typeof value === 'string' && value.length <= max,
            errorMessage: `Must not exceed ${max} characters`,
        }),
        pattern: (regex, customError) => ({
            validate: (value) => typeof value === 'string' && regex.test(value),
            errorMessage: customError || 'Invalid format',
        }),
        uuid: () => ({
            validate: (value) => typeof value === 'string' &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
            errorMessage: 'Must be a valid UUID',
        }),
    },
    // Number-Regeln
    number: {
        min: (min) => ({
            validate: (value) => {
                const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
                return !isNaN(num) && num >= min;
            },
            errorMessage: `Must be at least ${min}`,
        }),
        max: (max) => ({
            validate: (value) => {
                const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
                return !isNaN(num) && num <= max;
            },
            errorMessage: `Must not exceed ${max}`,
        }),
        integer: () => ({
            validate: (value) => {
                const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
                return !isNaN(num) && Number.isInteger(num);
            },
            errorMessage: 'Must be an integer',
        }),
    },
};
/**
 * Parst und validiert JSON-Daten aus einem API-Request
 * @param request API-Request
 * @param validator Schema-Validator
 * @returns Validierte Daten
 * @throws ValidationException wenn die Validierung fehlschlägt
 */
async function parseAndValidateJson(request, validator) {
    try {
        const data = await request.json();
        return validator.validateOrThrow(data);
    }
    catch (error) {
        if (error instanceof ValidationException) {
            throw error;
        }
        throw new ValidationException('Failed to parse request JSON', [
            { path: '$', message: 'Invalid JSON' },
        ]);
    }
}
/**
 * Parst und validiert FormData aus einem API-Request
 * @param request API-Request
 * @param validator Schema-Validator
 * @returns Validierte Daten
 * @throws ValidationException wenn die Validierung fehlschlägt
 */
async function parseAndValidateFormData(request, validator) {
    try {
        const formData = await request.formData();
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        return validator.validateOrThrow(data);
    }
    catch (error) {
        if (error instanceof ValidationException) {
            throw error;
        }
        throw new ValidationException('Failed to parse form data', [
            { path: '$', message: 'Invalid form data' },
        ]);
    }
}
/**
 * Middleware-Funktion zur Validierung von API-Anfragen
 * @param schema Validierungsschema
 * @param options Validierungsoptionen
 * @returns Middleware-Handler für API-Validierung
 */
function validateRequest(schema, options) {
    const validator = createValidator(schema);
    return async (context) => {
        try {
            if (options.source === 'json') {
                return await parseAndValidateJson(context.request, validator);
            }
            else if (options.source === 'formData') {
                return await parseAndValidateFormData(context.request, validator);
            }
            else if (options.source === 'urlParams') {
                // URL-Parameter-Validierung
                const params = Object.fromEntries(new URL(context.request.url).searchParams.entries());
                const result = validator.validate(params);
                if (!result.valid) {
                    throw new ValidationException('Invalid URL parameters', result.errors);
                }
                return params;
            }
            throw new ValidationException('Invalid validation source', [
                { path: '$', message: 'Unsupported validation source' },
            ]);
        }
        catch (error) {
            if (error instanceof ValidationException) {
                return error.errors;
            }
            return [{ path: '$', message: 'Validation failed with unexpected error' }];
        }
    };
}
/**
 * Hilfsfunktion zur Überprüfung, ob ein Validierungsergebnis Fehler enthält
 * @param result Validierungsergebnis oder validierte Daten
 * @returns true, wenn das Ergebnis Validierungsfehler enthält
 */
function isValidationError(result) {
    return (Array.isArray(result) && result.length > 0 && 'path' in result[0] && 'message' in result[0]);
}
