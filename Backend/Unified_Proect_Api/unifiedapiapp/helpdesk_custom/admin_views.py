# unifiedapiapp/helpdesk_custom/admin_views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.urls import reverse
from django.core.paginator import Paginator
from unifiedapiapp.models import Ticket  # adjust import path if different
from django.contrib import messages
from django.db.models import Q
from django.utils import timezone

def is_helpdesk_admin(user):
    # Change this if you prefer permission-based checks.
    # Use is_staff or a custom permission/group.
    return user.is_authenticated and (user.is_superuser or user.is_staff)

@login_required
@user_passes_test(is_helpdesk_admin, login_url="/", redirect_field_name=None)
def admin_dashboard(request):
    """
    Show list of tickets with filter & pagination.
    Query params:
      ?status=Open  or Resolved or Closed
      ?q=search-term
      ?page=N
    """
    qs = Ticket.objects.all().order_by("-created")

    status_filter = request.GET.get("status")
    q = request.GET.get("q")
    if status_filter:
        qs = qs.filter(status__iexact=status_filter)
    if q:
        qs = qs.filter(
            Q(title__icontains=q) |
            Q(description__icontains=q) |
            Q(submitter_email__icontains=q)
        )

    # pagination
    page = int(request.GET.get("page", 1))
    per_page = int(request.GET.get("size", 20))
    paginator = Paginator(qs, per_page)
    page_obj = paginator.get_page(page)

    context = {
        "tickets": page_obj.object_list,
        "page_obj": page_obj,
        "status_filter": status_filter or "",
        "q": q or "",
    }
    return render(request, "helpdesk_custom/admin_dashboard.html", context)


@login_required
@user_passes_test(is_helpdesk_admin, login_url="/", redirect_field_name=None)
def ticket_detail(request, ticket_id):
    """
    View a ticket, add reply (solution), update status.
    POST payload: solution (text), status (value)
    """
    ticket = get_object_or_404(Ticket, pk=ticket_id)

    if request.method == "POST":
        solution = request.POST.get("solution", "").strip()
        status_val = request.POST.get("status", "").strip()

        # append solution to resolution or create a reply object (see optional model below)
        if solution:
            # if you have TicketReply model, create TicketReply(...) instead — code below assumes in-place resolution append
            now = timezone.now()
            # BUILD a simple history string (optional)
            new_entry = f"[{now.strftime('%Y-%m-%d %H:%M')}] {request.user.get_full_name() or request.user.username}:\n{solution}\n\n"
            # If ticket has 'resolution' field, append; otherwise create or set 'resolution'
            if hasattr(ticket, "resolution") and ticket.resolution:
                ticket.resolution = new_entry + ticket.resolution
            else:
                # create/assign
                if hasattr(ticket, "resolution"):
                    ticket.resolution = new_entry
                else:
                    # fallback: create a simple text field on the model would be better
                    pass

        if status_val:
            # you may want to validate allowed statuses
            ticket.status = status_val

        ticket.save()
        messages.success(request, "Ticket updated successfully.")
        return redirect(reverse("helpdesk_custom:ticket_detail", args=[ticket_id]))

    # GET: show ticket (include replies if you implemented TicketReply)
    # If you implement a TicketReply model, fetch replies here to show conversation.
    replies = []
    # Example: if TicketReply exists:
    # replies = TicketReply.objects.filter(ticket=ticket).order_by("created")

    context = {"ticket": ticket, "replies": replies}
    return render(request, "helpdesk_custom/ticket_detail.html", context)
