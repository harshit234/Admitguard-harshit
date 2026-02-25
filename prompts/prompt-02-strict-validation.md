Now add STRICT validation rules to the form.

Strict rules:
1. Full Name: Minimum 2 characters, no numbers allowed.
2. Email: Must be valid email format.
3. Phone: Must be exactly 10 digits and start with 6,7,8,9.
4. Highest Qualification: Must be selected.
5. Interview Status: If "Rejected", block submission and show error "Rejected candidates cannot be enrolled."
6. Aadhaar Number: Must be exactly 12 digits.
7. Offer Letter Sent: Cannot be "Yes" unless Interview Status is "Cleared" or "Waitlisted".

Requirements:
- Show validation errors below each field in red color
- Validate in real-time (as user types)
- Disable submit button if any strict rule fails
- Show a top error banner if interview status is rejected
- Use clear human-readable messages

Do not add soft rule validation yet.
