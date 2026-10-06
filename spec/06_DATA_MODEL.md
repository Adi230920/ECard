Store all V1 contact information locally using SQLite.
Each contact should have a unique ID, name, designation, company, phone, email, website, address, LinkedIn, notes, original image path, created date, and updated date.
Fields should allow null or empty values because business cards vary significantly. 
Store images in local application storage and reference their paths from the database. 
Add indexes where useful for contact-name and company searches. 
Keep database access inside a dedicated data layer rather than directly inside UI components. 
Design the schema to allow future cloud synchronization without requiring major structural changes.