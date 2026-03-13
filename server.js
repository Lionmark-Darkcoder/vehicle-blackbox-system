Update the SafeDrive dashboard frontend to use the backend endpoint /challan instead of calculating violations locally.

Fetch data from:
GET /challan

Display:

Vehicle Number
Total Violations
Violation list grouped by type
Score per violation
Fine per violation
Total Score
Total Fine

Do not calculate score or violation counts on the frontend.

The backend already returns correct aggregated values.

Ensure the violation table shows:

Violation Type
Count
Score
Fine

Use the fields returned from the API response.

Remove any existing frontend logic that counts violations manually.