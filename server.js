Update the frontend dashboard of the Smart Vehicle Blackbox Monitoring System.

Backend API base URL:
https://vehicle-blackbox-system-1.onrender.com

Endpoints:
GET /log
POST /violation

Requirements:

1. Load violations from GET /log.

2. Each violation contains:
   vehicleNo
   violationType
   score
   fine
   lat
   lng
   dateTime
   imageUrl

3. Display the following fields in the dashboard and challan:

- Vehicle Number
- Violation Type
- Date and Time (dateTime)
- Location (lat, lng)
- Score
- Fine
- Evidence Image

4. For evidence images, use:
   https://vehicle-blackbox-system-1.onrender.com + imageUrl

Example:
<img src="https://vehicle-blackbox-system-1.onrender.com/uploads/file.jpg">

5. If imageUrl is empty, display:
   "No Evidence Image".

6. Ensure dashboard statistics calculate correctly:
   Total Violations
   Total Score
   Total Fine

7. Add automatic refresh every 3 seconds to reload violations from /log.

8. Fix challan layout:

- Show MVD logo at top
- Show SafeDrive logo
- Show violation evidence image
- Show dateTime field
- Show total fine correctly

Goal:
Dashboard must display violations, evidence images, and timestamps correctly using the backend data.