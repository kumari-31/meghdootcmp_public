from django.urls import path
from . import admin_views, employee_views

app_name = 'helpdesk_custom'

urlpatterns = [
    # Admin Views
    path('admin/dashboard/', admin_views.admin_dashboard, name='helpdesk_custom_dashboard'),
    path('admin/ticket/<int:ticket_id>/', admin_views.ticket_detail, name='ticket_detail'),

    # Employee / FLA API
    path('tickets/', employee_views.my_tickets, name='my_tickets'),
    path('tickets/create/', employee_views.create_ticket, name='create_ticket'),
]
