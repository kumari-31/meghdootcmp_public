from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from helpdesk.models import Ticket
from .serializers import TicketSerializer
from unifiedapiapp.models import Employee

def get_user_role(user):
    if user.is_superuser or user.is_staff:
        return 'ADMIN'
    emp = Employee.objects.filter(email=user.email).first()
    if emp and Employee.objects.filter(fla_employee_id=emp.employee_id).exists():
        return 'FLA'
    elif emp:
        return 'EMPLOYEE'
    return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tickets(request):
    role = get_user_role(request.user)
    if role == 'ADMIN':
        tickets = Ticket.objects.all()
    elif role == 'FLA':
        emp = Employee.objects.filter(email=request.user.email).first()
        tickets = Ticket.objects.filter(submitter_email__in=[emp.email] + list(Employee.objects.filter(fla_employee_id=emp.employee_id).values_list('email', flat=True)))
    else:
        emp = Employee.objects.filter(email=request.user.email).first()
        tickets = Ticket.objects.filter(submitter_email=emp.email)

    serializer = TicketSerializer(tickets, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_ticket(request):
    role = get_user_role(request.user)
    data = request.data.copy()
    data['submitter_email'] = request.user.email
    serializer = TicketSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response({"success": True, "ticket": serializer.data})
    return Response({"success": False, "errors": serializer.errors})
