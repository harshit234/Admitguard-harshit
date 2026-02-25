Refactor the validation system to use a configuration-based approach.

1. Create a JSON object called "rulesConfig" that contains all validation rules.

Example structure:

{
  "full_name": {
    "type": "strict",
    "required": true,
    "minLength": 2,
    "noNumbers": true,
    "errorMessage": "Name must be at least 2 characters with no numbers"
  },
  "dob": {
    "type": "soft",
    "ageRange": [18, 35],
    "errorMessage": "Age must be between 18 and 35",
    "exceptionAllowed": true
  }
}

2. Update validation logic to read rules from this config instead of hardcoding.

3. Make it easy to change rules from the config object.

4. Show the full rulesConfig object for all fields.

Do not break existing functionality.
