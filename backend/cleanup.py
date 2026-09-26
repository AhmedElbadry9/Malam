import sqlite3

conn = sqlite3.connect('d:/opersting system/backend/agency.db')
cursor = conn.cursor()
cursor.execute("DELETE FROM departments WHERE name_ar LIKE '%الاختبار%' OR name_en LIKE '%Test%'")
cursor.execute("DELETE FROM team_members WHERE name LIKE '%Test Member%'")
cursor.execute("DELETE FROM clients WHERE name LIKE '%Test Client%' OR company_name LIKE '%Company%'")
conn.commit()
conn.close()
print('Cleaned up test data!')
