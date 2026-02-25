## Prompt 3 — Edge Case Testing

Test the form against edge cases and fix issues.

Test cases:

1. Full Name:
   - "A" (too short)
   - "John123" (invalid)
   - "" (empty)

2. Phone:
   - "1234567890" (invalid start)
   - "98765" (too short)

3. Aadhaar:
   - "12345678901" (11 digits)
   - "12345678901a" (invalid)

4. Interview Status:
   - Select "Rejected" and try to submit

5. Offer Letter:
   - Set Interview = "Waitlisted" and Offer = "Yes" (valid)
   - Set Interview = "Rejected" and Offer = "Yes" (invalid)

Requirements:
- Fix any validation issues
- Ensure correct error messages
- Ensure submit button is disabled when invalid
