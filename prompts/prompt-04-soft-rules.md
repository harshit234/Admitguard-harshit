Now add SOFT rule validation with exception handling.

Soft rules:
1. Date of Birth: Age must be between 18 and 35.
2. Graduation Year: Must be between 2015 and 2025.
3. Percentage/CGPA: 
   - Percentage must be >= 60
   - CGPA must be >= 6.0
4. Screening Test Score: Must be >= 40.

Requirements:

When a soft rule is violated:
- Show a yellow warning message below the field (not red)
- Show a checkbox "Request Exception"
- When checked, show a textarea "Exception Rationale"

Rationale validation:
- Minimum 30 characters
- Must contain at least ONE keyword:
  "approved by", "special case", "documentation pending", "waiver granted"

If rationale is invalid:
- Show clear error message

If rationale is valid:
- Allow submission even if rule fails

UI:
- Strict errors = red
- Soft warnings = yellow
- Valid fields = green

Do not break existing strict validation.
