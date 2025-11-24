import pandas as pd
# from Unified_Proect_Api.settings import DATABASES
from .models import Employee,CdacProject
# conn = DATABASES


# Iterate through the dataframe and create Employee objects
def import_data():
    df = pd.read_csv('/home/rakshana/Desktop/Unified Dashboard API/Unified_Proect_Api/Reporting Employees Details - Sheet2.csv')
    print(df.head(10))
    for index, row in df.iterrows():
        print(row,"=========")
        # Ensure you map the dataframe columns to your model fields correctly
        employee = Employee(
            name=row['name'],              # Replace with the actual column names from CSV
            employee_id=row['employee_id'],
            email=row['email'],
            group=row['group'],
            fla_name=row['fla_name'],
            fla_employee_id=row['fla_employee_id'],
            fla_email=row['fla_email']
            
        )
        # Save the employee to the database
        employee.save()

    return


def cdacprojects():
    # List of projects to add
    project_names = ["SFC OS",
    "DSSC OS",
    "DSCC Bhopal OS",
    "ICG OS",
    "TN School",
    "NSDC",
    "SANCHAR",
    "DGQA ERP",
    "AIIMS ERP",
    "ICMR Exam",
    "DCMPR Exam",
    "DMPR Exam",
    "Bharath DB",
    "Next Gen Exam",
    "IAF & ICG Exam OS",
    "IAF & ICG Exam",
    "PAN Cloud",
    "Jio Cloud",
    "HCI",
    "VDI",
    "CMMI",
    "NHM",
    "RAJ CCTNS",
    "IoT Security",
    "WESEE - INDE- DDS",
    "IoT Device Audit",
    "AI-MoES",
    "CSA-TN",
    "NTRO ERP",
    "Pondy ERP",
    "E-DAS",
    "NPCIL",
    "MCEME",
    "TNSDC",
    "Ashoka Univ",
    "CtrlS",
    "IB",
    "FutureSkills PRIME",
    "Mantra Afsac",
    "DGQA OS",
    "IDS",
    "TN - HiTech Lab Helpdesk",
    "CCTNS - Puducherry",
    "CCTNS - Lakshadweep",
    "ACTS"]

    
    # Create project instances with the correct field name
    project_objects = [CdacProject(project_name=name) for name in project_names]

    # Bulk create the projects
    CdacProject.objects.bulk_create(project_objects)

    print("Projects added successfully!")
