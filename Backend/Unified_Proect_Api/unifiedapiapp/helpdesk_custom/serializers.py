from rest_framework import serializers
from helpdesk.models import Ticket, FollowUp
from django.contrib.auth import get_user_model

User = get_user_model()

class FollowUpSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = FollowUp
        fields = ['id', 'ticket', 'user', 'author_username', 'comment', 'created']
        read_only_fields = ['id', 'user', 'author_username', 'created']

class TicketSerializer(serializers.ModelSerializer):
    queue_name = serializers.CharField(source='queue.title', read_only=True)
    assigned_username = serializers.CharField(source='assigned_to.username', read_only=True)
    followups = FollowUpSerializer(many=True, source='followup_set', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'title', 'description', 'submitter_email',
            'queue', 'queue_name', 'status', 'priority', 'assigned_to',
            'assigned_username', 'created', 'modified', 'resolution', 'followups'
        ]
        read_only_fields = ['id', 'submitter_email', 'created', 'modified', 'followups']
