Now add an exception counter and flagging system.

Requirements:

1. Count the number of active exceptions (fields where exception toggle is ON and rationale is valid).

2. Display this count near the submit button as:
"Active Exceptions: X"

3. If exception count is greater than 2:
- Show a warning banner:
"⚠️ This candidate has more than 2 exceptions. Entry will be flagged for manager review."

4. Submission should still be allowed.

5. When submitted, store a "flagged" field:
- flagged = true if exceptions > 2
- flagged = false otherwise

6. Update the UI dynamically when exceptions are added or removed.

Do not break existing validation logic.
